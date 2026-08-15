/**
 * Retriever for the Portfolio RAG system.
 *
 * Combines vector similarity (cosine) with keyword matching
 * for hybrid scoring. Returns relevant knowledge chunks for
 * a given user query.
 *
 * Completeness guarantee: returns ALL documents above a minimum
 * similarity threshold, even if that exceeds the default K.
 */

import { getEmbedding, getEmbeddedDocuments, type EmbeddedDocument } from './embeddings';
import type { KnowledgeDocument } from './knowledge-base';

// ── Types ─────────────────────────────────────────────────────
export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;          // combined hybrid score (0-1)
  vectorScore: number;    // cosine similarity component
  keywordScore: number;   // keyword match component
}

// ── Config ────────────────────────────────────────────────────
const DEFAULT_TOP_K = 6;
const MIN_SIMILARITY_THRESHOLD = 0.3;  // include anything above this
const VECTOR_WEIGHT = 0.75;            // 75% vector, 25% keyword
const KEYWORD_WEIGHT = 0.25;

// ── Math helpers ──────────────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Compute a keyword match score between query and document keywords.
 * Returns a value between 0 and 1.
 */
function keywordMatchScore(
  queryTokens: string[],
  doc: KnowledgeDocument
): number {
  if (queryTokens.length === 0) return 0;

  // Build a searchable string from the document
  const docText = (
    doc.title.toLowerCase() +
    ' ' +
    doc.keywords.join(' ').toLowerCase()
  );

  let matches = 0;
  for (const token of queryTokens) {
    if (docText.includes(token)) {
      matches++;
    }
  }

  return matches / queryTokens.length;
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
 * Retrieve the most relevant knowledge documents for a user query.
 *
 * Uses hybrid scoring: vector similarity (75%) + keyword matching (25%).
 * Returns at least `topK` results, plus any additional results above
 * the minimum similarity threshold.
 */
export async function retrieve(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievalResult[]> {
  const startTime = Date.now();

  // Get embeddings for all documents (cached after first call)
  const embeddedDocs = await getEmbeddedDocuments();

  // Embed the user query
  const queryEmbedding = await getEmbedding(query);

  // Tokenize query for keyword matching
  const queryTokens = tokenize(query);

  // Score all documents
  const scored: RetrievalResult[] = embeddedDocs.map((ed: EmbeddedDocument) => {
    const vectorScore = cosineSimilarity(queryEmbedding, ed.embedding);
    const kwScore = keywordMatchScore(queryTokens, ed.document);
    const combinedScore =
      VECTOR_WEIGHT * vectorScore + KEYWORD_WEIGHT * kwScore;

    return {
      document: ed.document,
      score: combinedScore,
      vectorScore,
      keywordScore: kwScore,
    };
  });

  // Sort by combined score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top-K, but also include anything above the threshold
  const topKResults = scored.slice(0, topK);
  const additionalAboveThreshold = scored
    .slice(topK)
    .filter((r) => r.score >= MIN_SIMILARITY_THRESHOLD);

  const results = [...topKResults, ...additionalAboveThreshold];

  const elapsed = Date.now() - startTime;
  console.log(
    `[RAG] Retrieved ${results.length} documents for query "${query.substring(0, 50)}..." in ${elapsed}ms`
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
    return `--- CONTEXT DOCUMENT ${i + 1}: ${r.document.title} (relevance: ${(r.score * 100).toFixed(0)}%) ---
${r.document.content}
--- END DOCUMENT ${i + 1} ---`;
  });

  return sections.join('\n\n');
}
