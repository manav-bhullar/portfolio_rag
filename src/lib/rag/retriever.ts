/**
 * Retriever for the Portfolio RAG system.
 *
 * Pipeline per query:
 *   1. Embed the query and fetch candidate chunks from Pinecone (optionally
 *      pre-filtered by category).
 *   2. Hybrid re-score each chunk: 75% vector cosine + 25% title/keyword match.
 *   3. Absolute relevance floor on the *vector* score: chunks below it are
 *      dropped, and if nothing survives the caller gets no context at all
 *      (so the model says it doesn't know instead of improvising from noise).
 *   4. Group chunks by parent document (citations point at documents).
 *   5. Select documents: "focused" keeps the top group (within a window of the
 *      best score); "broad" keeps everything above the floor.
 *   6. Fill a token budget, best-first, one chunk per document before any
 *      document gets a second chunk (so broad questions stay diverse).
 *
 * Multi-query retrieval (comparisons like "Floq vs SCALES") runs one focused
 * retrieval per sub-query in parallel and interleaves their documents, so
 * every sub-topic is represented before any one of them takes more budget.
 *
 * Parent–child families: sub-topic documents (Floq concurrency, Floq rate
 * limiting, ...) share a `family` with their overview. Broad topical questions
 * ("everything about Floq") expand the top document to its whole family, and
 * list questions ("what projects have you built?") fetch only overviews.
 */

import { getEmbedding } from './embeddings';
import { queryPinecone, type PineconeFilter } from './pinecone';
import type { KnowledgeDocument } from './knowledge-base';

// ── Types ─────────────────────────────────────────────────────
export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;          // combined hybrid score (0-1) of the document's best chunk
  vectorScore: number;    // cosine similarity of the document's best chunk
  keywordScore: number;   // keyword match of the document's best chunk
}

export type RetrievalMode = 'focused' | 'broad';
export type KnowledgeCategory = KnowledgeDocument['category'];

export interface RetrieveOptions {
  /** focused: the tight top group; broad: a wider group plus the top document's family. */
  mode?: RetrievalMode;
  /** Pre-filter candidates to one category (Pinecone metadata filter). */
  category?: KnowledgeCategory | null;
  /** Max estimated tokens of document content to return. */
  tokenBudget?: number;
  /**
   * Apply the absolute relevance floor. Disable only when the caller knows
   * the question is about Manav and needs *some* context regardless (e.g.
   * job-fit tools, where a missing skill is reported as a gap).
   */
  applyFloor?: boolean;
}

/** A scored candidate chunk, before grouping by document. */
export interface ScoredChunk {
  chunkId: string;
  parentId: string;
  family: string;
  chunkIndex: number;
  document: KnowledgeDocument; // content = this chunk's text
  score: number;
  vectorScore: number;
  keywordScore: number;
}

// ── Config ────────────────────────────────────────────────────
// Candidates fetched per query before re-ranking. Sized for a ~100 MB corpus
// (~50k+ chunks), where relevant chunks can sit well below rank 20.
const PINECONE_FETCH_K = 50;
// Absolute floor on cosine similarity, calibrated with
// `scripts/eval-retrieval.ts --calibrate` (golden set, gemini-embedding-2):
// off-topic questions peak at 0.536, the weakest relevant match is 0.605.
// It is a backstop for off-topic questions the router misses. It cannot
// reject in-scope questions the knowledge base doesn't answer ("Manav's
// favourite movie" scores 0.725 against his interests doc) — similarity
// measures topic, not answerability; grounding in the prompt handles those.
// Re-calibrate whenever the embedding model or corpus changes materially.
export const MIN_VECTOR_SCORE = 0.57;
// Keep documents within this window of the best score (focused / broad)...
const RELATIVE_SCORE_WINDOW = 0.1;
const BROAD_SCORE_WINDOW = 0.15;
// Max overview documents for list questions and family members for expansion.
const LIST_FETCH_K = 100;
// ...but at least this many (among those above the floor), so a question
// with one clear winner still gets its closest neighbour...
const MIN_FOCUSED_DOCS = Number(process.env.RAG_MIN_FOCUSED_DOCS ?? 2);
// ...and at most this many for a specific question. A flat score
// distribution (nothing matches well) otherwise lets a whole window of
// loosely related documents through.
const MAX_FOCUSED_DOCS = Number(process.env.RAG_MAX_FOCUSED_DOCS ?? 6);
// Token budgets for the returned context (content only, ~4 chars per token).
export const FOCUSED_TOKEN_BUDGET = 4000;
export const BROAD_TOKEN_BUDGET = 8000;
const VECTOR_WEIGHT = 0.75;            // 75% vector, 25% keyword
const KEYWORD_WEIGHT = 0.25;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Keyword scoring ───────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'about', 'like', 'through', 'after', 'over',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'it', 'its', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him',
  'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'how', 'where', 'when', 'why',
  'all', 'each', 'every', 'any', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'just', 'very', 'also',
  'tell', 'know', 'want', 'get', 'give', 'show', 'list',
  'please', 'thanks', 'thank',
  // Every document is about Manav, so his name carries no signal (it has the
  // lowest possible IDF). Without this, any query mentioning him keyword-boosts
  // "About Manav Bhullar" and "Why Hire Manav Bhullar" into every answer.
  'manav', 'bhullar', 'manavdeep', 'singh', 'manavs',
]);

