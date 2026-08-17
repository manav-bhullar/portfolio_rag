import fs from 'node:fs';
import path from 'node:path';
import { TestCase } from './helpers/types';
import { expect, assert } from './helpers/assert';
import {
  parseSourceFile,
  findMethodCalls,
  findJsxElements,
  getPackageJson,
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
} from './helpers/rag-runner';
import {
  SlidingWindowRateLimiterOracle,
  createChatRequest,
  invokeChatRoute,
  parseRateLimitHeaders,
} from './helpers/http-simulator';
import { inspectChatLoadingState } from './helpers/dom-a11y-validator';

export const tier1Tests: TestCase[] = [
  // ==========================================
  // Feature R1: Rate Limiting
  // ==========================================
  {
    id: 'T1-R1-01',
    name: 'R1: Rate Limiter allows request under 10 req/min limit',
    feature: 'R1',
    tier: 1,
    fn: async () => {
      // 1. Verify dependencies in package.json
      const pkg = getPackageJson();
      const hasUpstashRatelimit = Boolean(
        pkg.dependencies?.['@upstash/ratelimit'] || pkg.devDependencies?.['@upstash/ratelimit']
      );
      const hasUpstashRedis = Boolean(
        pkg.dependencies?.['@upstash/redis'] || pkg.devDependencies?.['@upstash/redis']
      );
      expect(hasUpstashRatelimit, 'package.json must declare @upstash/ratelimit dependency').toBeTruthy();
      expect(hasUpstashRedis, 'package.json must declare @upstash/redis dependency').toBeTruthy();

      // 2. Verify route implementation inspects IP and integrates ratelimit
      const routeCode = readProjectFile('src/app/api/chat/route.ts');
      const hasRatelimitLogic =
        routeCode.includes('ratelimit') ||
        routeCode.includes('Ratelimit') ||
        projectFileExists('src/lib/ratelimit.ts');
      expect(hasRatelimitLogic, 'src/app/api/chat/route.ts must integrate rate limiting').toBeTruthy();

      // 3. Verify oracle behavior: first request under limit passes
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const result = oracle.limit('192.0.2.1');
      expect(result.success, 'First request for client IP must succeed').toBeTruthy();
      expect(result.remaining, 'Remaining quota should be 9').toBe(9);

      // 4. Verify actual route handler invocation under limit
      const req = createChatRequest({
        ip: '192.0.2.101',
        messages: [{ role: 'user', content: 'Hello portfolio' }],
      });
      const res = await invokeChatRoute(req);
      expect(res.status !== 429, 'Route invocation under rate limit must not return 429').toBeTruthy();
      const headers = parseRateLimitHeaders(res);
      expect(headers.limit, 'Response should contain rate limit header with limit 10').toBe('10');
    },
  },

  {
    id: 'T1-R1-02',
    name: 'R1: Rate Limiter permits 10th request at the limit boundary',
    feature: 'R1',
    tier: 1,
    fn: async () => {
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const ip = '192.0.2.2';

      let lastResult: any;
      for (let i = 1; i <= 10; i++) {
        lastResult = oracle.limit(ip);
        expect(lastResult.success, `Request ${i} of 10 should succeed`).toBeTruthy();
      }
      expect(lastResult.remaining, 'Remaining quota after 10th request must be 0').toBe(0);

      // Verify route code configures 10 requests per minute
      const routeOrLibCode = projectFileExists('src/lib/ratelimit.ts')
        ? readProjectFile('src/lib/ratelimit.ts')
        : readProjectFile('src/app/api/chat/route.ts');

      const configures10PerMinute =
        /10\s*,\s*['"](60\s*s|1\s*m|60s|1m)['"]/.test(routeOrLibCode) ||
        /slidingWindow\(\s*10\s*,/.test(routeOrLibCode) ||
        /10\s*req/i.test(routeOrLibCode);
      expect(configures10PerMinute, 'Rate limiter configuration must specify 10 requests per minute').toBeTruthy();

      // Verify actual route handler permits 10th request at boundary
      const boundaryIp = '192.0.2.102';
      for (let i = 1; i <= 10; i++) {
        const req = createChatRequest({
          ip: boundaryIp,
          messages: [{ role: 'user', content: `Message ${i}` }],
        });
        const res = await invokeChatRoute(req);
        expect(res.status !== 429, `Request ${i} of 10 must not be rejected with 429`).toBeTruthy();
      }
    },
  },

  {
    id: 'T1-R1-03',
    name: 'R1: 11th request breaches rate limit and returns HTTP 429 status code',
    feature: 'R1',
    tier: 1,
    fn: async () => {
      const routeCode = readProjectFile('src/app/api/chat/route.ts');
      const returns429 = /status:\s*429/.test(routeCode) || /new\s+Response\(.*,\s*{\s*status:\s*429/.test(routeCode);
      expect(returns429, 'src/app/api/chat/route.ts must return HTTP status 429 when rate limit is exceeded').toBeTruthy();

      // Verify oracle rejects 11th request
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const ip = '192.0.2.3';
      for (let i = 0; i < 10; i++) {
        oracle.limit(ip);
      }
      const breachResult = oracle.limit(ip);
      expect(breachResult.success, '11th request must be rejected (success=false)').toBeFalsy();

      // Verify actual route handler returns HTTP 429 on 11th request
      const routeIp = '192.0.2.103';
      for (let i = 1; i <= 10; i++) {
        const req = createChatRequest({ ip: routeIp });
        await invokeChatRoute(req);
      }
      const req11 = createChatRequest({ ip: routeIp });
      const res11 = await invokeChatRoute(req11);
      expect(res11.status, '11th request to route handler must return HTTP 429').toBe(429);

      const body = await res11.json();
      expect(body.error, '429 response body must contain rate limit error message').toBeTruthy();
    },
  },

  {
    id: 'T1-R1-04',
    name: 'R1: Rate limit 429 response includes standard rate limit headers',
    feature: 'R1',
    tier: 1,
    fn: async () => {
      const routeCode = readProjectFile('src/app/api/chat/route.ts');
      const hasRetryAfter = /Retry-After/i.test(routeCode);
      const hasRateLimitLimit = /X-RateLimit-Limit/i.test(routeCode);
      const hasRateLimitRemaining = /X-RateLimit-Remaining/i.test(routeCode);

      expect(hasRetryAfter, '429 response must provide Retry-After header').toBeTruthy();
      expect(hasRateLimitLimit, '429 response must provide X-RateLimit-Limit header').toBeTruthy();
      expect(hasRateLimitRemaining, '429 response must provide X-RateLimit-Remaining header').toBeTruthy();

      // Verify actual route handler returns headers on 429 response
      const headerIp = '192.0.2.104';
      for (let i = 0; i < 10; i++) {
        await invokeChatRoute(createChatRequest({ ip: headerIp }));
      }
      const res429 = await invokeChatRoute(createChatRequest({ ip: headerIp }));
      expect(res429.status, 'Should return 429').toBe(429);

      const headers = parseRateLimitHeaders(res429);
      expect(headers.retryAfter !== null, '429 response must provide Retry-After header').toBeTruthy();
      expect(headers.limit, '429 response must provide X-RateLimit-Limit header').toBe('10');
      expect(headers.remaining, '429 response must provide X-RateLimit-Remaining: 0').toBe('0');
      expect(headers.reset !== null, '429 response must provide X-RateLimit-Reset header').toBeTruthy();
    },
  },

  {
    id: 'T1-R1-05',
    name: 'R1: IP isolation guarantees independent rate limit windows per client IP',
    feature: 'R1',
    tier: 1,
    fn: async () => {
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const clientA = '198.51.100.10';
      const clientB = '198.51.100.20';

      // Exhaust client A
      for (let i = 0; i < 10; i++) {
        oracle.limit(clientA);
      }
      expect(oracle.limit(clientA).success, 'Client A 11th request should be blocked').toBeFalsy();

      // Client B should be unaffected
      const clientBResult = oracle.limit(clientB);
      expect(clientBResult.success, 'Client B first request must succeed regardless of Client A').toBeTruthy();
      expect(clientBResult.remaining, 'Client B should have 9 remaining requests').toBe(9);

      // Verify actual route handler isolates distinct client IPs
      const routeClientA = '198.51.100.110';
      const routeClientB = '198.51.100.120';

      for (let i = 0; i < 10; i++) {
        await invokeChatRoute(createChatRequest({ ip: routeClientA }));
      }
      const blockedResA = await invokeChatRoute(createChatRequest({ ip: routeClientA }));
      expect(blockedResA.status, 'Client A 11th request must be rate limited with 429').toBe(429);

      const freshResB = await invokeChatRoute(createChatRequest({ ip: routeClientB }));
      expect(freshResB.status !== 429, 'Client B request must not be blocked by Client A quota').toBeTruthy();
    },
  },

  // ==========================================
  // Feature R2: Analytics
  // ==========================================
  {
    id: 'T1-R2-01',
    name: 'R2: PostHog provider / client is initialized at the app layout level',
    feature: 'R2',
    tier: 1,
    fn: async () => {
      const pkg = getPackageJson();
      const hasPosthogJs = Boolean(pkg.dependencies?.['posthog-js'] || pkg.devDependencies?.['posthog-js']);
      expect(hasPosthogJs, 'package.json must declare posthog-js dependency').toBeTruthy();

      const layoutCode = readProjectFile('src/app/layout.tsx');
      const hasProvider =
        layoutCode.includes('PostHogProvider') ||
        layoutCode.includes('posthog') ||
        projectFileExists('src/components/posthog-provider.tsx');

      expect(hasProvider, 'App layout or posthog-provider must configure PostHog').toBeTruthy();

      if (projectFileExists('src/components/posthog-provider.tsx')) {
        const providerCode = readProjectFile('src/components/posthog-provider.tsx');
        expect(providerCode.includes('posthog.init'), 'posthog-provider must call posthog.init').toBeTruthy();
      }
    },
  },

  {
    id: 'T1-R2-02',
    name: 'R2: Custom analytics event is named chat_message_sent with { query } payload',
    feature: 'R2',
    tier: 1,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const capturesChatMessageSent =
        chatCode.includes("'chat_message_sent'") || chatCode.includes('"chat_message_sent"');
      expect(
        capturesChatMessageSent,
        'src/components/chat/chat.tsx must capture "chat_message_sent" event'
      ).toBeTruthy();

      const capturesQueryProperty =
        /posthog\.capture\(\s*['"]chat_message_sent['"]\s*,\s*\{\s*query/m.test(chatCode);
      expect(
        capturesQueryProperty,
        'chat_message_sent event payload must include { query: ... } property'
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R2-03',
    name: 'R2: submitQuery in chat.tsx triggers posthog.capture',
    feature: 'R2',
    tier: 1,
    fn: async () => {
      const source = parseSourceFile('src/components/chat/chat.tsx');
      const calls = findMethodCalls(source, 'posthog', 'capture');
      expect(calls.length > 0, 'posthog.capture must be called in src/components/chat/chat.tsx').toBeTruthy();
    },
  },

  {
    id: 'T1-R2-04',
    name: 'R2: Landing page submissions route through chat analytics capture',
    feature: 'R2',
    tier: 1,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const landingPropPassesSubmitQuery =
        /ChatLanding[^>]*submitQuery=\{submitQuery\}/.test(chatCode) ||
        /ChatLanding[^>]*submitQuery/.test(chatCode);
      expect(
        landingPropPassesSubmitQuery,
        'ChatLanding component must receive submitQuery to track analytics on prompt selection'
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R2-05',
    name: 'R2: URL query param auto-submission captures analytics event',
    feature: 'R2',
    tier: 1,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const autoSubmitTriggersSubmitQuery =
        /submitQuery\(initialQuery\)/.test(chatCode) ||
        /submitQuery\(\s*initialQuery\s*\)/.test(chatCode);
      expect(
        autoSubmitTriggersSubmitQuery,
        'Auto-submitted initial query from URL search params must invoke submitQuery'
      ).toBeTruthy();
    },
  },

  // ==========================================
  // Feature R3: Automated RAG Ingestion Pipeline
  // ==========================================
  {
    id: 'T1-R3-01',
    name: 'R3: src/lib/rag/knowledge-base.ts exports structured KnowledgeDocument array',
    feature: 'R3',
    tier: 1,
    fn: async () => {
      expect(
        projectFileExists('src/lib/rag/knowledge-base.ts'),
        'src/lib/rag/knowledge-base.ts must exist'
      ).toBeTruthy();

      const kb = await loadKnowledgeBase();
      expect(Array.isArray(kb), 'Knowledge base must export an array').toBeTruthy();
      expect(kb.length > 0, 'Knowledge base must contain documents').toBeTruthy();

      for (const doc of kb) {
        expect(typeof doc.id, `Document ID missing or invalid: ${JSON.stringify(doc)}`).toBe('string');
        expect(typeof doc.title, `Document title missing or invalid: ${doc.id}`).toBe('string');
        expect(typeof doc.category, `Document category missing or invalid: ${doc.id}`).toBe('string');
        expect(typeof doc.content, `Document content missing or invalid: ${doc.id}`).toBe('string');
        expect(doc.content.length > 10, `Document content too short: ${doc.id}`).toBeTruthy();
      }
    },
  },

  {
    id: 'T1-R3-02',
    name: 'R3: Ingestion script calculates SHA-256 hash of knowledge base content',
    feature: 'R3',
    tier: 1,
    fn: async () => {
      expect(projectFileExists('scripts/ingest.ts'), 'scripts/ingest.ts must exist').toBeTruthy();
      const kb = await loadKnowledgeBase();
      const expectedHash = computeSha256Hash(kb);

      expect(typeof expectedHash, 'Computed hash must be a string').toBe('string');
      expect(expectedHash.length, 'SHA-256 hex digest must be exactly 64 characters').toBe(64);

      const ingestCode = readProjectFile('scripts/ingest.ts');
      expect(
        ingestCode.includes('sha256') || ingestCode.includes('createHash'),
        'scripts/ingest.ts must use sha256 hash algorithm'
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R3-03',
    name: 'R3: Ingestion script creates .rag-cache.json containing lastHash',
    feature: 'R3',
    tier: 1,
    fn: async () => {
      removeRagCache();
      const result = executeIngestionScript();
      expect(result.exitCode, `scripts/ingest.ts failed with error: ${result.stderr}`).toBe(0);

      const cache = readRagCache();
      expect(cache, '.rag-cache.json must be created after ingestion').toBeTruthy();
      expect(typeof cache?.lastHash, 'Cache must contain string lastHash property').toBe('string');
      expect(cache?.lastHash.length, 'lastHash must be a 64-char SHA-256 hex string').toBe(64);
    },
  },

  {
    id: 'T1-R3-04',
    name: 'R3: Second consecutive ingestion run logs zero new documents upserted',
    feature: 'R3',
    tier: 1,
    fn: async () => {
      // Run 1: Populate cache
      executeIngestionScript();

      // Run 2: Should be idempotent and skip upsert
      const secondRun = executeIngestionScript();
      expect(secondRun.exitCode, `Second ingestion run failed: ${secondRun.stderr}`).toBe(0);

      const output = secondRun.stdout + secondRun.stderr;
      const logsZeroDocs =
        /zero new documents were upserted/i.test(output) ||
        /0 new documents/i.test(output) ||
        /content unchanged/i.test(output) ||
        /skipped/i.test(output);

      expect(
        logsZeroDocs,
        `Second run output must indicate zero documents upserted due to hash check. Output: ${output}`
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R3-05',
    name: 'R3: package.json build script triggers ingestion prior to Next.js build',
    feature: 'R3',
    tier: 1,
    fn: async () => {
      const pkg = getPackageJson();
      const buildScript = pkg.scripts?.build || '';

      const runsIngestion =
        buildScript.includes('ingest') ||
        buildScript.includes('scripts/ingest.ts') ||
        (pkg.scripts?.ingest && buildScript.startsWith('npm run ingest'));

      expect(
        runsIngestion,
        `package.json build script ("${buildScript}") must run ingestion before next build`
      ).toBeTruthy();
    },
  },

  // ==========================================
  // Feature R4: UX & Accessibility
  // ==========================================
  {
    id: 'T1-R4-01',
    name: 'R4: Active tool execution displays "Thinking..." / loading state with role="status"',
    feature: 'R4',
    tier: 1,
    fn: async () => {
      const simpleChatInspection = inspectChatLoadingState('src/components/chat/simple-chat-view.tsx');
      const chatInspection = inspectChatLoadingState('src/components/chat/chat.tsx');

      const hasLoadingIndicator = simpleChatInspection.hasLoadingState || chatInspection.hasLoadingState;
      const hasRoleStatus = simpleChatInspection.hasRoleStatus || chatInspection.hasRoleStatus;

      expect(
        hasLoadingIndicator,
        'Chat interface must render a loading state during active tool calls (state !== "result")'
      ).toBeTruthy();
      expect(
        hasRoleStatus,
        'Tool execution loading state container must have role="status" or aria-live for screen readers'
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R4-02',
    name: 'R4: Chat bottombar input element has an explicit aria-label',
    feature: 'R4',
    tier: 1,
    fn: async () => {
      const source = parseSourceFile('src/components/chat/chat-bottombar.tsx');
      const inputs = findJsxElements(source, 'input');
      expect(inputs.length > 0, 'chat-bottombar.tsx must contain <input> element').toBeTruthy();

      const chatInput = inputs[0];
      const ariaLabel = chatInput.attributes['aria-label'];
      expect(
        Boolean(ariaLabel),
        'Chat bottombar <input> must have an explicit aria-label attribute'
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R4-03',
    name: 'R4: Chat submit button has an explicit aria-label',
    feature: 'R4',
    tier: 1,
    fn: async () => {
      const source = parseSourceFile('src/components/chat/chat-bottombar.tsx');
      const buttons = findJsxElements(source, 'button');
      expect(buttons.length > 0, 'chat-bottombar.tsx must contain <button> element').toBeTruthy();

      const submitBtn = buttons.find((b) => b.attributes.type === 'submit') || buttons[0];
      const ariaLabel = submitBtn.attributes['aria-label'];
      expect(
        Boolean(ariaLabel),
        'Chat submit <button> must have an explicit aria-label attribute'
      ).toBeTruthy();
    },
  },

  {
    id: 'T1-R4-04',
    name: 'R4: Apple Cards Carousel scroll buttons have explicit aria-labels',
    feature: 'R4',
    tier: 1,
    fn: async () => {
      const source = parseSourceFile('src/components/projects/apple-cards-carousel.tsx');
      const buttons = findJsxElements(source, 'button');

      const scrollButtons = buttons.filter(
        (b) =>
          b.textSnippet.includes('scrollLeft') ||
          b.textSnippet.includes('scrollRight') ||
          b.textSnippet.includes('IconArrowNarrowLeft') ||
          b.textSnippet.includes('IconArrowNarrowRight')
      );

      expect(scrollButtons.length >= 2, 'Carousel must render scroll left and scroll right buttons').toBeTruthy();

      for (const btn of scrollButtons) {
        const ariaLabel = btn.attributes['aria-label'];
        expect(
          Boolean(ariaLabel),
          `Carousel scroll button missing aria-label: ${btn.textSnippet.slice(0, 80)}`
        ).toBeTruthy();
      }
    },
  },

  {
    id: 'T1-R4-05',
    name: 'R4: Carousel modal close button has aria-label and modal has role="dialog" & aria-modal="true"',
    feature: 'R4',
    tier: 1,
    fn: async () => {
      const carouselCode = readProjectFile('src/components/projects/apple-cards-carousel.tsx');

      const hasDialogRole = /role=["']dialog["']/.test(carouselCode);
      const hasAriaModal = /aria-modal=["']true["']|aria-modal=\{true\}/.test(carouselCode);
      const hasCloseAriaLabel = /aria-label=["'][^"']*close[^"']*["']/i.test(carouselCode);

      expect(hasDialogRole, 'Carousel modal container must have role="dialog"').toBeTruthy();
      expect(hasAriaModal, 'Carousel modal container must have aria-modal="true"').toBeTruthy();
      expect(hasCloseAriaLabel, 'Carousel modal close button must have descriptive aria-label').toBeTruthy();
    },
  },
];
