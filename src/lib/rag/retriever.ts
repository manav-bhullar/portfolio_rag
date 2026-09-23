/**
 * Retriever for the Portfolio RAG system (V3: Enterprise Scale).
 *
 * Uses Pinecone for fast vector retrieval, and then re-ranks the top results
 * locally using our custom hybrid scoring (Title/Keyword boosting).
 */

import { getEmbedding } from './embeddings';
import { queryPinecone } from './pinecone';
import type { KnowledgeDocument } from './knowledge-base';

// ── Types ─────────────────────────────────────────────────────
export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;          // combined hybrid score (0-1)
  vectorScore: number;    // cosine similarity component
  keywordScore: number;   // keyword match component
}

// ── Config ────────────────────────────────────────────────────
const PINECONE_FETCH_K = 20;           // Fetch more from Pinecone to re-rank
// Relative cutoff: keep documents scoring within RELATIVE_SCORE_WINDOW of the
// best match, bounded to [MIN_RESULTS, MAX_RESULTS]. An absolute threshold
// doesn't work here: Gemini embeddings put even loosely related text above
// ~0.45 cosine, so a fixed floor like 0.3 never filtered anything out.
const RELATIVE_SCORE_WINDOW = 0.1;
const MIN_RESULTS = 3;
const MAX_RESULTS = 8;
const VECTOR_WEIGHT = 0.75;            // 75% vector, 25% keyword
const KEYWORD_WEIGHT = 0.25;

// ── Math helpers ──────────────────────────────────────────────

/**
 * Compute a keyword match score between query and document keywords.
 * Returns a value between 0 and 1.
 */
function keywordMatchScore(
  queryTokens: string[],
  doc: KnowledgeDocument
): number {
  if (queryTokens.length === 0) return 0;

  const titleText = doc.title.toLowerCase();
  const keywordText = doc.keywords.join(' ').toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (titleText.includes(token)) {
      score += 2.0; // Double weight for explicit title matches
    } else if (keywordText.includes(token)) {
      score += 1.0; // Standard weight for keyword matches
    }
  }

  // Cap at 1.0 in case of multiple title matches
  return Math.min(1.0, score / queryTokens.length);
}

/**
 * Tokenize a query into lowercase search tokens.
 * Filters out common stop words for better matching.
 */
function tokenize(query: string): string[] {
  const stopWords = new Set([
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
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));
}

/**
 * Select the relevant subset of results (sorted by score, descending):
 * everything within RELATIVE_SCORE_WINDOW of the best score, but always at
 * least MIN_RESULTS and never more than maxResults.
 */
export function selectRelevant(
  sorted: RetrievalResult[],
  maxResults: number = MAX_RESULTS
): RetrievalResult[] {
  if (sorted.length === 0) return [];
  const cutoff = sorted[0].score - RELATIVE_SCORE_WINDOW;
  return sorted
    .filter((r, i) => i < MIN_RESULTS || r.score >= cutoff)
    .slice(0, maxResults);
}

/**
 * Retrieve the most relevant knowledge documents for a user query.
 *
 * Uses Pinecone for vector retrieval, then re-ranks using hybrid scoring:
 * vector similarity (75%) + keyword matching (25%).
 */
export async function retrieve(
  query: string,
  maxResults: number = MAX_RESULTS
): Promise<RetrievalResult[]> {
  const startTime = Date.now();

  // Embed the user query
  const queryEmbedding = await getEmbedding(query);

  // Tokenize query for keyword matching
  const queryTokens = tokenize(query);

  // Fetch from Pinecone using Edge-compatible fetch
  const queryResponse = await queryPinecone(queryEmbedding, PINECONE_FETCH_K);

  if (!queryResponse.matches) return [];

  // Score all retrieved documents
  const scored: RetrievalResult[] = queryResponse.matches.map((match: { metadata?: Record<string, unknown>; id?: string; score?: number }) => {
    const metadata = (match.metadata ?? {}) as Record<string, unknown>;
    
    // Pinecone stores arrays natively, but just in case it's a string
    const rawKeywords = metadata.keywords;
    const keywords: string[] = Array.isArray(rawKeywords)
      ? (rawKeywords as string[])
      : typeof rawKeywords === 'string'
        ? (JSON.parse(rawKeywords) as string[])
        : [];

    const doc: KnowledgeDocument = {
      id: match.id || 'unknown',
      title: typeof metadata.title === 'string' ? metadata.title : 'Untitled',
      content: typeof metadata.content === 'string' ? metadata.content : '',
      keywords: keywords,
      category: (typeof metadata.category === 'string'
        ? metadata.category
        : 'background') as KnowledgeDocument['category'],
      url: typeof metadata.url === 'string' ? metadata.url : undefined,
    };

    const vectorScore = match.score || 0;
    const kwScore = keywordMatchScore(queryTokens, doc);
    const combinedScore = VECTOR_WEIGHT * vectorScore + KEYWORD_WEIGHT * kwScore;

    return {
      document: doc,
      score: combinedScore,
      vectorScore,
      keywordScore: kwScore,
    };
  });

  // Sort by combined score descending
  scored.sort((a, b) => b.score - a.score);

  const results = selectRelevant(scored, maxResults);

  const elapsed = Date.now() - startTime;
  console.log(
    `[RAG] Retrieved ${results.length} documents from Pinecone for query "${query.substring(0, 50)}..." in ${elapsed}ms`
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
