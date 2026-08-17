/**
 * Empirical Challenger Test Suite for Milestone 2: Automated RAG Ingestion Pipeline (R3)
 * Author: Challenger 1 (teamwork_preview_challenger_m2_1)
 */

import { spawnSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  canonicalStringify,
  computeKnowledgeBaseHash,
  readRagCache,
  writeRagCache,
  sanitizeMetadata,
  RagCacheData,
} from '../scripts/ingest';
import { KNOWLEDGE_BASE, KnowledgeDocument, KnowledgeCategory } from '../src/lib/rag/knowledge-base';

const CACHE_FILE = path.resolve(process.cwd(), '.rag-cache.json');

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function runTest(name: string, fn: () => void): void {
  const start = Date.now();
  try {
    fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✔ PASS: ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err?.message || String(err),
      details: err?.details,
    });
    console.error(`  ✖ FAIL: ${name} (${Date.now() - start}ms)`);
    console.error(`    Error: ${err?.message || err}`);
  }
}

async function runAsyncTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✔ PASS: ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err?.message || String(err),
      details: err?.details,
    });
    console.error(`  ✖ FAIL: ${name} (${Date.now() - start}ms)`);
    console.error(`    Error: ${err?.message || err}`);
  }
}

function runIngestCmd(env: Record<string, string> = {}): { status: number; stdout: string; stderr: string; combined: string } {
  const res = spawnSync('npm', ['run', 'ingest'], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  return {
    status: res.status ?? (res.error ? 1 : 0),
    stdout,
    stderr,
    combined: stdout + '\n' + stderr,
  };
}

async function main() {
  console.log('\n======================================================================');
  console.log('  Milestone 2 (R3) Ingestion Pipeline — Challenger 1 Empirical Tests');
  console.log('======================================================================\n');

  // Compute actual expected hash of current knowledge base
  const currentExpectedHash = computeKnowledgeBaseHash(KNOWLEDGE_BASE);

  try {
    // -------------------------------------------------------------------------
    // Test 1: Cache Hit Exact String & Exit Code
    // -------------------------------------------------------------------------
    runTest('Test 1: Exact Cache Hit Log Assertion & Exit Code 0', () => {
      // Explicitly write a valid cache matching current knowledge base
      const validCachePayload: RagCacheData = {
        lastHash: currentExpectedHash,
        lastIngestedAt: new Date().toISOString(),
        documentCount: KNOWLEDGE_BASE.length,
        indexName: 'portfolio',
        schemaVersion: 1,
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(validCachePayload, null, 2), 'utf8');

      const run = runIngestCmd();
      if (run.status !== 0) {
        throw new Error(`Expected exit code 0, got ${run.status}. Stderr: ${run.stderr}`);
      }
      const expectedLog = 'Zero new documents were upserted on this run (due to the hash check).';
      if (!run.combined.includes(expectedLog)) {
        throw new Error(`Output missing exact expected phrase "${expectedLog}". Actual output:\n${run.combined}`);
      }
      if (!run.combined.includes(`Knowledge base content unchanged (hash: ${currentExpectedHash.slice(0, 8)})`)) {
        throw new Error(`Output missing unchanged hash notification. Actual output:\n${run.combined}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 2: Cache Invalidation via Cache File Deletion
    // -------------------------------------------------------------------------
    runTest('Test 2: Cache Invalidation via File Deletion', () => {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }

      const run = runIngestCmd();
      if (run.status !== 0) {
        throw new Error(`Expected exit code 0 on fresh ingestion, got ${run.status}. Stderr: ${run.stderr}`);
      }

      if (!fs.existsSync(CACHE_FILE)) {
        throw new Error('Expected .rag-cache.json to be regenerated after ingestion');
      }

      const cacheContent: RagCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (cacheContent.lastHash !== currentExpectedHash) {
        throw new Error(`Expected lastHash "${currentExpectedHash}", got "${cacheContent.lastHash}"`);
      }
      if (cacheContent.documentCount !== KNOWLEDGE_BASE.length) {
        throw new Error(`Expected documentCount ${KNOWLEDGE_BASE.length}, got ${cacheContent.documentCount}`);
      }
      if (typeof cacheContent.lastHash !== 'string' || cacheContent.lastHash.length !== 64) {
        throw new Error(`Expected SHA-256 hash of length 64, got length ${cacheContent.lastHash?.length}`);
      }
      if (!run.combined.includes(`Knowledge base content changed (previous: none, current: ${currentExpectedHash.slice(0, 8)})`)) {
        throw new Error(`Expected previous: none log. Actual output:\n${run.combined}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 3: Cache Invalidation via Outdated / Mismatched Hash
    // -------------------------------------------------------------------------
    runTest('Test 3: Cache Invalidation via Outdated / Mismatched Hash', () => {
      const dummyOldHash = 'deadbeef' + '0'.repeat(56);
      const outdatedCachePayload: RagCacheData = {
        lastHash: dummyOldHash,
        lastIngestedAt: '2026-01-01T00:00:00.000Z',
        documentCount: 5,
        indexName: 'portfolio',
        schemaVersion: 1,
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(outdatedCachePayload, null, 2), 'utf8');

      const run = runIngestCmd();
      if (run.status !== 0) {
        throw new Error(`Expected exit code 0 on invalidation, got ${run.status}. Stderr: ${run.stderr}`);
      }

      if (!run.combined.includes(`Knowledge base content changed (previous: deadbeef, current: ${currentExpectedHash.slice(0, 8)})`)) {
        throw new Error(`Output should indicate previous hash snippet "deadbeef". Output:\n${run.combined}`);
      }

      const updatedCache: RagCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (updatedCache.lastHash !== currentExpectedHash) {
        throw new Error(`Cache lastHash not updated. Expected ${currentExpectedHash}, got ${updatedCache.lastHash}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 4: Cache Corruption — Malformed JSON
    // -------------------------------------------------------------------------
    runTest('Test 4: Cache Corruption — Malformed Unparseable JSON', () => {
      fs.writeFileSync(CACHE_FILE, '<<< INVALID CORRUPTED JSON >>>', 'utf8');

      const run = runIngestCmd();
      if (run.status !== 0) {
        throw new Error(`Expected exit code 0 on corrupt cache fallback, got ${run.status}. Stderr: ${run.stderr}`);
      }

      if (!run.combined.includes('Warning: Failed to read/parse cache file, proceeding with fresh check')) {
        throw new Error(`Expected warning log for unparseable cache file. Output:\n${run.combined}`);
      }

      const newCache: RagCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (newCache.lastHash !== currentExpectedHash) {
        throw new Error(`Regenerated cache has invalid hash: ${newCache.lastHash}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 5: Cache Corruption — Empty File
    // -------------------------------------------------------------------------
    runTest('Test 5: Cache Corruption — Empty File ("")', () => {
      fs.writeFileSync(CACHE_FILE, '', 'utf8');

      const run = runIngestCmd();
      if (run.status !== 0) {
        throw new Error(`Expected exit code 0 on empty cache file, got ${run.status}. Stderr: ${run.stderr}`);
      }

      const newCache: RagCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (newCache.lastHash !== currentExpectedHash) {
        throw new Error(`Regenerated cache has invalid hash: ${newCache.lastHash}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 6: Cache Corruption — Whitespace Only
    // -------------------------------------------------------------------------
    runTest('Test 6: Cache Corruption — Whitespace Only ("  \\n\\t  ")', () => {
      fs.writeFileSync(CACHE_FILE, '   \n\t  \n  ', 'utf8');

      const run = runIngestCmd();
      if (run.status !== 0) {
        throw new Error(`Expected exit code 0 on whitespace cache file, got ${run.status}. Stderr: ${run.stderr}`);
      }

      const newCache: RagCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (newCache.lastHash !== currentExpectedHash) {
        throw new Error(`Regenerated cache has invalid hash: ${newCache.lastHash}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 7: Cache Corruption — Invalid Schema (Non-string, Wrong Lengths, Nulls)
    // -------------------------------------------------------------------------
    runTest('Test 7: Cache Corruption — Invalid Schema Types and Lengths', () => {
      // Case A: number instead of string
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastHash: 123456789 }), 'utf8');
      let run = runIngestCmd();
      if (run.status !== 0) throw new Error('Failed on numeric lastHash');

      // Case B: short string (not 64 chars)
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastHash: 'short_hash' }), 'utf8');
      run = runIngestCmd();
      if (run.status !== 0) throw new Error('Failed on short lastHash');

      // Case C: long string (65 chars)
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastHash: 'deadbeef' + '0'.repeat(57) }), 'utf8');
      run = runIngestCmd();
      if (run.status !== 0) throw new Error('Failed on 65-char lastHash');

      // Case D: null lastHash
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ lastHash: null }), 'utf8');
      run = runIngestCmd();
      if (run.status !== 0) throw new Error('Failed on null lastHash');

      const finalCache: RagCacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (finalCache.lastHash !== currentExpectedHash) {
        throw new Error(`Final regenerated cache has invalid hash: ${finalCache.lastHash}`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 8: Deterministic Hashing & Canonical Stringification
    // -------------------------------------------------------------------------
    runTest('Test 8: Deterministic Hashing & Key Order Invariance', () => {
      const objA = {
        z: 100,
        a: 'first',
        nested: { delta: true, alpha: [1, 2, 3], beta: { y: 'bar', x: 'foo' } },
        tags: ['web', 'backend'],
      };

      const objB = {
        nested: { beta: { x: 'foo', y: 'bar' }, alpha: [1, 2, 3], delta: true },
        tags: ['web', 'backend'],
        a: 'first',
        z: 100,
      };

      const strA = canonicalStringify(objA);
      const strB = canonicalStringify(objB);

      if (strA !== strB) {
        throw new Error(`canonicalStringify produced different results for different key orders:\nA: ${strA}\nB: ${strB}`);
      }

      const hashA = crypto.createHash('sha256').update(strA).digest('hex');
      const hashB = crypto.createHash('sha256').update(strB).digest('hex');
      if (hashA !== hashB) {
        throw new Error(`SHA-256 digests differed: ${hashA} vs ${hashB}`);
      }

      // Verify array element order is strictly preserved
      const arr1 = [1, 2, 3];
      const arr2 = [3, 2, 1];
      if (canonicalStringify(arr1) === canonicalStringify(arr2)) {
        throw new Error('canonicalStringify must NOT sort arrays');
      }
    });

    // -------------------------------------------------------------------------
    // Test 9: Metadata Sanitization Unit Test
    // -------------------------------------------------------------------------
    runTest('Test 9: Metadata Sanitization for Pinecone v6 Types', () => {
      const rawMetadata = {
        title: 'Floq',
        count: 42,
        active: true,
        tags: ['redis', 'lua', 'postgres'],
        nestedObj: { subField: 'value' },
        numberArray: [1, 2, 3],
        nilValue: null,
        undefValue: undefined,
      };

      const sanitized = sanitizeMetadata(rawMetadata);

      if (sanitized.title !== 'Floq' || sanitized.count !== 42 || sanitized.active !== true) {
        throw new Error('Primitives were not preserved correctly in sanitizeMetadata');
      }
      if (!Array.isArray(sanitized.tags) || sanitized.tags.length !== 3) {
        throw new Error('String array was not preserved in sanitizeMetadata');
      }
      if (sanitized.nestedObj !== '{"subField":"value"}') {
        throw new Error(`Nested object was not stringified properly: ${sanitized.nestedObj}`);
      }
      if (sanitized.numberArray !== '[1,2,3]') {
        throw new Error(`Non-string array was not stringified properly: ${sanitized.numberArray}`);
      }
      if ('nilValue' in sanitized || 'undefValue' in sanitized) {
        throw new Error('Null or undefined keys were not stripped in sanitizeMetadata');
      }
    });

    // -------------------------------------------------------------------------
    // Test 10: Knowledge Base Dataset Schema Integrity
    // -------------------------------------------------------------------------
    runTest('Test 10: Knowledge Base Structure & Category Integrity', () => {
      const validCategories: Set<KnowledgeCategory> = new Set([
        'bio',
        'project',
        'skills',
        'experience',
        'education',
        'achievements',
        'contact',
        'interests',
        'hack',
      ]);

      if (!Array.isArray(KNOWLEDGE_BASE) || KNOWLEDGE_BASE.length === 0) {
        throw new Error('KNOWLEDGE_BASE must be a non-empty array');
      }

      if (KNOWLEDGE_BASE.length < 10) {
        throw new Error(`KNOWLEDGE_BASE has only ${KNOWLEDGE_BASE.length} items, expected comprehensive coverage (>10)`);
      }

      const seenIds = new Set<string>();
      let totalContentLength = 0;

      for (const doc of KNOWLEDGE_BASE) {
        if (!doc.id || typeof doc.id !== 'string') {
          throw new Error(`Document missing valid id: ${JSON.stringify(doc)}`);
        }
        if (seenIds.has(doc.id)) {
          throw new Error(`Duplicate document id detected: ${doc.id}`);
        }
        seenIds.add(doc.id);

        if (!doc.title || typeof doc.title !== 'string') {
          throw new Error(`Document ${doc.id} missing valid title`);
        }
        if (!validCategories.has(doc.category)) {
          throw new Error(`Document ${doc.id} has invalid category: ${doc.category}`);
        }
        if (!doc.content || typeof doc.content !== 'string' || doc.content.length < 50) {
          throw new Error(`Document ${doc.id} content too short or invalid`);
        }
        totalContentLength += doc.content.length;

        if (!Array.isArray(doc.tags) || doc.tags.length === 0) {
          throw new Error(`Document ${doc.id} must have non-empty tags array`);
        }
      }

      if (totalContentLength < 10000) {
        throw new Error(`Total knowledge base content is too sparse: ${totalContentLength} chars`);
      }
    });

    // -------------------------------------------------------------------------
    // Test 11: Production Build Script & Pipeline Integration
    // -------------------------------------------------------------------------
    await runAsyncTest('Test 11: Production Build Execution (npm run build)', async () => {
      console.log('    Running "npm run build" to test full pipeline integration...');
      const buildRes = spawnSync('npm', ['run', 'build'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 120000,
      });

      if (buildRes.status !== 0) {
        throw new Error(`npm run build failed with status ${buildRes.status}.\nStderr: ${buildRes.stderr}\nStdout: ${buildRes.stdout}`);
      }

      const fullOutput = (buildRes.stdout || '') + '\n' + (buildRes.stderr || '');
      if (!fullOutput.includes('tsx scripts/ingest.ts')) {
        throw new Error('Build output does not show tsx scripts/ingest.ts running');
      }
      if (!fullOutput.includes('Compiled successfully') && !fullOutput.includes('Generating static pages')) {
        throw new Error('Next.js build did not complete compilation successfully');
      }
    });

  } finally {
    // Restore valid cache state
    writeRagCache(currentExpectedHash, KNOWLEDGE_BASE.length);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n======================================================================');
  console.log(`  Empirical Test Run Completed: ${passedCount}/${results.length} PASSED`);
  if (failedCount > 0) {
    console.log(`  ${failedCount} TESTS FAILED`);
  }
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