/**
 * Tokenize text into lowercase search tokens, without stop words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Naive singularization so "projects" matches "project". */
function stem(token: string): string {
  return token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token;
}

function wordSet(text: string): Set<string> {
  return new Set(tokenize(text).map(stem));
}

/**
 * Keyword match score between query tokens and a document's title/keywords.
 * Whole-word matching (not substring), so "ai" no longer matches "maintain".
 * Title hits count double. Returns a value between 0 and 1.
 */
function keywordMatchScore(queryTokens: string[], doc: KnowledgeDocument): number {
  if (queryTokens.length === 0) return 0;

  const titleWords = wordSet(doc.title);
  const keywordWords = wordSet(doc.keywords.join(' '));

  let score = 0;
  for (const token of queryTokens) {
    const t = stem(token);
    if (titleWords.has(t)) {
      score += 2.0; // Double weight for explicit title matches
    } else if (keywordWords.has(t)) {
      score += 1.0; // Standard weight for keyword matches
    }
  }

  // Cap at 1.0 in case of multiple title matches
  return Math.min(1.0, score / queryTokens.length);
}

// ── Candidate retrieval ───────────────────────────────────────

type PineconeMatch = { metadata?: Record<string, unknown>; id?: string; score?: number };

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

function toScoredChunk(match: PineconeMatch, queryTokens: string[]): ScoredChunk {
  const metadata = (match.metadata ?? {}) as Record<string, unknown>;
  const chunkId = match.id || 'unknown';
  // Legacy records (pre-chunking) have no parentId; their ID is the document ID.
  const parentId = typeof metadata.parentId === 'string' ? metadata.parentId : chunkId.split('#')[0];
  const family = typeof metadata.family === 'string' ? metadata.family : parentId;

  const document: KnowledgeDocument = {
    id: parentId,
    title: typeof metadata.title === 'string' ? metadata.title : 'Untitled',
    content: typeof metadata.content === 'string' ? metadata.content : '',
    keywords: parseKeywords(metadata.keywords),
    category: (typeof metadata.category === 'string'
      ? metadata.category
      : 'background') as KnowledgeCategory,
    url: typeof metadata.url === 'string' ? metadata.url : undefined,
  };

  const vectorScore = match.score || 0;
  const keywordScore = keywordMatchScore(queryTokens, document);
  return {
    chunkId,
    parentId,
    family,
    chunkIndex: typeof metadata.chunkIndex === 'number' ? metadata.chunkIndex : 0,
    document,
    score: VECTOR_WEIGHT * vectorScore + KEYWORD_WEIGHT * keywordScore,
    vectorScore,
    keywordScore,
  };
}

/**
 * Embed a query and return every candidate chunk, hybrid-scored and sorted
 * (best first), with no floor or selection applied. Used by retrieval and by
 * the calibration script.
 */
export async function fetchCandidates(
  query: string,
  category?: KnowledgeCategory | null
): Promise<ScoredChunk[]> {
  return queryChunks(await embedQuery(query), PINECONE_FETCH_K, categoryFilter(category));
}

/** An embedded query, so several Pinecone lookups can reuse one embedding call. */
export interface EmbeddedQuery {
  text: string;
  vector: number[];
  tokens: string[];
}

