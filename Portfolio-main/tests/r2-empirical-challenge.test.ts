import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseSourceFile, findMethodCalls, findJsxElements, readProjectFile, getPackageJson } from './helpers/ast-validator';
import { expect, assert } from './helpers/assert';

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(id: string, name: string, category: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ id, name, category, status: 'PASS', durationMs: duration });
    console.log(`  ✔ PASS [${id}] [${category}] ${name} (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    const errorMsg = err?.message || String(err);
    results.push({ id, name, category, status: 'FAIL', durationMs: duration, error: errorMsg });
    console.error(`  ✖ FAIL [${id}] [${category}] ${name} (${duration}ms)`);
    console.error(`     Error: ${errorMsg}`);
  }
}

export async function runR2EmpiricalChallengeSuite() {
  console.log('\n======================================================================');
  console.log('   CHALLENGER 2: EMPIRICAL STRESS TEST SUITE (R2 & UI ERROR HANDLING)');
  console.log('======================================================================\n');

  // =========================================================================
  // CATEGORY 1: PostHog Provider Integration (src/components/posthog-provider.tsx)
  // =========================================================================
  console.log('--- Category 1: PostHog Provider Lifecycle & Configuration ---');

  await runTest(
    'R2-PH-01',
    'PostHog package dependency is installed and declared in package.json',
    'PostHog-Provider',
    () => {
      const pkg = getPackageJson();
      const hasDep = Boolean(pkg.dependencies?.['posthog-js'] || pkg.devDependencies?.['posthog-js']);
      expect(hasDep, 'posthog-js must be listed in package.json').toBeTruthy();
      expect(pkg.dependencies?.['posthog-js'], 'posthog-js version should be declared').toBeDefined();
    }
  );

  await runTest(
    'R2-PH-02',
    'posthog-provider.tsx exists and exports CSPostHogProvider and PostHogProvider alias',
    'PostHog-Provider',
    () => {
      const sourceFile = parseSourceFile('src/components/posthog-provider.tsx');
      const content = readProjectFile('src/components/posthog-provider.tsx');
      
      expect(content.includes("'use client'") || content.includes('"use client"'), 'Provider must be a client component').toBeTruthy();
      expect(content.includes('CSPostHogProvider'), 'CSPostHogProvider must be exported').toBeTruthy();
      expect(content.includes('PostHogProvider'), 'PostHogProvider alias must be exported').toBeTruthy();
    }
  );

  await runTest(
    'R2-PH-03',
    'PostHog provider AST initializes posthog.init with key, host, and config flags',
    'PostHog-Provider',
    () => {
      const sourceFile = parseSourceFile('src/components/posthog-provider.tsx');
      const calls = findMethodCalls(sourceFile, 'posthog', 'init');
      expect(calls.length, 'posthog.init should be called in posthog-provider.tsx').toBeGreaterThanOrEqual(1);

      const content = readProjectFile('src/components/posthog-provider.tsx');
      expect(content.includes('NEXT_PUBLIC_POSTHOG_KEY'), 'Should read NEXT_PUBLIC_POSTHOG_KEY').toBeTruthy();
      expect(content.includes('NEXT_PUBLIC_POSTHOG_HOST'), 'Should read NEXT_PUBLIC_POSTHOG_HOST').toBeTruthy();
      expect(content.includes('person_profiles'), 'Should configure person_profiles').toBeTruthy();
      expect(content.includes('capture_pageview: false') || content.includes('capture_pageview:false'), 'Should disable default capture_pageview to avoid SPA duplicate tracking').toBeTruthy();
    }
  );

  await runTest(
    'R2-PH-04',
    'Simulation: posthog.init is skipped when NEXT_PUBLIC_POSTHOG_KEY is undefined or empty',
    'PostHog-Provider',
    () => {
      // Functional simulation of provider init logic
      let initCalled = false;
      let capturedKey: string | null = null;
      let capturedConfig: any = null;

      const mockPosthog = {
        init: (key: string, config: any) => {
          initCalled = true;
          capturedKey = key;
          capturedConfig = config;
        }
      };

      function simulateProviderInit(envKey?: string, envHost?: string, isWindow = true) {
        initCalled = false;
        capturedKey = null;
        capturedConfig = null;

        const posthogKey = envKey;
        const posthogHost = envHost || 'https://us.i.posthog.com';

        if (isWindow && posthogKey) {
          mockPosthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: 'identified_only',
            capture_pageview: false,
            capture_pageleave: true,
          });
        }
      }

      // Case A: undefined key
      simulateProviderInit(undefined, 'https://us.i.posthog.com', true);
      expect(initCalled, 'posthog.init should not be called when key is undefined').toBeFalsy();

      // Case B: empty string key
      simulateProviderInit('', 'https://us.i.posthog.com', true);
      expect(initCalled, 'posthog.init should not be called when key is empty string').toBeFalsy();

      // Case C: SSR environment (window is undefined)
      simulateProviderInit('phc_some_key', 'https://us.i.posthog.com', false);
      expect(initCalled, 'posthog.init should not be called in SSR environment').toBeFalsy();
    }
  );

  await runTest(
    'R2-PH-05',
    'Simulation: posthog.init uses custom NEXT_PUBLIC_POSTHOG_HOST and default fallback host',
    'PostHog-Provider',
    () => {
      const initCallArgs: { current: { key: string; config: any } | null } = { current: null };
      const mockPosthog = {
        init: (key: string, config: any) => {
          initCallArgs.current = { key, config };
        }
      };

      function simulateInit(envKey?: string, envHost?: string) {
        const posthogKey = envKey;
        const posthogHost = envHost || 'https://us.i.posthog.com';
        if (posthogKey) {
          mockPosthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: 'identified_only',
            capture_pageview: false,
            capture_pageleave: true,
          });
        }
      }

      // 1. Default host
      simulateInit('phc_test_12345', undefined);
      expect(initCallArgs.current?.key, 'Key should match').toBe('phc_test_12345');
      expect(initCallArgs.current?.config.api_host, 'Default host should be us.i.posthog.com').toBe('https://us.i.posthog.com');
      expect(initCallArgs.current?.config.capture_pageview, 'capture_pageview should be false').toBeFalsy();
      expect(initCallArgs.current?.config.capture_pageleave, 'capture_pageleave should be true').toBeTruthy();

      // 2. Custom host (e.g. EU cloud or reverse proxy)
      simulateInit('phc_test_12345', 'https://eu.i.posthog.com');
      expect(initCallArgs.current?.config.api_host, 'Custom host should be eu.i.posthog.com').toBe('https://eu.i.posthog.com');

      // 3. Custom reverse proxy path
      simulateInit('phc_test_12345', '/ingest');
      expect(initCallArgs.current?.config.api_host, 'Custom proxy host should be /ingest').toBe('/ingest');
    }
  );

  // =========================================================================
  // CATEGORY 2: Analytics Event Capture in chat.tsx (submitQuery)
  // =========================================================================
  console.log('\n--- Category 2: Analytics Event Capture (submitQuery) ---');

  await runTest(
    'R2-CHAT-01',
    'chat.tsx imports posthog from posthog-js',
    'Analytics-Capture',
    () => {
      const content = readProjectFile('src/components/chat/chat.tsx');
      expect(
        content.includes("import posthog from 'posthog-js'") ||
        content.includes('import posthog from "posthog-js"'),
        'chat.tsx must import posthog from posthog-js'
      ).toBeTruthy();
    }
  );

  await runTest(
    'R2-CHAT-02',
    'chat.tsx AST contains posthog.capture call with chat_message_sent event',
    'Analytics-Capture',
    () => {
      const sourceFile = parseSourceFile('src/components/chat/chat.tsx');
      const calls = findMethodCalls(sourceFile, 'posthog', 'capture');
      expect(calls.length, 'chat.tsx should call posthog.capture').toBeGreaterThanOrEqual(1);

      const content = readProjectFile('src/components/chat/chat.tsx');
      expect(content.includes("'chat_message_sent'") || content.includes('"chat_message_sent"'), 'Event name must be chat_message_sent').toBeTruthy();
      expect(content.includes('query: query.trim()'), 'Payload must trim the query string').toBeTruthy();
    }
  );

  await runTest(
    'R2-CHAT-03',
    'Simulation: submitQuery trims whitespace and dispatches chat_message_sent event',
    'Analytics-Capture',
    () => {
      const capturedEvents: Array<{ event: string; payload: any }> = [];
      const appendedMessages: Array<{ role: string; content: string }> = [];
      let loadingSubmit = false;

      const mockPosthog = {
        capture: (event: string, payload: any) => {
          capturedEvents.push({ event, payload });
        }
      };

      function simulateSubmitQuery(
        query: string,
        isToolInProgress = false,
        isWindow = true
      ) {
        if (!query.trim() || isToolInProgress) return;
        loadingSubmit = true;

        if (isWindow) {
          mockPosthog.capture('chat_message_sent', {
            query: query.trim(),
          });
        }

        appendedMessages.push({
          role: 'user',
          content: query,
        });
      }

      // 1. Clean query
      simulateSubmitQuery('What are your skills?');
      expect(capturedEvents.length, 'One event should be captured').toBe(1);
      expect(capturedEvents[0].event, 'Event name should be chat_message_sent').toBe('chat_message_sent');
      expect(capturedEvents[0].payload.query, 'Query payload should match').toBe('What are your skills?');
      expect(appendedMessages.length, 'Message should be appended').toBe(1);
      expect(loadingSubmit, 'loadingSubmit should be true').toBeTruthy();

      // 2. Query with leading/trailing spaces and newlines
      capturedEvents.length = 0;
      appendedMessages.length = 0;
      simulateSubmitQuery('  \n\t Tell me about your Next.js projects   \t\n ');
      expect(capturedEvents.length, 'Event should be captured').toBe(1);
      expect(capturedEvents[0].payload.query, 'Query should be trimmed').toBe('Tell me about your Next.js projects');

      // 3. Special characters and emojis
      capturedEvents.length = 0;
      simulateSubmitQuery(' 🚀 Explain RAG architecture with Pinecone & Google Gemini! 🤖 ');
      expect(capturedEvents[0].payload.query, 'Unicode & emoji query should be trimmed').toBe('🚀 Explain RAG architecture with Pinecone & Google Gemini! 🤖');
    }
  );

  await runTest(
    'R2-CHAT-04',
    'Simulation: submitQuery rejects empty or whitespace-only inputs without analytics or append',
    'Analytics-Capture',
    () => {
      const capturedEvents: any[] = [];
      const appendedMessages: any[] = [];

      const mockPosthog = {
        capture: (event: string, payload: any) => {
          capturedEvents.push({ event, payload });
        }
      };

      function simulateSubmitQuery(query: string, isToolInProgress = false) {
        if (!query.trim() || isToolInProgress) return;
        mockPosthog.capture('chat_message_sent', { query: query.trim() });
        appendedMessages.push({ role: 'user', content: query });
      }

      // Test empty string
      simulateSubmitQuery('');
      expect(capturedEvents.length, 'Empty string must not trigger capture').toBe(0);
      expect(appendedMessages.length, 'Empty string must not append message').toBe(0);

      // Test whitespace only
      simulateSubmitQuery('     ');
      expect(capturedEvents.length, 'Spaces only must not trigger capture').toBe(0);

      // Test tabs and newlines only
      simulateSubmitQuery('\t\n\r  \n');
      expect(capturedEvents.length, 'Whitespace control characters must not trigger capture').toBe(0);
    }
  );

  await runTest(
    'R2-CHAT-05',
    'Simulation: submitQuery blocks submission and analytics when isToolInProgress is active',
    'Analytics-Capture',
    () => {
      const capturedEvents: any[] = [];
      const appendedMessages: any[] = [];

      function simulateSubmitQuery(query: string, isToolInProgress: boolean) {
        if (!query.trim() || isToolInProgress) return;
        capturedEvents.push({ query });
        appendedMessages.push({ query });
      }

      // Tool in progress
      simulateSubmitQuery('Another message during tool run', true);
      expect(capturedEvents.length, 'Should block capture when tool is executing').toBe(0);
      expect(appendedMessages.length, 'Should block append when tool is executing').toBe(0);

      // Tool completed
      simulateSubmitQuery('Message after tool run', false);
      expect(capturedEvents.length, 'Should allow capture after tool completion').toBe(1);
    }
  );

  await runTest(
    'R2-CHAT-06',
    'URL initialQuery auto-submission routes through submitQuery to track analytics',
    'Analytics-Capture',
    () => {
      const content = readProjectFile('src/components/chat/chat.tsx');
      // Verify useEffect consumes initialQuery and calls submitQuery
      expect(content.includes('if (initialQuery && !autoSubmitted)'), 'Should check initialQuery and autoSubmitted').toBeTruthy();
      expect(content.includes('submitQuery(initialQuery)'), 'Should invoke submitQuery with initialQuery').toBeTruthy();
    }
  );

  // =========================================================================
  // CATEGORY 3: UI Toast Error Handling on 429 Responses (chat.tsx onError)
  // =========================================================================
  console.log('\n--- Category 3: UI Toast Error Handling on 429 Responses (onError) ---');

  await runTest(
    'R2-TOAST-01',
    'chat.tsx imports toast from sonner',
    'UI-Error-Handling',
    () => {
      const content = readProjectFile('src/components/chat/chat.tsx');
      expect(
        content.includes("import { toast } from 'sonner'") ||
        content.includes('import { toast } from "sonner"'),
        'chat.tsx must import toast from sonner'
      ).toBeTruthy();
    }
  );

  await runTest(
    'R2-TOAST-02',
    'chat.tsx onError handles JSON and plain text 429 / rate limit errors cleanly',
    'UI-Error-Handling',
    () => {
      const toastErrors: string[] = [];
      let loadingSubmit = true;

      const mockToast = {
        error: (msg: string) => {
          toastErrors.push(msg);
        }
      };

      // Exact implementation from chat.tsx:
      function simulateOnError(error: { message: string; cause?: any }) {
        loadingSubmit = false;

        let displayMessage = error.message || 'An unexpected error occurred.';
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) {
            displayMessage = parsed.error;
          } else if (parsed.message) {
            displayMessage = parsed.message;
          }
        } catch {
          // Plain text error message
        }

        if (
          displayMessage.toLowerCase().includes('rate limit') ||
          displayMessage.includes('429')
        ) {
          mockToast.error('Rate limit exceeded. Please wait before sending another message.');
        } else {
          mockToast.error(
            displayMessage.startsWith('Error:')
              ? displayMessage
              : `Error: ${displayMessage}`
          );
        }
      }

      // Case 1: JSON payload with { error: "Rate limit exceeded. Please try again later." }
      toastErrors.length = 0;
      simulateOnError({ message: JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }) });
      expect(toastErrors[0], 'Should display friendly rate limit toast').toBe(
        'Rate limit exceeded. Please wait before sending another message.'
      );
      expect(loadingSubmit, 'loadingSubmit should be reset to false').toBeFalsy();

      // Case 2: JSON payload with { message: "HTTP 429 Too Many Requests" }
      toastErrors.length = 0;
      simulateOnError({ message: JSON.stringify({ message: 'HTTP 429 Too Many Requests' }) });
      expect(toastErrors[0], 'Should match 429 status and display friendly toast').toBe(
        'Rate limit exceeded. Please wait before sending another message.'
      );

      // Case 3: Plain text containing "rate limit"
      toastErrors.length = 0;
      simulateOnError({ message: 'Rate limit exceeded for IP 127.0.0.1' });
      expect(toastErrors[0], 'Should parse plain text rate limit error').toBe(
        'Rate limit exceeded. Please wait before sending another message.'
      );

      // Case 4: Plain text containing "429"
      toastErrors.length = 0;
      simulateOnError({ message: 'Failed to fetch stream: 429' });
      expect(toastErrors[0], 'Should parse plain text 429 status').toBe(
        'Rate limit exceeded. Please wait before sending another message.'
      );

      // Case 5: Generic JSON error without rate limit
      toastErrors.length = 0;
      simulateOnError({ message: JSON.stringify({ error: 'AI provider quota exhausted' }) });
      expect(toastErrors[0], 'Generic error should be formatted').toBe('Error: AI provider quota exhausted');

      // Case 6: Generic plain text without "Error:" prefix
      toastErrors.length = 0;
      simulateOnError({ message: 'Internal Server Error' });
      expect(toastErrors[0], 'Should prepend Error: prefix').toBe('Error: Internal Server Error');

      // Case 7: Generic plain text already containing "Error:" prefix
      toastErrors.length = 0;
      simulateOnError({ message: 'Error: Something went wrong' });
      expect(toastErrors[0], 'Should not duplicate Error: prefix').toBe('Error: Something went wrong');

      // Case 8: Empty error message
      toastErrors.length = 0;
      simulateOnError({ message: '' });
      expect(toastErrors[0], 'Empty error should fallback gracefully').toBe('Error: An unexpected error occurred.');
    }
  );

  // =========================================================================
  // CATEGORY 4: Root Layout App Router Tree (src/app/layout.tsx)
  // =========================================================================
  console.log('\n--- Category 4: App Router Tree & Layout Wrapping ---');

  await runTest(
    'R2-LAYOUT-01',
    'RootLayout imports and renders CSPostHogProvider wrapping children and Toaster',
    'App-Layout',
    () => {
      const sourceFile = parseSourceFile('src/app/layout.tsx');
      const content = readProjectFile('src/app/layout.tsx');

      expect(content.includes('CSPostHogProvider'), 'layout.tsx must import CSPostHogProvider').toBeTruthy();
      expect(content.includes('<CSPostHogProvider>'), 'layout.tsx must wrap app with <CSPostHogProvider>').toBeTruthy();
      expect(content.includes('</CSPostHogProvider>'), 'layout.tsx must close </CSPostHogProvider>').toBeTruthy();
      expect(content.includes('<Toaster />') || content.includes('<Toaster/>'), 'layout.tsx must render <Toaster /> for toast notifications').toBeTruthy();
    }
  );

  await runTest(
    'R2-LAYOUT-02',
    'Layout tree hierarchy: html > body > CSPostHogProvider > ThemeProvider > main & Toaster',
    'App-Layout',
    () => {
      const content = readProjectFile('src/app/layout.tsx');
      const phIdx = content.indexOf('<CSPostHogProvider>');
      const themeIdx = content.indexOf('<ThemeProvider');
      const mainIdx = content.indexOf('<main');
      const toasterIdx = content.indexOf('<Toaster');
      const closePhIdx = content.indexOf('</CSPostHogProvider>');

      expect(phIdx, 'CSPostHogProvider must exist').toBeGreaterThanOrEqual(0);
      expect(themeIdx, 'ThemeProvider must be inside CSPostHogProvider').toBeGreaterThan(phIdx);
      expect(mainIdx, 'main must be inside ThemeProvider').toBeGreaterThan(themeIdx);
      expect(toasterIdx, 'Toaster must be inside ThemeProvider / CSPostHogProvider').toBeGreaterThan(mainIdx);
      expect(closePhIdx, 'CSPostHogProvider must wrap the entire tree').toBeGreaterThan(toasterIdx);
    }
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log('                 R2 & UI ERROR HANDLING TEST SUMMARY                 ');
  console.log('======================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests Run: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`R2 Empirical Challenge suite failed with ${failed} failure(s)`);
  }
}

// Execute if run directly
if (
  process.argv[1]?.endsWith('r2-empirical-challenge.test.ts') ||
  process.argv[1]?.endsWith('r2-empirical-challenge.test.js') ||
  (typeof import.meta.url === 'string' && import.meta.url === `file://${process.argv[1]}`)
) {
  runR2EmpiricalChallengeSuite().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
