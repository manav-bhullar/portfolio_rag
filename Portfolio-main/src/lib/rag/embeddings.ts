/**
 * Embeddings module for the Portfolio RAG system (V3: Enterprise Scale).
 *
 * Uses Google's text-embedding-004 model via @ai-sdk/google.
 */

import { embed } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { KnowledgeDocument } from './knowledge-base';

// ── Types ─────────────────────────────────────────────────────
export interface EmbeddedDocument {
  document: KnowledgeDocument;
  embedding: number[];
}

function getRandomApiKey() {
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('GEMINI_API_KEY') || key.startsWith('GOOGLE_API_KEY'))
    .map(key => process.env[key])
    .filter(Boolean) as string[];
  
  if (keys.length === 0) {
    throw new Error("No Gemini/Google API keys found in environment variables");
  }
  
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

/**
 * Embed a single text string using Google's gemini-embedding-2.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const google = createGoogleGenerativeAI({ apiKey: getRandomApiKey() });
  
  const { embedding } = await embed({
    model: google.textEmbeddingModel('gemini-embedding-2'),
    value: text,
  });
  
  return embedding;
}
