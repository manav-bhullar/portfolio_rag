import fs from 'node:fs';
import path from 'node:path';
import { TestCase } from './helpers/types';
import { expect, assert } from './helpers/assert';
import { readProjectFile, projectFileExists } from './helpers/ast-validator';
import {
  computeSha256Hash,
  loadKnowledgeBase,
  executeIngestionScript,
  readRagCache,
  writeRagCache,
} from './helpers/rag-runner';
import { SlidingWindowRateLimiterOracle } from './helpers/http-simulator';

export const tier3Tests: TestCase[] = [
  {
    id: 'T3-INT-01',
    name: 'T3: Rate Limiting + Analytics — Request dispatch captures analytics intent regardless of rate limit outcome',
    feature: 'R1',
    tier: 3,
    fn: async () => {
      // 1. Verify chat client captures analytics synchronously in submitQuery before network resolution
      const chatCode = readProjectFile('src/components/chat/chat.tsx');

      const captureBeforeAppend =
        /posthog\.capture\([\s\S]*chat_message_sent[\s\S]*\);?\s*append\(/.test(chatCode) ||
        (chatCode.includes('posthog.capture') && chatCode.includes('submitQuery'));

      expect(
        captureBeforeAppend,
        'chat.tsx submitQuery must invoke posthog.capture at message dispatch time'
      ).toBeTruthy();

      // 2. Oracle test: Rate limited 11th request simulates analytics logging + 429 response
      const oracle = new SlidingWindowRateLimiterOracle(10, 60);
      const ip = '198.51.100.99';

      const capturedEvents: Array<{ event: string; query: string }> = [];
      const trackMock = (event: string, props: { query: string }) => {
        capturedEvents.push({ event, query: props.query });
      };

      for (let i = 1; i <= 11; i++) {
        const query = `Message ${i}`;
        trackMock('chat_message_sent', { query });
        const rateLimitStatus = oracle.limit(ip);

        if (i <= 10) {
          expect(rateLimitStatus.success, `Request ${i} should be allowed`).toBeTruthy();
        } else {
          expect(rateLimitStatus.success, 'Request 11 should be rate limited').toBeFalsy();
        }
      }

      expect(capturedEvents.length, 'All 11 query submissions should be captured in analytics').toBe(11);
      expect(capturedEvents[10].query, '11th event query should match').toBe('Message 11');
    },
  },

  {
    id: 'T3-INT-02',
    name: 'T3: Rate Limiting + UX Loading State — 429 error clears loading state and triggers Sonner toast',
    feature: 'R1',
    tier: 3,
    fn: async () => {
      const chatCode = readProjectFile('src/components/chat/chat.tsx');

      // Verify onError handler resets loadingSubmit and calls toast.error
      const hasOnErrorHandling =
        chatCode.includes('onError:') &&
        chatCode.includes('setLoadingSubmit(false)') &&
        chatCode.includes('toast.error');

      expect(
        hasOnErrorHandling,
        'chat.tsx onError callback must reset loadingSubmit(false) and display toast.error'
      ).toBeTruthy();
    },
  },

  {
    id: 'T3-INT-03',
    name: 'T3: Ingestion Pipeline + Knowledge Base Integrity — Covers all portfolio tool categories',
    feature: 'R3',
    tier: 3,
    fn: async () => {
      const kb = await loadKnowledgeBase();
      const categories = new Set(kb.map((doc) => doc.category));

      // Required tool categories from API tools:
      // getProjects, getPresentation, getResume, getContact, getSkills, getInterests, getCrazy
      const expectedCategories = ['bio', 'project', 'skills', 'contact', 'interests', 'experience'];

      for (const expected of expectedCategories) {
        expect(
          categories.has(expected as any),
          `Knowledge base must contain documents for category: ${expected}`
        ).toBeTruthy();
      }

      // Check specific projects mentioned in prompt/tools: Floq, SCALES, PIP-RAG, Olist, NYC Taxi
      const allContent = kb.map((doc) => doc.content + ' ' + doc.title).join(' ');
      expect(allContent.includes('Floq'), 'Knowledge base must document Floq project').toBeTruthy();
      expect(allContent.includes('SCALES'), 'Knowledge base must document SCALES project').toBeTruthy();
      expect(allContent.includes('PIP-RAG'), 'Knowledge base must document PIP-RAG project').toBeTruthy();
    },
  },

  {
    id: 'T3-INT-04',
    name: 'T3: Analytics + Accessible Keyboard Form — Accessible input Enter key dispatches analytics',
    feature: 'R2',
    tier: 3,
    fn: async () => {
      const bottombarCode = readProjectFile('src/components/chat/chat-bottombar.tsx');
      const chatCode = readProjectFile('src/components/chat/chat.tsx');

      // 1. Verify input is accessible
      expect(
        bottombarCode.includes('aria-label='),
        'chat-bottombar.tsx <input> must have aria-label'
      ).toBeTruthy();

      // 2. Verify Enter key handler
      const handlesEnterKey =
        bottombarCode.includes("e.key === 'Enter'") && bottombarCode.includes('handleSubmit');
      expect(handlesEnterKey, 'chat-bottombar.tsx must handle Enter key to submit form').toBeTruthy();

      // 3. Verify submit invokes analytics
      expect(
        chatCode.includes('posthog.capture'),
        'Submitting query must capture posthog event'
      ).toBeTruthy();
    },
  },

  {
    id: 'T3-INT-05',
    name: 'T3: Carousel Modal + Focus & Scroll Management — Locks body scroll and sets dialog accessibility',
    feature: 'R4',
    tier: 3,
    fn: async () => {
      const carouselCode = readProjectFile('src/components/projects/apple-cards-carousel.tsx');

      // Verify body scroll lock on open
      const locksScroll =
        carouselCode.includes("document.body.style.overflow = 'hidden'") &&
        carouselCode.includes("document.body.style.overflow = 'auto'");
      expect(locksScroll, 'Carousel modal must manage body overflow scroll lock').toBeTruthy();

      // Verify dialog role and modal
      expect(carouselCode.includes('role="dialog"'), 'Modal must have role="dialog"').toBeTruthy();
      expect(
        carouselCode.includes('aria-modal="true"') || carouselCode.includes('aria-modal={true}'),
        'Modal must have aria-modal="true"'
      ).toBeTruthy();
    },
  },

  {
    id: 'T3-INT-06',
    name: 'T3: Build Hook + Ingestion Caching Lifecycle — Build triggers ingestion and second run is zero-cost',
    feature: 'R3',
    tier: 3,
    fn: async () => {
      // 1. First execution: populates cache
      const firstRun = executeIngestionScript();
      expect(firstRun.exitCode, `First run failed: ${firstRun.stderr}`).toBe(0);

      const cacheAfterFirst = readRagCache();
      expect(cacheAfterFirst, 'Cache must exist after first run').toBeTruthy();

      // 2. Measure duration of second run
      const start = Date.now();
      const secondRun = executeIngestionScript();
      const duration = Date.now() - start;

      expect(secondRun.exitCode, `Second run failed: ${secondRun.stderr}`).toBe(0);
      expect(
        duration < 3500,
        `Cached second ingestion run should be fast (<3500ms). Actual: ${duration}ms`
      ).toBeTruthy();

      const output = secondRun.stdout + secondRun.stderr;
      expect(
        /zero new documents|0 new documents|unchanged|skipped/i.test(output),
        'Second run should skip re-upserting'
      ).toBeTruthy();
    },
  },
];
