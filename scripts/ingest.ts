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

const EMBEDDING_MODEL = 'gemini-embedding-2';
const EMBEDDING_DIMENSION = 3072;
// Bump whenever the shape of the upserted records changes. It is part of every
// record ID's content hash, so a bump re-embeds everything on the next run.
// v2: record metadata includes `keywords` (used by hybrid re-ranking).
// v3: documents are chunked; record IDs are content-addressed (`<docId>#<n>-<hash>`)
//     and carry parentId / family / isOverview / chunkIndex / chunkCount metadata.
const CACHE_SCHEMA_VERSION = 3;

// Chunking: ~500 tokens per chunk keeps embeddings focused and stays far below
// Pinecone's 40 KB metadata limit. Documents shorter than this stay whole.
const MAX_CHUNK_CHARS = 2000;
// One paragraph of overlap between neighbouring chunks, if it's short enough,
// so a fact split across a boundary is still retrievable from either side.
const MAX_OVERLAP_CHARS = 500;
const EMBED_BATCH_SIZE = 100;
const UPSERT_BATCH_SIZE = 100;

// --dry-run: report what would be embedded, upserted and pruned, without writing anything.
// --prune:   delete index records that are not part of the current knowledge base
//            (removed documents and outdated chunk versions), so the repo stays the
//            single source of truth. The build uses it; tests never do.
const CLI_ARGS = new Set(process.argv.slice(2));
const DRY_RUN = CLI_ARGS.has('--dry-run');
const PRUNE = CLI_ARGS.has('--prune');

export interface RagCacheData {
  lastHash: string;
  lastIngestedAt: string;
  documentCount: number;
  indexName: string;
  schemaVersion: number;
  embeddingModel?: string;
  embeddingDimension?: number;
  namespace?: string;
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
      schemaVersion: CACHE_SCHEMA_VERSION,
      embeddingModel: EMBEDDING_MODEL,
      embeddingDimension: EMBEDDING_DIMENSION,
      namespace: NAMESPACE,
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cachePayload, null, 2) + '\n', 'utf8');
  } catch (error) {
    console.warn('[RAG Ingestion] Warning: Failed to write cache file:', error);
  }
}

/**
 * The cache is only valid if the content is unchanged AND the records were
 * produced with the current embedding model, dimension and record schema,
 * for the same index and namespace.
 * Otherwise a model switch would leave stale vectors in the index.
 */
export function isCacheCurrent(cache: RagCacheData | null, currentHash: string): boolean {
  return (
    cache !== null &&
    cache.lastHash === currentHash &&
    cache.schemaVersion === CACHE_SCHEMA_VERSION &&
    cache.embeddingModel === EMBEDDING_MODEL &&
    cache.embeddingDimension === EMBEDDING_DIMENSION &&
    cache.indexName === INDEX_NAME &&
    (cache.namespace ?? '') === NAMESPACE
  );
}

type PineconeTarget = ReturnType<Pinecone['index']>;

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

// ── Chunking ──────────────────────────────────────────────────

/** Splits an over-long paragraph on sentence boundaries (hard-cutting only as a last resort). */
function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  const sentences = paragraph.match(/[^.!?\n]+[.!?]*\s*/g) ?? [paragraph];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxChars) {
      pieces.push(current.trim());
      current = '';
    }
    if (sentence.length > maxChars) {
      for (let i = 0; i < sentence.length; i += maxChars) pieces.push(sentence.slice(i, i + maxChars).trim());
    } else {
      current += sentence;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

/**
 * Structure-aware chunking: packs whole paragraphs into chunks of at most
 * maxChars, carrying one short paragraph of overlap into the next chunk.
 * Content that already fits is returned as a single chunk, unchanged.
 */
export function chunkText(content: string, maxChars: number = MAX_CHUNK_CHARS): string[] {
  const text = content.trim();
  if (text.length <= maxChars) return [text];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length > maxChars ? splitLongParagraph(p, maxChars) : [p]));

  const chunks: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    if (current.length > 0 && currentLength + paragraph.length + 2 > maxChars) {
      chunks.push(current.join('\n\n'));
      const last = current[current.length - 1];
      const carry = last.length <= MAX_OVERLAP_CHARS && last.length + paragraph.length + 2 <= maxChars;
      current = carry ? [last] : [];
      currentLength = carry ? last.length : 0;
    }
    current.push(paragraph);
    currentLength += paragraph.length + 2;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}

