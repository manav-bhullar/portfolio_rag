/**
 * Embeddings module for the Portfolio RAG system.
 *
 * Uses Gemini text-embedding-004 to embed knowledge documents.
 * Embeddings are cached in-memory — computed once on first request,
 * then reused for the server's lifetime.
 */

import { KNOWLEDGE_BASE, type KnowledgeDocument } from './knowledge-base';

// ── Types ─────────────────────────────────────────────────────
export interface EmbeddedDocument {
  document: KnowledgeDocument;
  embedding: number[];
}

// ── In-memory cache ───────────────────────────────────────────
let cachedEmbeddings: EmbeddedDocument[] | null = null;
let cachePromise: Promise<EmbeddedDocument[]> | null = null;

// ── Gemini Embedding API ──────────────────────────────────────
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

/**
 * Embed a single text string using Gemini text-embedding-004.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const response = await fetch(`${EMBEDDING_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Embedding API error (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

/**
 * Batch embed multiple texts using Gemini batchEmbedContents.
 * More efficient than calling getEmbedding() in a loop.
 */
async function batchEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const batchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;

  const requests = texts.map((text) => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: {
      parts: [{ text }],
    },
  }));

  const response = await fetch(batchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Batch embedding API error (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();
  return data.embeddings.map(
    (e: { values: number[] }) => e.values
  );
}

/**
 * Get all knowledge documents with their embeddings.
 * Computes embeddings on first call and caches them.
 * Concurrent calls share the same promise (no duplicate work).
 */
export async function getEmbeddedDocuments(): Promise<EmbeddedDocument[]> {
  // Return cached if available
  if (cachedEmbeddings) {
    return cachedEmbeddings;
  }

  // If already computing, wait for the same promise
  if (cachePromise) {
    return cachePromise;
  }

  // Compute embeddings
  cachePromise = (async () => {
    console.log(
      `[RAG] Computing embeddings for ${KNOWLEDGE_BASE.length} documents...`
    );
    const startTime = Date.now();

    // Build the text to embed for each document:
    // title + content + keywords for richer semantic matching
    const textsToEmbed = KNOWLEDGE_BASE.map(
      (doc) =>
        `${doc.title}\n\n${doc.content}\n\nKeywords: ${doc.keywords.join(', ')}`
    );

    const embeddings = await batchEmbed(textsToEmbed);

    const result: EmbeddedDocument[] = KNOWLEDGE_BASE.map((doc, i) => ({
      document: doc,
      embedding: embeddings[i],
    }));

    const elapsed = Date.now() - startTime;
    console.log(`[RAG] Embeddings computed in ${elapsed}ms`);

    cachedEmbeddings = result;
    return result;
  })();

  try {
    return await cachePromise;
  } catch (error) {
    // Reset on failure so next call retries
    cachePromise = null;
    throw error;
  }
}
