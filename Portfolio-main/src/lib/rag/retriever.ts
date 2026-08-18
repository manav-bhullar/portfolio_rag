/**
 * Retriever for the Portfolio RAG system (V3: Enterprise Scale).
 *
 * Uses Pinecone for fast vector retrieval, and then re-ranks the top results
 * locally using our custom hybrid scoring (Title/Keyword boosting).
 */

import { getEmbedding } from './embeddings';
import { getPineconeIndex } from './pinecone';
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
const PINECONE_FETCH_K = 20;           // Fetch more from Pinecone to re-rank
const MIN_SIMILARITY_THRESHOLD = 0.3;  // include anything above this
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
 * Retrieve the most relevant knowledge documents for a user query.
 *
 * Uses Pinecone for vector retrieval, then re-ranks using hybrid scoring:
 * vector similarity (75%) + keyword matching (25%).
 */
export async function retrieve(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievalResult[]> {
  const startTime = Date.now();

  // Embed the user query
  const queryEmbedding = await getEmbedding(query);

  // Tokenize query for keyword matching
  const queryTokens = tokenize(query);

  // Fetch from Pinecone
  const index = getPineconeIndex();
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: PINECONE_FETCH_K,
    includeMetadata: true,
  });

  if (!queryResponse.matches) return [];

  // Score all retrieved documents
  const scored: RetrievalResult[] = queryResponse.matches.map((match) => {
    const metadata = match.metadata as any || {};
    
    // Pinecone stores arrays natively, but just in case it's a string
    const keywords = Array.isArray(metadata.keywords) 
      ? metadata.keywords 
      : (typeof metadata.keywords === 'string' ? JSON.parse(metadata.keywords) : []);

    const doc: KnowledgeDocument = {
      id: match.id,
      title: metadata.title || 'Untitled',
      content: metadata.content || '',
      keywords: keywords,
      category: metadata.category || 'general',
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

  // Take top-K, but also include anything above the threshold
  const topKResults = scored.slice(0, topK);
  const additionalAboveThreshold = scored
    .slice(topK)
    .filter((r) => r.score >= MIN_SIMILARITY_THRESHOLD);

  const results = [...topKResults, ...additionalAboveThreshold];

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