export interface IndexChunk {
  id: string;            // content-addressed record ID: `${docId}#${index}-${hash}`
  parentId: string;      // the KnowledgeDocument id (what the model cites)
  chunkIndex: number;
  chunkCount: number;
  embedText: string;     // what gets embedded
  metadata: Record<string, string | number | boolean | string[]>;
}

/**
 * Turns one document into index chunks. The record ID embeds a hash of
 * everything that affects the stored vector or metadata (text, metadata,
 * embedding model, dimension, schema version), so an unchanged chunk keeps
 * its ID across builds and never needs re-embedding, and any change produces
 * a new ID. This makes ingestion incremental without relying on a local cache.
 */
export function chunkDocument(doc: KnowledgeDocument): IndexChunk[] {
  const pieces = chunkText(doc.content);
  return pieces.map((piece, chunkIndex) => {
    const chunkTitle = pieces.length > 1 ? `${doc.title} (part ${chunkIndex + 1}/${pieces.length})` : doc.title;
    const embedText = `${chunkTitle}\n\n${piece}`;
    const metadata = sanitizeMetadata({
      title: doc.title,
      category: doc.category,
      content: piece,
      keywords: doc.keywords,
      tags: doc.tags,
      parentId: doc.id,
      // Family = the overview a sub-topic belongs to (or the doc itself).
      family: doc.partOf ?? doc.id,
      isOverview: !doc.partOf,
      chunkIndex,
      chunkCount: pieces.length,
      ...(doc.url ? { url: doc.url } : {}),
      ...(doc.date ? { date: doc.date } : {}),
      ...(doc.metadata || {}),
    });
    const hash = crypto
      .createHash('sha256')
      .update(
        canonicalStringify({
          embedText,
          metadata,
          model: EMBEDDING_MODEL,
          dimension: EMBEDDING_DIMENSION,
          schemaVersion: CACHE_SCHEMA_VERSION,
        }),
        'utf8'
      )
      .digest('hex')
      .slice(0, 12);
    return {
      id: `${doc.id}#${chunkIndex}-${hash}`,
      parentId: doc.id,
      chunkIndex,
      chunkCount: pieces.length,
      embedText,
      metadata,
    };
  });
}

export function buildIndexChunks(docs: KnowledgeDocument[] = KNOWLEDGE_BASE): IndexChunk[] {
  const ids = new Set<string>();
  for (const doc of docs) {
    if (doc.id.includes('#')) throw new Error(`Document id '${doc.id}' must not contain '#'.`);
    if (ids.has(doc.id)) throw new Error(`Duplicate document id '${doc.id}'.`);
    ids.add(doc.id);
  }
  for (const doc of docs) {
    if (doc.partOf && !docs.some((d) => d.id === doc.partOf && !d.partOf)) {
      throw new Error(`Document '${doc.id}' has partOf '${doc.partOf}', which is not an overview document.`);
    }
  }
  return docs.flatMap(chunkDocument);
}

// ── Pinecone helpers ──────────────────────────────────────────

/**
 * Lists every record ID in the target namespace (serverless indexes only).
 * IDs only, so this stays cheap even for ~100k records.
 */
export async function listAllRecordIds(target: PineconeTarget): Promise<string[]> {
  const ids: string[] = [];
  let paginationToken: string | undefined;
  do {
    const page = await target.listPaginated({ limit: 100, paginationToken });
    for (const v of page.vectors ?? []) if (v.id) ids.push(v.id);
    paginationToken = page.pagination?.next;
  } while (paginationToken);
  return ids;
}