export async function embedQuery(query: string): Promise<EmbeddedQuery> {
  return { text: query, vector: await getEmbedding(query), tokens: tokenize(query) };
}

function categoryFilter(category?: KnowledgeCategory | null): PineconeFilter | undefined {
  return category ? { category: { $eq: category } } : undefined;
}

async function queryChunks(q: EmbeddedQuery, topK: number, filter?: PineconeFilter): Promise<ScoredChunk[]> {
  const queryResponse = await queryPinecone(q.vector, topK, filter);
  const matches: PineconeMatch[] = queryResponse.matches ?? [];
  return matches.map((m) => toScoredChunk(m, q.tokens)).sort((a, b) => b.score - a.score);
}

// ── Selection ─────────────────────────────────────────────────

interface DocumentGroup {
  parentId: string;
  best: ScoredChunk;
  chunks: ScoredChunk[]; // sorted best first
}

function groupByDocument(chunks: ScoredChunk[]): DocumentGroup[] {
  const groups = new Map<string, DocumentGroup>();
  for (const chunk of chunks) {
    const seen = groups.get(chunk.parentId);
    if (!seen) {
      groups.set(chunk.parentId, { parentId: chunk.parentId, best: chunk, chunks: [chunk] });
    } else if (!seen.chunks.some((c) => c.chunkIndex === chunk.chunkIndex)) {
      // Skip duplicate chunk indexes (an outdated chunk version not yet pruned)
      seen.chunks.push(chunk);
    }
  }
  return [...groups.values()].sort((a, b) => b.best.score - a.best.score);
}

/**
 * Choose which documents are relevant, in priority order.
 * Pure function (no I/O) so it can be unit-tested and calibrated offline.
 */
export function selectDocuments(
  sortedChunks: ScoredChunk[],
  mode: RetrievalMode,
  applyFloor: boolean = true
): DocumentGroup[] {
  const aboveFloor = applyFloor
    ? sortedChunks.filter((c) => c.vectorScore >= MIN_VECTOR_SCORE)
    : sortedChunks;
  const groups = groupByDocument(aboveFloor);
  if (groups.length === 0) return groups;

  const cutoff = groups[0].best.score - (mode === 'broad' ? BROAD_SCORE_WINDOW : RELATIVE_SCORE_WINDOW);
  const selected = groups.filter((g, i) => i < MIN_FOCUSED_DOCS || g.best.score >= cutoff);
  return mode === 'focused' ? selected.slice(0, MAX_FOCUSED_DOCS) : selected;
}

/**
 * Fill the token budget from documents in priority order: first pass takes
 * each document's best chunk, second pass adds remaining chunks. Always
 * returns at least the first document (truncating nothing — chunks are
 * bounded in size at ingestion).
 */
function assembleWithinBudget(groups: DocumentGroup[], tokenBudget: number): RetrievalResult[] {
  const picked = new Map<string, ScoredChunk[]>();
  let used = 0;

  const tryAdd = (chunk: ScoredChunk): boolean => {
    const cost = estimateTokens(chunk.document.content);
    if (used > 0 && used + cost > tokenBudget) return false;
    used += cost;
    picked.set(chunk.parentId, [...(picked.get(chunk.parentId) ?? []), chunk]);
    return true;
  };

  for (const g of groups) tryAdd(g.best);
  for (const g of groups) {
    if (!picked.has(g.parentId)) continue;
    for (const chunk of g.chunks.slice(1)) tryAdd(chunk);
  }

  return groups
    .filter((g) => picked.has(g.parentId))
    .map((g) => {
      const chunks = picked.get(g.parentId)!.sort((a, b) => a.chunkIndex - b.chunkIndex);
      return {
        document: { ...g.best.document, content: chunks.map((c) => c.document.content).join('\n\n[…]\n\n') },
        score: g.best.score,
        vectorScore: g.best.vectorScore,
        keywordScore: g.best.keywordScore,
      };
    });
}

// ── Public API ────────────────────────────────────────────────

/**
 * Retrieve the relevant knowledge for one query. Returns [] when nothing
 * clears the relevance floor.
 */
