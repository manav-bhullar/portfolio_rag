import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface RagCacheData {
  lastHash: string;
  lastIngestedAt?: string;
  documentCount?: number;
  [key: string]: unknown;
}

export interface IngestionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export const RAG_CACHE_PATH = path.resolve(process.cwd(), '.rag-cache.json');
export const KNOWLEDGE_BASE_PATH = path.resolve(process.cwd(), 'src/lib/rag/knowledge-base.ts');
export const INGEST_SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/ingest.ts');

/**
 * Deterministic canonical JSON stringification with sorted keys.
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
 * Computes standard SHA-256 hash over canonical knowledge base data.
 */
export function computeSha256Hash(data: unknown): string {
  const serialized = typeof data === 'string' ? data : canonicalStringify(data);
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

/**
 * Reads and parses the .rag-cache.json file if present.
 */
export function readRagCache(): RagCacheData | null {
  if (!fs.existsSync(RAG_CACHE_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(RAG_CACHE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Writes or updates .rag-cache.json.
 */
export function writeRagCache(cache: RagCacheData): void {
  fs.writeFileSync(RAG_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

/**
 * Removes .rag-cache.json.
 */
export function removeRagCache(): void {
  if (fs.existsSync(RAG_CACHE_PATH)) {
    fs.unlinkSync(RAG_CACHE_PATH);
  }
}

/**
 * Loads and returns KNOWLEDGE_BASE from src/lib/rag/knowledge-base.ts.
 */
export async function loadKnowledgeBase(): Promise<any[]> {
  if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
    throw new Error(`Knowledge base file not found at ${KNOWLEDGE_BASE_PATH}`);
  }
  const mod = await import(KNOWLEDGE_BASE_PATH);
  const kb = mod.KNOWLEDGE_BASE || mod.knowledgeBase || mod.default;
  if (!Array.isArray(kb)) {
    throw new Error(`KNOWLEDGE_BASE export from ${KNOWLEDGE_BASE_PATH} is not an array`);
  }
  return kb;
}

/**
 * Executes the ingestion script via tsx in child process.
 */
export function executeIngestionScript(extraEnv: Record<string, string> = {}): IngestionResult {
  if (!fs.existsSync(INGEST_SCRIPT_PATH)) {
    throw new Error(`Ingestion script not found at ${INGEST_SCRIPT_PATH}`);
  }

  try {
    const result = spawnSync('npx', ['tsx', 'scripts/ingest.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...extraEnv,
      },
      encoding: 'utf8',
      shell: true,
    });

    return {
      exitCode: result.status ?? (result.error ? 1 : 0),
      stdout: result.stdout?.toString() || '',
      stderr: result.stderr?.toString() || (result.error ? result.error.message : ''),
    };
  } catch (error: any) {
    return {
      exitCode: error.status ?? 1,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message,
    };
  }
}

