/**
 * Embeddings module for the Portfolio RAG system (V3: Enterprise Scale).
 *
 * Uses Google's gemini-embedding-2 model via @ai-sdk/google.
 */

import { embed } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { KnowledgeDocument } from './knowledge-base';
import { getKeysHealthyFirst, reportKeyFailure, isRateLimitError } from '@/lib/gemini-keys';

// ── Types ─────────────────────────────────────────────────────
export interface EmbeddedDocument {
  document: KnowledgeDocument;
  embedding: number[];
}

/**
 * Embed a single text string using Google's gemini-embedding-2.
 *
 * Retries across keys from the shared, cooldown-aware pool — healthy keys
 * first — and reports rate-limited keys back into that shared pool so the
 * chat route also avoids them, instead of maintaining its own separate
 * view of which keys are currently hot.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const allKeys = getKeysHealthyFirst();

  let lastError = null;

  for (const apiKey of allKeys) {
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { embedding } = await embed({
        model: google.textEmbeddingModel('gemini-embedding-2'),
        value: text,
      });
      return embedding;
    } catch (err: unknown) {
      if (isRateLimitError(err)) reportKeyFailure(apiKey);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Embedding] API Key failed, trying next... Error: ${msg}`);
      lastError = err as Error;
    }
  }

  throw lastError || new Error("Failed to get embedding after trying all API keys.");
}