async function deleteRecords(target: PineconeTarget, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 1000) {
    await target.deleteMany({ ids: ids.slice(i, i + 1000) });
  }
}

/** Embeds texts in batches, rotating across the configured Gemini keys on failure. */
async function embedInBatches(texts: string[], apiKeys: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    let lastError: unknown = null;
    let embedded: number[][] | null = null;
    for (const apiKey of apiKeys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { embeddings } = await embedMany({ model: google.textEmbeddingModel(EMBEDDING_MODEL), values: batch });
        embedded = embeddings;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`[RAG Ingestion] Embedding batch ${i / EMBED_BATCH_SIZE + 1} failed on one key, trying the next.`);
      }
    }
    if (!embedded) throw lastError ?? new Error('Embedding failed on all keys');
    const badDimension = embedded.find((e) => e.length !== EMBEDDING_DIMENSION);
    if (badDimension) {
      throw new Error(
        `${EMBEDDING_MODEL} returned ${badDimension.length}-dim vectors, expected ${EMBEDDING_DIMENSION}. Update EMBEDDING_DIMENSION (and the index) before ingesting.`
      );
    }
    vectors.push(...embedded);
    console.log(`[RAG Ingestion] Embedded ${Math.min(i + EMBED_BATCH_SIZE, texts.length)}/${texts.length} chunks.`);
  }
  return vectors;
}

// ── Main ──────────────────────────────────────────────────────

