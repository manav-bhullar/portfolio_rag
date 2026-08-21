/**
 * Embeddings module for the Portfolio RAG system (V3: Enterprise Scale).
 *
 * Uses Google's gemini-embedding-2 model via @ai-sdk/google.
 */

import { embed } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { KnowledgeDocument } from './knowledge-base';

// ── Types ─────────────────────────────────────────────────────
export interface EmbeddedDocument {
  document: KnowledgeDocument;
  embedding: number[];
}

function getShuffledApiKeys() {
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('GEMINI_API_KEY') || key.startsWith('GOOGLE_API_KEY'))
    .map(key => process.env[key])
    .filter(Boolean) as string[];
  
  if (keys.length === 0) {
    throw new Error("No Gemini/Google API keys found in environment variables");
  }
  
  return keys.sort(() => Math.random() - 0.5);
}

/**
 * Embed a single text string using Google's gemini-embedding-2.
 * Includes automatic round-robin retries on rate limits.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const allKeys = getShuffledApiKeys();
  
  let lastError = null;
  
  for (const apiKey of allKeys) {
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { embedding } = await embed({
        model: google.textEmbeddingModel('gemini-embedding-2'),
        value: text,
      });
      return embedding;
    } catch (err: any) {
      console.warn(`[Embedding] API Key failed, trying next... Error: ${err.message}`);
      lastError = err;
    }
  }
  
  throw lastError || new Error("Failed to get embedding after trying all API keys.");
}