export async function retrieve(query: string, options: RetrieveOptions = {}): Promise<RetrievalResult[]> {
  const { mode = 'focused', category = null, applyFloor = true } = options;
  const tokenBudget = options.tokenBudget ?? (mode === 'broad' ? BROAD_TOKEN_BUDGET : FOCUSED_TOKEN_BUDGET);
  const startTime = Date.now();

  const q = await embedQuery(query);
  const candidates = await queryChunks(q, PINECONE_FETCH_K, categoryFilter(category));
  let groups = selectDocuments(candidates, mode, applyFloor);
  if (mode === 'broad' && applyFloor && groups.length > 0) {
    groups = await expandFamily(q, groups);
  }
  const results = assembleWithinBudget(groups, tokenBudget);

  console.log(
    `[RAG] ${mode} retrieval: ${results.length} documents (${candidates.length} candidates${category ? `, category=${category}` : ''}) for "${query.substring(0, 50)}" in ${Date.now() - startTime}ms`
  );
  return results;
}

/**
 * Parent–child expansion: add every member of the top document's family
 * (e.g. all six Floq documents), ranked by the same query, right after the
 * family members already selected.
 */
async function expandFamily(q: EmbeddedQuery, groups: DocumentGroup[]): Promise<DocumentGroup[]> {
  const family = groups[0].best.family;
  const members = groupByDocument(await queryChunks(q, LIST_FETCH_K, { family: { $eq: family } }));
  const present = new Set(groups.map((g) => g.parentId));
  const missing = members.filter((m) => !present.has(m.parentId));
  if (missing.length === 0) return groups;

  const inFamily = groups.filter((g) => g.best.family === family);
  const others = groups.filter((g) => g.best.family !== family);
  return [...inFamily, ...missing, ...others];
}

/**
 * List questions ("what projects have you built?"): every overview document
 * in a category, ranked by the query. No floor — the user asked for all of
 * them — but still bounded by the token budget. Scales because only overviews
 * are fetched, not every sub-topic chunk.
 */
export async function retrieveOverviews(
  query: string,
  category: KnowledgeCategory,
  tokenBudget: number = BROAD_TOKEN_BUDGET
): Promise<RetrievalResult[]> {
  const startTime = Date.now();
  const chunks = await queryChunks(await embedQuery(query), LIST_FETCH_K, {
    category: { $eq: category },
    isOverview: { $eq: true },
  });
  const results = assembleWithinBudget(groupByDocument(chunks), tokenBudget);
  console.log(
    `[RAG] list retrieval: ${results.length} ${category} overviews for "${query.substring(0, 50)}" in ${Date.now() - startTime}ms`
  );
  return results;
}

/**
 * Retrieve for several sub-queries in parallel (e.g. one per entity in a
 * comparison) and merge fairly: documents are interleaved round-robin across
 * sub-queries, so each sub-topic is represented before any gets more budget.
 */
export async function retrieveMany(queries: string[], options: RetrieveOptions = {}): Promise<RetrievalResult[]> {
  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  if (unique.length === 0) return [];
  if (unique.length === 1) return retrieve(unique[0], options);

  const { mode = 'focused', category = null, applyFloor = true } = options;
  const tokenBudget = options.tokenBudget ?? BROAD_TOKEN_BUDGET;
  const startTime = Date.now();

  const perQuery = await Promise.all(
    unique.map(async (q) => selectDocuments(await fetchCandidates(q, category), mode, applyFloor))
  );

  const merged: DocumentGroup[] = [];
  const seen = new Set<string>();
  const longest = Math.max(...perQuery.map((g) => g.length));
  for (let rank = 0; rank < longest; rank++) {
    for (const groups of perQuery) {
      const g = groups[rank];
      if (g && !seen.has(g.parentId)) {
        seen.add(g.parentId);
        merged.push(g);
      }
    }
  }

  const results = assembleWithinBudget(merged, tokenBudget);
  console.log(
    `[RAG] multi-query retrieval: ${results.length} documents for ${unique.length} sub-queries in ${Date.now() - startTime}ms`
  );
  return results;
}

/**
 * Format retrieved documents into a context string for the LLM.
 * Each document is clearly delimited so the LLM can reference them.
 */
export function formatContext(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return 'No relevant context found.';
  }

  const sections = results.map((r, i) => {
    return `--- CONTEXT DOCUMENT ${i + 1}: ${r.document.title} (relevance: ${(r.score * 100).toFixed(0)}%, id: ${r.document.id}) ---
${r.document.content}
--- END DOCUMENT ${i + 1} ---`;
  });

  return sections.join('\n\n');
}