export async function runIngestion(): Promise<void> {
  console.log(
    `[RAG Ingestion] Checking knowledge base status...${DRY_RUN ? ' (dry run)' : ''}${PRUNE ? ' (prune enabled)' : ''}`
  );
  const currentHash = computeKnowledgeBaseHash(KNOWLEDGE_BASE);
  const cache = readRagCache();
  const upToDate = isCacheCurrent(cache, currentHash);

  // 1. Local fast path. Without a cache (e.g. a fresh CI checkout) we fall
  //    through to the index diff below, which is still cheap: it lists IDs and
  //    embeds only chunks the index doesn't already have.
  if (upToDate && !PRUNE && !DRY_RUN) {
    console.log(
      `[RAG Ingestion] Knowledge base content unchanged (hash: ${currentHash.slice(0, 8)}). Zero new documents were upserted on this run (due to the hash check).`
    );
    process.exit(0);
  }

  const chunks = buildIndexChunks(KNOWLEDGE_BASE);
  console.log(
    `[RAG Ingestion] ${KNOWLEDGE_BASE.length} documents → ${chunks.length} chunks (hash: ${currentHash.slice(0, 8)}, schema v${CACHE_SCHEMA_VERSION}, ${EMBEDDING_MODEL}/${EMBEDDING_DIMENSION}).`
  );

  // 2. Check for Pinecone credentials
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  if (!pineconeApiKey) {
    console.warn(
      '[RAG Ingestion] Warning: PINECONE_API_KEY is not set in environment. Skipping vector database upsert. Updating local cache.'
    );
    if (!DRY_RUN) writeRagCache(currentHash, KNOWLEDGE_BASE.length, INDEX_NAME);
    process.exit(0);
  }

  try {
    const pc = new Pinecone({ apiKey: pineconeApiKey });
    const indexList = await pc.listIndexes();
    const exists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME) ?? false;

    // 3. Diff the desired chunk IDs against what the index already holds
    let existingIds: string[] = [];
    if (exists) {
      const index = pc.index(INDEX_NAME);
      existingIds = await listAllRecordIds(NAMESPACE ? index.namespace(NAMESPACE) : index);
    }
    const existing = new Set(existingIds);
    const desiredIds = new Set(chunks.map((c) => c.id));
    const toUpsert = chunks.filter((c) => !existing.has(c.id));
    const staleIds = existingIds.filter((id) => !desiredIds.has(id));

    console.log(
      `[RAG Ingestion] Index '${INDEX_NAME}': ${existingIds.length} records. ${toUpsert.length} new/changed chunk(s) to embed, ${chunks.length - toUpsert.length} unchanged, ${staleIds.length} stale.`
    );
    if (toUpsert.length === 0) {
      console.log('[RAG Ingestion] Zero new documents were upserted on this run (every chunk is already indexed).');
    }
    if (staleIds.length > 0) {
      console.log(`[RAG Ingestion] Stale record(s) not in the current knowledge base:`);
      for (const id of staleIds.slice(0, 50)) console.log(`  - ${id}`);
      if (staleIds.length > 50) console.log(`  … and ${staleIds.length - 50} more`);
    }

    if (DRY_RUN) {
      console.log('[RAG Ingestion] Dry run: nothing embedded, upserted or deleted.');
      process.exit(0);
    }

    // 4. Embed and upsert only what changed
    if (toUpsert.length > 0) {
      const geminiKeys = Object.keys(process.env)
        .filter((key) => key.startsWith('GEMINI_API_KEY') || key.startsWith('GOOGLE_API_KEY'))
        .map((key) => process.env[key])
        .filter((v): v is string => Boolean(v));

      if (geminiKeys.length === 0) {
        console.warn(
          '[RAG Ingestion] Warning: No GEMINI_API_KEY or GOOGLE_API_KEY found in environment. Cannot generate embeddings. Skipping Pinecone upsert. Updating local cache.'
        );
        writeRagCache(currentHash, KNOWLEDGE_BASE.length, INDEX_NAME);
        process.exit(0);
      }

      if (!exists) {
        console.log(`[RAG Ingestion] Index '${INDEX_NAME}' does not exist. Creating serverless index...`);
        await pc.createIndex({
          name: INDEX_NAME,
          dimension: EMBEDDING_DIMENSION,
          metric: 'cosine',
          spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
          waitUntilReady: true,
        });
        console.log(`[RAG Ingestion] Index '${INDEX_NAME}' created.`);
      }

      console.log(`[RAG Ingestion] Generating vector embeddings using Gemini ${EMBEDDING_MODEL}...`);
      const vectors = await embedInBatches(toUpsert.map((c) => c.embedText), geminiKeys);

      const index = pc.index(INDEX_NAME);
      const target = NAMESPACE ? index.namespace(NAMESPACE) : index;
      const records: PineconeRecord[] = toUpsert.map((chunk, i) => ({
        id: chunk.id,
        values: vectors[i],
        metadata: chunk.metadata,
      }));

      console.log(`[RAG Ingestion] Upserting ${records.length} records to Pinecone index '${INDEX_NAME}'...`);
      for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
        await target.upsert({ records: records.slice(i, i + UPSERT_BATCH_SIZE) });
      }
      console.log(`[RAG Ingestion] Successfully upserted ${records.length} chunks to Pinecone index '${INDEX_NAME}'.`);
    }

    writeRagCache(currentHash, KNOWLEDGE_BASE.length, INDEX_NAME);

    // 5. Prune only after a successful upsert, so a failed run never deletes anything.
    if (staleIds.length > 0) {
      if (!PRUNE) {
        console.warn(
          `[RAG Ingestion] ${staleIds.length} stale record(s) left in the index (outdated chunk versions or removed documents). Run with --prune to delete them.`
        );
      } else if (KNOWLEDGE_BASE.length === 0) {
        console.warn('[RAG Ingestion] Refusing to prune: KNOWLEDGE_BASE is empty.');
      } else {
        const index = pc.index(INDEX_NAME);
        await deleteRecords(NAMESPACE ? index.namespace(NAMESPACE) : index, staleIds);
        console.log(`[RAG Ingestion] Deleted ${staleIds.length} stale record(s).`);
      }
    } else if (PRUNE) {
      console.log('[RAG Ingestion] Index is in sync: no stale records.');
    }

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
