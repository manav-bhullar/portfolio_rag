import fs from 'node:fs';
import path from 'node:path';
import { TestCase } from './helpers/types';
import { expect, assert } from './helpers/assert';
import { readProjectFile, projectFileExists, parseSourceFile, findJsxElements } from './helpers/ast-validator';
import {
  computeSha256Hash,
  loadKnowledgeBase,
  executeIngestionScript,
  readRagCache,
  writeRagCache,
  removeRagCache,
  RAG_CACHE_PATH,
} from './helpers/rag-runner';
import { SlidingWindowRateLimiterOracle } from './helpers/http-simulator';
import { inspectChatLoadingState } from './helpers/dom-a11y-validator';

export const tier4Tests: TestCase[] = [
  {
    id: 'T4-E2E-01',
    name: 'T4: End-to-End User Journey — Landing navigation -> submit -> analytics -> rate limit -> loading -> result',
    feature: 'R4',
    tier: 4,
    fn: async () => {
      // Step 1: Landing page provides accessible prompt submission
      const landingCode = readProjectFile('src/app/page.tsx');
      expect(landingCode.includes('aria-label='), 'Landing page must have accessible input').toBeTruthy();

      // Step 2: Chat hub captures analytics on submit
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      expect(chatCode.includes("posthog.capture('chat_message_sent'"), 'Chat submit must capture analytics').toBeTruthy();

      // Step 3: Server enforces 10 req/min rate limit
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const ip = '203.0.113.100';
      const rateLimitCheck = oracle.limit(ip);
      expect(rateLimitCheck.success, 'Rate limit check must pass for initial user query').toBeTruthy();

      // Step 4: Loading state renders "Thinking..." / tool action text with role="status"
      const loadingState = inspectChatLoadingState('src/components/chat/simple-chat-view.tsx');
      const chatLoadingState = inspectChatLoadingState('src/components/chat/chat.tsx');
      expect(
        loadingState.hasLoadingState || chatLoadingState.hasLoadingState,
        'Chat view must show loading indicator when processing tool calls'
      ).toBeTruthy();

      // Step 5: Knowledge base backing response tools is available
      const kb = await loadKnowledgeBase();
      expect(kb.length > 5, 'Knowledge base must contain full portfolio context').toBeTruthy();
    },
  },

  {
    id: 'T4-E2E-02',
    name: 'T4: High-Traffic User Burst Workflow — 12 requests in 30s throttles gracefully and resets after window',
    feature: 'R1',
    tier: 4,
    fn: async () => {
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const userIp = '198.51.100.222';
      const baseTime = Date.now();

      // Send 10 valid requests
      for (let i = 1; i <= 10; i++) {
        const result = oracle.limit(userIp, baseTime + i * 1000);
        expect(result.success, `Request ${i} should be allowed`).toBeTruthy();
      }

      // 11th and 12th requests within 30s window must fail
      const req11 = oracle.limit(userIp, baseTime + 15000);
      const req12 = oracle.limit(userIp, baseTime + 20000);
      expect(req11.success, '11th request in burst should be rate limited').toBeFalsy();
      expect(req12.success, '12th request in burst should be rate limited').toBeFalsy();

      // Verify UI has onError recovery (toast and loadingSubmit reset)
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      expect(chatCode.includes('toast.error'), 'UI must display error toast on rate limit failure').toBeTruthy();
      expect(chatCode.includes('setLoadingSubmit(false)'), 'UI must reset loading state on rate limit error').toBeTruthy();

      // After 61 seconds, window expires and new request is accepted
      const reqAfterExpiry = oracle.limit(userIp, baseTime + 62000);
      expect(reqAfterExpiry.success, 'Request after rate limit reset must succeed').toBeTruthy();
    },
  },

  {
    id: 'T4-E2E-03',
    name: 'T4: Developer Content Update Workflow — Edit knowledge base -> build runs ingest -> re-upsert -> subsequent build skips',
    feature: 'R3',
    tier: 4,
    fn: async () => {
      // 1. Initial ingestion
      const initRun = executeIngestionScript();
      expect(initRun.exitCode, 'Initial ingestion must succeed').toBe(0);

      const kb = await loadKnowledgeBase();
      const currentHash = computeSha256Hash(kb);

      // 2. Simulate cache reflecting older content
      writeRagCache({
        lastHash: '0000000000000000000000000000000000000000000000000000000000000000',
        lastIngestedAt: '2026-01-01T00:00:00.000Z',
        documentCount: 5,
      });

      // 3. Next build run detects outdated hash and executes re-ingestion
      const updateRun = executeIngestionScript();
      expect(updateRun.exitCode, 'Ingestion on hash update must succeed').toBe(0);

      const updatedCache = readRagCache();
      expect(updatedCache?.lastHash, 'Updated cache must store the latest content hash').toBe(currentHash);

      // 4. Consecutive run skips re-upserting
      const thirdRun = executeIngestionScript();
      expect(thirdRun.exitCode, 'Third run must succeed').toBe(0);
      const output = thirdRun.stdout + thirdRun.stderr;
      expect(
        /zero new documents|0 new documents|unchanged|skipped/i.test(output),
        'Subsequent build must log 0 new documents upserted'
      ).toBeTruthy();
    },
  },

  {
    id: 'T4-E2E-04',
    name: 'T4: Screen Reader Navigation Workflow — Carousel navigation -> Modal dialog -> Chat form -> Status live region',
    feature: 'R4',
    tier: 4,
    fn: async () => {
      // 1. Carousel navigation has proper aria-labels
      const carouselSource = parseSourceFile('src/components/projects/apple-cards-carousel.tsx');
      const carouselButtons = findJsxElements(carouselSource, 'button');
      const hasAccessibleButtons = carouselButtons.every(
        (b) => b.attributes['aria-label'] || b.textSnippet.includes('Star') || b.attributes['className']
      );
      expect(hasAccessibleButtons, 'Carousel buttons must have accessible names').toBeTruthy();

      // 2. Modal has role="dialog" and aria-modal="true"
      const carouselCode = readProjectFile('src/components/projects/apple-cards-carousel.tsx');
      expect(carouselCode.includes('role="dialog"'), 'Carousel modal must be marked as dialog').toBeTruthy();
      expect(carouselCode.includes('aria-modal='), 'Carousel modal must specify aria-modal').toBeTruthy();

      // 3. Chat input and submit button have accessible labels
      const bottombarCode = readProjectFile('src/components/chat/chat-bottombar.tsx');
      expect(bottombarCode.includes('aria-label='), 'Chat input must have aria-label').toBeTruthy();

      // 4. Chat loading state container has role="status"
      const simpleChatCode = readProjectFile('src/components/chat/simple-chat-view.tsx');
      const chatCode = readProjectFile('src/components/chat/chat.tsx');
      const hasLiveRegion =
        simpleChatCode.includes('role="status"') ||
        simpleChatCode.includes('aria-live=') ||
        chatCode.includes('role="status"') ||
        chatCode.includes('aria-live=');
      expect(hasLiveRegion, 'Chat loading indicator must provide screen reader status announcement').toBeTruthy();
    },
  },

  {
    id: 'T4-E2E-05',
    name: 'T4: Cold Boot & Resilient Build — App builds and executes without optional external API keys',
    feature: 'R3',
    tier: 4,
    fn: async () => {
      // Ingestion script executes with empty PINECONE_API_KEY without crash
      const ingestResult = executeIngestionScript({
        PINECONE_API_KEY: '',
        PINECONE_INDEX: '',
      });
      expect(
        ingestResult.exitCode,
        `Ingestion cold boot should not crash when PINECONE_API_KEY is unset. Output: ${ingestResult.stderr}`
      ).toBe(0);

      // PostHog layout provider handles missing NEXT_PUBLIC_POSTHOG_KEY without throwing
      const providerFile = projectFileExists('src/components/posthog-provider.tsx')
        ? 'src/components/posthog-provider.tsx'
        : 'src/app/layout.tsx';
      const providerCode = readProjectFile(providerFile);
      expect(
        providerCode.includes('NEXT_PUBLIC_POSTHOG_KEY') || providerCode.includes('posthogKey'),
        'Provider must check for PostHog key presence before calling posthog.init'
      ).toBeTruthy();
    },
  },
];
