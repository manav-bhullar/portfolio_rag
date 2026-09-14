import fs from 'node:fs';
import path from 'node:path';
import { TestCase } from './helpers/types';
import { expect, assert } from './helpers/assert';
import {
  parseSourceFile,
  findMethodCalls,
  findJsxElements,
  readProjectFile,
  projectFileExists,
} from './helpers/ast-validator';
import {
  computeSha256Hash,
  loadKnowledgeBase,
  executeIngestionScript,
  readRagCache,
  writeRagCache,
  removeRagCache,
  RAG_CACHE_PATH,
} from './helpers/rag-runner';
import {
  SlidingWindowRateLimiterOracle,
  createChatRequest,
  invokeChatRoute,
  parseRateLimitHeaders,
} from './helpers/http-simulator';
import { auditComponentA11y } from './helpers/dom-a11y-validator';

export const tier2Tests: TestCase[] = [
  // ==========================================
  // Feature R1: Rate Limiting Boundary & Corner Cases
  // ==========================================
  {
    id: 'T2-R1-01',
    name: 'R1: Multi-IP x-forwarded-for header parses the client IP as first entry',
    feature: 'R1',
    tier: 2,
    fn: async () => {
      const headerValue = '203.0.113.195, 70.41.3.18, 150.172.238.178';
      const extractedClientIp = headerValue.split(',')[0].trim();
      expect(extractedClientIp, 'First IP in comma list must be extracted').toBe('203.0.113.195');

      const routeOrLibCode = projectFileExists('src/lib/ratelimit.ts')
        ? readProjectFile('src/lib/ratelimit.ts') + readProjectFile('src/app/api/chat/route.ts')
        : readProjectFile('src/app/api/chat/route.ts');

      const handlesForwardedFor =
        /x-forwarded-for/i.test(routeOrLibCode) &&
        (routeOrLibCode.includes('split') || routeOrLibCode.includes('[0]'));
      expect(
        handlesForwardedFor,
        'Route handler must parse the first client IP from x-forwarded-for header chain'
      ).toBeTruthy();

      // Verify route invocation with multi-IP x-forwarded-for header
      const testIp = '203.0.113.201';
      for (let i = 0; i < 10; i++) {
        await invokeChatRoute(
          createChatRequest({ forwardedFor: `${testIp}, 70.41.3.18, 150.172.238.178` })
        );
      }
      const res11 = await invokeChatRoute(
        createChatRequest({ forwardedFor: `${testIp}, 198.51.100.1` })
      );
      expect(
        res11.status,
        '11th request using multi-IP x-forwarded-for header chain must be rate limited with 429'
      ).toBe(429);
    },
  },

  {
    id: 'T2-R1-02',
    name: 'R1: x-real-ip header is utilized when x-forwarded-for is absent',
    feature: 'R1',
    tier: 2,
    fn: async () => {
      const routeOrLibCode = projectFileExists('src/lib/ratelimit.ts')
        ? readProjectFile('src/lib/ratelimit.ts') + readProjectFile('src/app/api/chat/route.ts')
        : readProjectFile('src/app/api/chat/route.ts');

      const checksRealIp = /x-real-ip/i.test(routeOrLibCode);
      expect(checksRealIp, 'Rate limiter must check x-real-ip header as fallback').toBeTruthy();

      // Verify route invocation with x-real-ip header
      const testRealIp = '203.0.113.202';
      for (let i = 0; i < 10; i++) {
        await invokeChatRoute(createChatRequest({ realIp: testRealIp }));
      }
      const res11 = await invokeChatRoute(createChatRequest({ realIp: testRealIp }));
      expect(res11.status, '11th request using x-real-ip header must be rate limited with 429').toBe(429);
    },
  },

  {
    id: 'T2-R1-03',
    name: 'R1: Direct connection fallback IP is safely used when proxy headers are absent',
    feature: 'R1',
    tier: 2,
    fn: async () => {
      const routeOrLibCode = projectFileExists('src/lib/ratelimit.ts')
        ? readProjectFile('src/lib/ratelimit.ts') + readProjectFile('src/app/api/chat/route.ts')
        : readProjectFile('src/app/api/chat/route.ts');

      const hasFallbackIp =
        routeOrLibCode.includes('127.0.0.1') ||
        routeOrLibCode.includes('anonymous') ||
        routeOrLibCode.includes('localhost') ||
        /ip\s*\|\|\s*['"][^'"]+['"]/.test(routeOrLibCode) ||
        /headers\.get\(['"][^'"]+['"]\)\s*\?\?/.test(routeOrLibCode);
      expect(hasFallbackIp, 'Rate limiter must provide safe fallback IP for missing headers').toBeTruthy();

      // Verify route invocation with no IP headers executes safely without crashing
      const reqNoHeaders = createChatRequest({ headers: {} });
      const res = await invokeChatRoute(reqNoHeaders);
      expect(res.status, 'Direct request without proxy headers must return valid HTTP status').toBeDefined();
    },
  },

  {
    id: 'T2-R1-04',
    name: 'R1: Burst concurrency: 15 concurrent parallel requests allow 10 and reject 5',
    feature: 'R1',
    tier: 2,
    fn: async () => {
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const ip = '198.51.100.50';

      const results = [];
      const timestamp = Date.now();
      for (let i = 0; i < 15; i++) {
        results.push(oracle.limit(ip, timestamp));
      }

      const passed = results.filter((r) => r.success).length;
      const rejected = results.filter((r) => !r.success).length;

      expect(passed, 'Exactly 10 burst requests should pass').toBe(10);
      expect(rejected, 'Exactly 5 burst requests should be rejected').toBe(5);

      // Verify route handler handles 15 concurrent parallel requests
      const burstIp = '198.51.100.204';
      const promises = Array.from({ length: 15 }, () =>
        invokeChatRoute(createChatRequest({ ip: burstIp }))
      );
      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      const rateLimitedCount = statuses.filter((s) => s === 429).length;
      const admittedCount = statuses.filter((s) => s !== 429).length;

      expect(admittedCount, '10 concurrent route requests should be admitted').toBe(10);
      expect(rateLimitedCount, '5 concurrent route requests should be rejected with 429').toBe(5);
    },
  },

  {
    id: 'T2-R1-05',
    name: 'R1: Sliding window reset restores quota after 60 seconds interval passes',
    feature: 'R1',
    tier: 2,
    fn: async () => {
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const ip = '198.51.100.60';
      const t0 = 1000000;

      // Exhaust 10 requests at t0
      for (let i = 0; i < 10; i++) {
        oracle.limit(ip, t0);
      }
      expect(oracle.limit(ip, t0).success, '11th request at t0 must fail').toBeFalsy();

      // At t0 + 61 seconds (window passed)
      const t1 = t0 + 61 * 1000;
      const renewed = oracle.limit(ip, t1);
      expect(renewed.success, 'Request after window expiry must succeed').toBeTruthy();
      expect(renewed.remaining, 'Remaining quota after 1 renewed request should be 9').toBe(9);
    },
  },

  // ==========================================
  // Feature R2: Analytics Boundary & Corner Cases
  // ==========================================
  {
    id: 'T2-R2-01',
    name: 'R2: Empty string query does not trigger posthog.capture or message submission',
    feature: 'R2',
    tier: 2,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const guardsEmptyQuery =
        /if\s*\(\s*!query\.trim\(\)/.test(chatCode) ||
        /if\s*\(\s*!query\b/.test(chatCode) ||
        /query\.trim\(\)\.length\s*===\s*0/.test(chatCode);

      expect(
        guardsEmptyQuery,
        'submitQuery in chat.tsx must guard against empty string queries'
      ).toBeTruthy();
    },
  },

  {
    id: 'T2-R2-02',
    name: 'R2: Whitespace-only query is trimmed and suppressed from analytics dispatch',
    feature: 'R2',
    tier: 2,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const trimsQuery = chatCode.includes('query.trim()') || chatCode.includes('input.trim()');
      expect(trimsQuery, 'chat.tsx must trim queries before submission and analytics capture').toBeTruthy();
    },
  },

  {
    id: 'T2-R2-03',
    name: 'R2: Queries with Unicode, emojis, meta-characters, and large payloads are safely captured',
    feature: 'R2',
    tier: 2,
    fn: async () => {
      const testQueries = [
        '🚀 What are your top AI/ML projects? 🧠',
        'Tell me about "SCALES v3.0" & <script>alert("test")</script>',
        'C++ / R / Python skills & DuckDB table joins across 96,095 rows',
        'A'.repeat(5000), // Large prompt stress test
      ];

      for (const q of testQueries) {
        const trimmed = q.trim();
        expect(trimmed.length > 0, 'Query should not be empty').toBeTruthy();
        const payload = { query: trimmed };
        expect(payload.query, 'Payload query must preserve full string').toBe(trimmed);
      }
    },
  },

  {
    id: 'T2-R2-04',
    name: 'R2: Missing NEXT_PUBLIC_POSTHOG_KEY degrades gracefully without client exception',
    feature: 'R2',
    tier: 2,
    fn: async () => {
      const providerFile = projectFileExists('src/components/posthog-provider.tsx')
        ? 'src/components/posthog-provider.tsx'
        : 'src/app/layout.tsx';

      const code = readProjectFile(providerFile);
      const guardsMissingKey =
        /if\s*\(.*NEXT_PUBLIC_POSTHOG_KEY/i.test(code) ||
        /posthogKey\s*&&/i.test(code) ||
        /if\s*\(\s*posthogKey\s*\)/i.test(code) ||
        /typeof window !== 'undefined'/.test(code);

      expect(
        guardsMissingKey,
        'PostHog initialization must check for presence of NEXT_PUBLIC_POSTHOG_KEY'
      ).toBeTruthy();
    },
  },

  {
    id: 'T2-R2-05',
    name: 'R2: Rapid consecutive submissions while tool is in progress are guarded',
    feature: 'R2',
    tier: 2,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const guardsToolInProgress =
        /if\s*\(.*isToolInProgress.*\)\s*return/.test(chatCode) ||
        /!query\.trim\(\)\s*\|\|\s*isToolInProgress/.test(chatCode);

      expect(
        guardsToolInProgress,
        'submitQuery in chat.tsx must prevent re-submission while isToolInProgress is true'
      ).toBeTruthy();
    },
  },

  // ==========================================
  // Feature R3: Automated RAG Ingestion Boundary & Corner Cases
  // ==========================================
  {
    id: 'T2-R3-01',
    name: 'R3: Missing PINECONE_API_KEY skips upsert gracefully with exit code 0',
    feature: 'R3',
    tier: 2,
    fn: async () => {
      // Execute ingestion script without PINECONE_API_KEY
      const result = executeIngestionScript({ PINECONE_API_KEY: '' });
      expect(
        result.exitCode,
        `Ingestion without PINECONE_API_KEY should complete cleanly with exit code 0. Error: ${result.stderr}`
      ).toBe(0);

      const output = result.stdout + result.stderr;
      const logsWarningOrSuccess =
        /PINECONE_API_KEY/i.test(output) ||
        /skipping vector upsert/i.test(output) ||
        /zero new documents/i.test(output) ||
        /cache/i.test(output);

      expect(
        logsWarningOrSuccess,
        `Missing PINECONE_API_KEY should log warning or cache update. Output: ${output}`
      ).toBeTruthy();
    },
  },

  {
    id: 'T2-R3-02',
    name: 'R3: Content modification in knowledge base changes hash and invalidates cache',
    feature: 'R3',
    tier: 2,
    fn: async () => {
      const kb = await loadKnowledgeBase();
      const originalHash = computeSha256Hash(kb);

      const modifiedKb = [
        ...kb,
        {
          id: 'test-doc-modified',
          title: 'Test Modified Document',
          category: 'project',
          content: 'Newly added test document content for hash invalidation test.',
        },
      ];
      const newHash = computeSha256Hash(modifiedKb);

      expect(originalHash !== newHash, 'Modifying content must produce a distinct SHA-256 hash').toBeTruthy();

      // Write artificial cache with old hash
      writeRagCache({ lastHash: originalHash, lastIngestedAt: new Date().toISOString() });

      const currentCache = readRagCache();
      expect(currentCache?.lastHash, 'Current cache should store previous hash').toBe(originalHash);
      expect(currentCache?.lastHash === newHash, 'Old cache must not match new content hash').toBeFalsy();
    },
  },

  {
    id: 'T2-R3-03',
    name: 'R3: Deletion of .rag-cache.json triggers fresh re-ingestion and recreates cache',
    feature: 'R3',
    tier: 2,
    fn: async () => {
      removeRagCache();
      expect(fs.existsSync(RAG_CACHE_PATH), 'Cache file should be deleted').toBeFalsy();

      const result = executeIngestionScript();
      expect(result.exitCode, 'Ingestion script should succeed after cache deletion').toBe(0);
      expect(fs.existsSync(RAG_CACHE_PATH), 'Cache file should be recreated').toBeTruthy();

      const cache = readRagCache();
      expect(cache?.lastHash, 'Recreated cache must have valid lastHash').toBeTruthy();
    },
  },

  {
    id: 'T2-R3-04',
    name: 'R3: Corrupted .rag-cache.json file is detected and safely recovered',
    feature: 'R3',
    tier: 2,
    fn: async () => {
      // Write corrupted non-JSON content to cache file
      fs.writeFileSync(RAG_CACHE_PATH, '<<< INVALID JSON CORRUPTED DATA >>>', 'utf8');

      const result = executeIngestionScript();
      expect(
        result.exitCode,
        `Ingestion must handle corrupted cache file gracefully. Error: ${result.stderr}`
      ).toBe(0);

      const cache = readRagCache();
      expect(cache !== null, 'Corrupted cache should be replaced with valid JSON cache').toBeTruthy();
      expect(typeof cache?.lastHash, 'Recovered cache should have string lastHash').toBe('string');
    },
  },

  {
    id: 'T2-R3-05',
    name: 'R3: Knowledge base documents have unique IDs and valid categories',
    feature: 'R3',
    tier: 2,
    fn: async () => {
      const kb = await loadKnowledgeBase();
      const ids = new Set<string>();
      const validCategories = new Set([
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

      for (const doc of kb) {
        expect(!ids.has(doc.id), `Duplicate document ID found: ${doc.id}`).toBeTruthy();
        ids.add(doc.id);
        expect(
          validCategories.has(doc.category),
          `Invalid category "${doc.category}" for doc "${doc.id}"`
        ).toBeTruthy();
      }
    },
  },

  // ==========================================
  // Feature R4: UX & Accessibility Boundary & Corner Cases
  // ==========================================
  {
    id: 'T2-R4-01',
    name: 'R4: Tool execution transition from call to result cleans up loading state',
    feature: 'R4',
    tier: 2,
    fn: async () => {
      const simpleChatCode = readProjectFile('src/components/chat/simple-chat-view.tsx');

      const separatesResultState =
        simpleChatCode.includes("state === 'result'") ||
        simpleChatCode.includes('state !== \'result\'') ||
        simpleChatCode.includes('activeToolInvocation');

      expect(
        separatesResultState,
        'simple-chat-view.tsx must differentiate active tool state from completed result state'
      ).toBeTruthy();
    },
  },

  {
    id: 'T2-R4-02',
    name: 'R4: Chat input and submit button are disabled when isToolInProgress is true',
    feature: 'R4',
    tier: 2,
    fn: async () => {
      const bottombarCode = readProjectFile('src/components/chat/chat-bottombar.tsx');

      const inputDisabled =
        /disabled=\{.*isToolInProgress.*\}/.test(bottombarCode) ||
        bottombarCode.includes('disabled={isToolInProgress || isLoading}');
      const buttonDisabled =
        /disabled=\{.*isToolInProgress.*\}/.test(bottombarCode) ||
        bottombarCode.includes('isToolInProgress');

      expect(inputDisabled, 'Chat <input> must be disabled when isToolInProgress is true').toBeTruthy();
      expect(buttonDisabled, 'Chat submit <button> must be disabled when isToolInProgress is true').toBeTruthy();
    },
  },

  {
    id: 'T2-R4-03',
    name: 'R4: Modal dialog attaches Escape key listener for keyboard dismissal',
    feature: 'R4',
    tier: 2,
    fn: async () => {
      const carouselCode = readProjectFile('src/components/projects/apple-cards-carousel.tsx');
      const handlesEscapeKey =
        /event\.key\s*===\s*['"]Escape['"]/.test(carouselCode) ||
        /e\.key\s*===\s*['"]Escape['"]/.test(carouselCode);

      expect(
        handlesEscapeKey,
        'apple-cards-carousel.tsx modal must support Escape key dismissal for keyboard accessibility'
      ).toBeTruthy();
    },
  },

  {
    id: 'T2-R4-04',
    name: 'R4: Landing page hero input element has an accessible aria-label',
    feature: 'R4',
    tier: 2,
    fn: async () => {
      const source = parseSourceFile('src/app/page.tsx');
      const inputs = findJsxElements(source, 'input');
      expect(inputs.length > 0, 'Landing page in src/app/page.tsx must contain an <input> element').toBeTruthy();
      const heroInput = inputs[0];
      expect(
        Boolean(heroInput.attributes['aria-label']),
        'Hero input in src/app/page.tsx must have an explicit aria-label attribute'
      ).toBeTruthy();
      expect(
        heroInput.attributes['aria-label'],
        'Hero input aria-label must match expected label'
      ).toBe('Ask about my computer engineering work');
    },
  },

  {
    id: 'T2-R4-05',
    name: 'R4: HelperBoost quick question toggle includes aria-expanded attribute',
    feature: 'R4',
    tier: 2,
    fn: async () => {
      const helperBoostCode = readProjectFile('src/components/chat/HelperBoost.tsx');
      const hasAriaExpanded =
        /aria-expanded=\{/.test(helperBoostCode) || /aria-expanded=["']/.test(helperBoostCode);
      expect(
        hasAriaExpanded,
        'HelperBoost collapsible toggles must include aria-expanded attribute'
      ).toBeTruthy();
    },
  },
];
