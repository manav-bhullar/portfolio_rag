import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embedMany } from 'ai';
import { KNOWLEDGE_BASE, KnowledgeDocument } from '../src/lib/rag/knowledge-base';

// 1. Load environment variables (.env.local has precedence over .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const CACHE_FILE_PATH = path.resolve(process.cwd(), '.rag-cache.json');
const INDEX_NAME = process.env.PINECONE_INDEX || 'portfolio';
const NAMESPACE = process.env.PINECONE_NAMESPACE || '';

export interface RagCacheData {
  lastHash: string;
  lastIngestedAt: string;
  documentCount: number;
  indexName: string;
  schemaVersion: number;
}

/**
 * Recursively serializes any JavaScript object or primitive into a deterministic,
 * canonical JSON string with sorted object keys.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']';
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map((key) => {
    return `${JSON.stringify(key)}:${canonicalStringify(record[key])}`;
  });

  return '{' + entries.join(',') + '}';
}

/**
 * Calculates a deterministic SHA-256 hash of the knowledge base documents.
 */
export function computeKnowledgeBaseHash(docs: KnowledgeDocument[]): string {
  const canonicalString = canonicalStringify(docs);
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Safely reads and validates the local .rag-cache.json file.
 */
export function readRagCache(): RagCacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
    if (!raw.trim()) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<RagCacheData>;
    if (typeof parsed?.lastHash === 'string' && parsed.lastHash.length === 64) {
      return parsed as RagCacheData;
    }
    return null;
  } catch (error) {
    console.warn('[RAG Ingestion] Warning: Failed to read/parse cache file, proceeding with fresh check.', error);
    return null;
  }
}

/**
 * Writes updated snapshot metadata to .rag-cache.json.
 */
export function writeRagCache(lastHash: string, documentCount: number, indexName: string = INDEX_NAME): void {
  try {
    const cachePayload: RagCacheData = {
      lastHash,
      lastIngestedAt: new Date().toISOString(),
      documentCount,
      indexName,
      schemaVersion: 1,
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cachePayload, null, 2) + '\n', 'utf8');
  } catch (error) {
    console.warn('[RAG Ingestion] Warning: Failed to write cache file:', error);
  }
}

/**
 * Sanitizes metadata to conform to Pinecone metadata constraints:
 * keys mapped to string, number, boolean, or string[].
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean | string[]> {
  const sanitized: Record<string, string | number | boolean | string[]> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      sanitized[key] = value;
    } else {
      sanitized[key] = JSON.stringify(value);
    }
  }
  return sanitized;
}

export async function runIngestion(): Promise<void> {
  console.log('[RAG Ingestion] Checking knowledge base status...');
  const currentHash = computeKnowledgeBaseHash(KNOWLEDGE_BASE);
  const cache = readRagCache();

  // 1. Hash check for idempotency
  if (cache !== null && cache.lastHash === currentHash) {
    console.log(
      `[RAG Ingestion] Knowledge base content unchanged (hash: ${currentHash.slice(0, 8)}). Zero new documents were upserted on this run (due to the hash check).`
    );
    process.exit(0);
  }

  // 2. Cache miss or content changed
  const previousHashSnippet = cache?.lastHash ? cache.lastHash.slice(0, 8) : 'none';
  console.log(
    `[RAG Ingestion] Knowledge base content changed (previous: ${previousHashSnippet}, current: ${currentHash.slice(0, 8)}). Starting ingestion for ${KNOWLEDGE_BASE.length} documents...`
  );

  // 3. Check for Pinecone credentials
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  if (!pineconeApiKey) {
    console.warn(
      '[RAG Ingestion] Warning: PINECONE_API_KEY is not set in environment. Skipping vector database upsert. Updating local cache.'
    );
    writeRagCache(currentHash, KNOWLEDGE_BASE.length, INDEX_NAME);
    process.exit(0);
  }

  // 4. Check for Gemini credentials for embedding generation
  const geminiApiKey = Object.keys(process.env)
    .filter(key => key.startsWith('GEMINI_API_KEY') || key.startsWith('GOOGLE_API_KEY'))
    .map(key => process.env[key])
    .filter(Boolean)[0] || undefined;
    
  if (!geminiApiKey) {
    console.warn(
      '[RAG Ingestion] Warning: No GEMINI_API_KEY or GOOGLE_API_KEY found in environment. Cannot generate embeddings. Skipping Pinecone upsert. Updating local cache.'
    );
    writeRagCache(currentHash, KNOWLEDGE_BASE.length, INDEX_NAME);
    process.exit(0);
  }

  // 5. Generate embeddings and upsert to Pinecone
  try {
    console.log('[RAG Ingestion] Generating vector embeddings using Gemini gemini-embedding-2...');
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    const textsToEmbed = KNOWLEDGE_BASE.map((doc) => `${doc.title}\n\n${doc.content}`);

    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel('gemini-embedding-2'),
      values: textsToEmbed,
    });

    console.log(`[RAG Ingestion] Generated ${embeddings.length} embeddings. Connecting to Pinecone index '${INDEX_NAME}'...`);
    const pc = new Pinecone({ apiKey: pineconeApiKey });

    const indexList = await pc.listIndexes();
    const exists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME);
    if (!exists) {
      console.log(`[RAG Ingestion] Index '${INDEX_NAME}' does not exist. Creating serverless index...`);
      await pc.createIndex({
        name: INDEX_NAME,
        dimension: 3072,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
        waitUntilReady: true,
      });
      console.log(`[RAG Ingestion] Index '${INDEX_NAME}' created.`);
    }

    const index = pc.index(INDEX_NAME);
    const target = NAMESPACE ? index.namespace(NAMESPACE) : index;

    const records: PineconeRecord[] = KNOWLEDGE_BASE.map((doc, idx) => {
      const baseMetadata: Record<string, unknown> = {
        title: doc.title,
        category: doc.category,
        content: doc.content,
        tags: doc.tags,
        ...(doc.url ? { url: doc.url } : {}),
        ...(doc.date ? { date: doc.date } : {}),
        ...(doc.metadata || {}),
      };

      return {
        id: doc.id,
        values: embeddings[idx],
        metadata: sanitizeMetadata(baseMetadata),
      };
    });

    console.log(`[RAG Ingestion] Upserting ${records.length} records to Pinecone index '${INDEX_NAME}'...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await target.upsert({ records: batch });
    }

    console.log(`[RAG Ingestion] Successfully upserted ${records.length} documents to Pinecone index '${INDEX_NAME}'.`);

    writeRagCache(currentHash, KNOWLEDGE_BASE.length, INDEX_NAME);
    process.exit(0);
  } catch (error) {
    console.error('[RAG Ingestion] Error during Pinecone ingestion:', error);
    // Non-blocking graceful exit for preview/local environments
    console.warn('[RAG Ingestion] Continuing build despite ingestion error.');
    process.exit(0);
  }
}

// Execute script if directly invoked
if (
  process.argv[1]?.endsWith('ingest.ts') ||
  process.argv[1]?.endsWith('ingest.js') ||
  (typeof import.meta.url === 'string' && import.meta.url === `file://${process.argv[1]}`)
) {
  runIngestion().catch((err) => {
    console.error('[RAG Ingestion] Fatal unhandled error:', err);
    process.exit(0);
  });
}
