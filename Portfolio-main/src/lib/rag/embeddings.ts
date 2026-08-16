/**
 * Embeddings module for the Portfolio RAG system.
 *
 * Uses @xenova/transformers (Xenova/all-MiniLM-L6-v2) for local embeddings.
 * Embeddings are cached in-memory — computed once on first request,
 * then reused for the server's lifetime. This avoids any API quotas.
 */

import type { KnowledgeDocument } from './knowledge-base';
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
import precomputedVectors from './precomputed-vectors.json';

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
 * Get all knowledge documents with their embeddings.
 * Instantly loads from precomputed JSON, avoiding any cold-boot penalty.
 */
export async function getEmbeddedDocuments(): Promise<EmbeddedDocument[]> {
  return precomputedVectors as EmbeddedDocument[];
}
