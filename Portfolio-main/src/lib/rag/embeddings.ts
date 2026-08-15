/**
 * Embeddings module for the Portfolio RAG system.
 *
 * Uses @xenova/transformers (Xenova/all-MiniLM-L6-v2) for local embeddings.
 * Embeddings are cached in-memory — computed once on first request,
 * then reused for the server's lifetime. This avoids any API quotas.
 */

import { KNOWLEDGE_BASE, type KnowledgeDocument } from './knowledge-base';
import { pipeline, env } from '@xenova/transformers';

// Configure transformers
// Skip local model check since we are running in a Next.js API route
env.allowLocalModels = false;

// ── Types ─────────────────────────────────────────────────────
export interface EmbeddedDocument {
  document: KnowledgeDocument;
  embedding: number[];
}

// ── In-memory cache ───────────────────────────────────────────
let cachedEmbeddings: EmbeddedDocument[] | null = null;
let cachePromise: Promise<EmbeddedDocument[]> | null = null;

// Pipeline cache
let extractorPipeline: any = null;

async function getExtractor() {
  if (!extractorPipeline) {
    extractorPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPipeline;
}

/**
 * Embed a single text string using local model.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Batch embed multiple texts.
 */
async function batchEmbed(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  
  // output is a tensor of shape [batch_size, embedding_dim]
  const embeddings: number[][] = [];
  const dim = output.dims[1];
  for (let i = 0; i < texts.length; i++) {
    const start = i * dim;
    const end = start + dim;
    embeddings.push(Array.from(output.data.slice(start, end)));
  }
  return embeddings;
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
      `[RAG] Computing local embeddings for ${KNOWLEDGE_BASE.length} documents...`
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
    console.log(`[RAG] Local embeddings computed in ${elapsed}ms`);

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
