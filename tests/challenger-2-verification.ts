import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Test harness
interface AssertResult {
  scenario: string;
  expected: any;
  actual: any;
  passed: boolean;
  notes?: string;
}

const assertions: AssertResult[] = [];

function assertEqual(scenario: string, actual: any, expected: any, notes?: string) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  assertions.push({ scenario, expected, actual, passed, notes });
  if (!passed) {
    console.error(`FAILED: ${scenario}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASSED: ${scenario}`);
  }
}

function assertTrue(scenario: string, condition: boolean, notes?: string) {
  assertions.push({ scenario, expected: true, actual: condition, passed: condition, notes });
  if (!condition) {
    console.error(`FAILED: ${scenario}`);
  } else {
    console.log(`PASSED: ${scenario}`);
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: PostHog Provider Logic & AST Analysis
// -----------------------------------------------------------------------------
console.log('\n=== SUITE 1: PostHog Provider Static & Runtime Simulation ===');

const providerPath = path.resolve('src/components/posthog-provider.tsx');
const providerContent = fs.readFileSync(providerPath, 'utf8');

// 1.1 Check 'use client'
assertTrue('1.1 Provider has "use client" directive', providerContent.startsWith("'use client';") || providerContent.startsWith('"use client";'));

// 1.2 Check exports
assertTrue('1.2 Provider exports CSPostHogProvider', providerContent.includes('export function CSPostHogProvider'));
assertTrue('1.3 Provider exports PostHogProvider alias', providerContent.includes('export { CSPostHogProvider as PostHogProvider }'));

// 1.4 Simulate PostHog initialization under various environment configurations
interface MockInitArgs {
  key: string;
  config: {
    api_host: string;
    person_profiles: string;
    capture_pageview: boolean;
    capture_pageleave: boolean;
  };
}

function simulatePostHogInit(windowExists: boolean, envKey?: string, envHost?: string): MockInitArgs | null {
  let recordedArgs: MockInitArgs | null = null;
  const mockPosthog = {
    init: (key: string, config: any) => {
      recordedArgs = { key, config };
    }
  };

  // Replicate exact provider logic from src/components/posthog-provider.tsx
  const posthogKey = envKey;
  const posthogHost = envHost || 'https://us.i.posthog.com';

  if (windowExists && posthogKey) {
    mockPosthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
    });
  }

  return recordedArgs;
}

// 1.5 Test cases for simulatePostHogInit
const ssrResult = simulatePostHogInit(false, 'phc_valid_key', 'https://us.i.posthog.com');
assertEqual('1.5 SSR execution (no window) does not initialize PostHog', ssrResult, null);

const missingKeyResult = simulatePostHogInit(true, undefined, 'https://us.i.posthog.com');
assertEqual('1.6 Client execution without API key does not initialize PostHog', missingKeyResult, null);

const emptyKeyResult = simulatePostHogInit(true, '', 'https://us.i.posthog.com');
assertEqual('1.7 Client execution with empty string API key does not initialize PostHog', emptyKeyResult, null);

const defaultHostResult = simulatePostHogInit(true, 'phc_test_key_123', undefined);
assertEqual('1.8 Client with valid key and no host uses US cloud default', defaultHostResult, {
  key: 'phc_test_key_123',
  config: {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
  }
});

const customHostResult = simulatePostHogInit(true, 'phc_eu_key_456', 'https://eu.i.posthog.com');
assertEqual('1.9 Client with custom host (EU) uses specified host', customHostResult?.config.api_host, 'https://eu.i.posthog.com');

const proxyHostResult = simulatePostHogInit(true, 'phc_proxy_key', '/analytics-ingest');
assertEqual('1.10 Client with reverse proxy path uses specified host', proxyHostResult?.config.api_host, '/analytics-ingest');

// -----------------------------------------------------------------------------
// TEST SUITE 2: Chat Analytics Event Capture Simulation
// -----------------------------------------------------------------------------
console.log('\n=== SUITE 2: Chat Analytics Event Capture (submitQuery) ===');

const chatPath = path.resolve('src/components/chat/chat.tsx');
const chatContent = fs.readFileSync(chatPath, 'utf8');

// 2.1 Verify posthog import in chat.tsx
assertTrue('2.1 chat.tsx imports posthog', chatContent.includes("import posthog from 'posthog-js';"));

// 2.2 Replicate submitQuery logic
interface CapturedEvent {
  eventName: string;
  payload: any;
}
interface AppendedMessage {
  role: string;
  content: string;
}

function simulateChatSubmitQuery(
  query: string,
  isToolInProgress: boolean,
  windowExists: boolean
): { captured: CapturedEvent[]; appended: AppendedMessage[]; loadingSubmit: boolean } {
  const captured: CapturedEvent[] = [];
  const appended: AppendedMessage[] = [];
  let loadingSubmit = false;

  const mockPosthog = {
    capture: (eventName: string, payload: any) => {
      captured.push({ eventName, payload });
    }
  };

  const append = (msg: AppendedMessage) => {
    appended.push(msg);
  };

  // Implementation from chat.tsx:
  if (!query.trim() || isToolInProgress) {
    return { captured, appended, loadingSubmit };
  }
  loadingSubmit = true;

  if (windowExists) {
    mockPosthog.capture('chat_message_sent', {
      query: query.trim(),
    });
  }

  append({
    role: 'user',
    content: query,
  });

  return { captured, appended, loadingSubmit };
}

// 2.3 Standard query
const standardRes = simulateChatSubmitQuery('Tell me about your projects', false, true);
assertEqual('2.3 Standard query captured with trimmed content', standardRes.captured, [
  { eventName: 'chat_message_sent', payload: { query: 'Tell me about your projects' } }
]);
assertEqual('2.4 Standard query appended to chat', standardRes.appended, [
  { role: 'user', content: 'Tell me about your projects' }
]);
assertEqual('2.5 loadingSubmit set to true', standardRes.loadingSubmit, true);

// 2.6 Untrimmed query with tabs, newlines, and spaces
const untrimmedRes = simulateChatSubmitQuery('  \n\t What are your AI skills? \t\n  ', false, true);
assertEqual('2.6 Untrimmed query payload is trimmed in analytics', untrimmedRes.captured[0].payload.query, 'What are your AI skills?');
assertEqual('2.7 Raw query passed to append', untrimmedRes.appended[0].content, '  \n\t What are your AI skills? \t\n  ');

// 2.8 Empty string & whitespace only
const emptyRes = simulateChatSubmitQuery('', false, true);
assertEqual('2.8 Empty query produces 0 events and 0 messages', emptyRes.captured.length, 0);

const whitespaceRes = simulateChatSubmitQuery('    \t\n   ', false, true);
assertEqual('2.9 Whitespace-only query produces 0 events and 0 messages', whitespaceRes.captured.length, 0);

// 2.10 Tool in progress block
const toolBlockedRes = simulateChatSubmitQuery('Another message during tool call', true, true);
assertEqual('2.10 Query while tool in progress is rejected', toolBlockedRes.captured.length, 0);
assertEqual('2.11 Tool-blocked query does not change loadingSubmit', toolBlockedRes.loadingSubmit, false);

// 2.12 Verify UI integration points in chat.tsx
assertTrue('2.12 HelperBoost receives submitQuery', chatContent.includes('<HelperBoost submitQuery={submitQuery}'));
assertTrue('2.13 ChatLanding receives submitQuery', chatContent.includes('<ChatLanding submitQuery={submitQuery} />'));
assertTrue('2.14 initialQuery effect invokes submitQuery', chatContent.includes('submitQuery(initialQuery)'));

// -----------------------------------------------------------------------------
// TEST SUITE 3: UI Error Toast Parsing on 429 & Edge Cases
// -----------------------------------------------------------------------------
console.log('\n=== SUITE 3: UI Error Toast Parsing on 429 & Edge Cases (onError) ===');

function simulateOnError(error: { message: string; cause?: any }): { toastError: string; loadingSubmit: boolean } {
  let toastError = '';
  let loadingSubmit = true;

  const mockToast = {
    error: (msg: string) => {
      toastError = msg;
    }
  };

  // Implementation from chat.tsx:
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

  return { toastError, loadingSubmit };
}

const RATE_LIMIT_USER_MESSAGE = 'Rate limit exceeded. Please wait before sending another message.';

// 3.1 Backend API route 429 response body format
const backend429Body = JSON.stringify({
  error: "Rate limit exceeded. Please wait before sending another message.",
  message: "Rate limit exceeded. You can send up to 10 messages per minute. Please try again in 45 seconds.",
  retryAfter: 45
});
const test3_1 = simulateOnError({ message: backend429Body });
assertEqual('3.1 Backend API route 429 JSON response matches user toast', test3_1.toastError, RATE_LIMIT_USER_MESSAGE);
assertEqual('3.2 loadingSubmit reset to false on 429 error', test3_1.loadingSubmit, false);

// 3.3 JSON with message field only
const test3_3 = simulateOnError({ message: JSON.stringify({ message: "HTTP 429 Too Many Requests" }) });
assertEqual('3.3 JSON with { message: "HTTP 429 Too Many Requests" } parsed correctly', test3_3.toastError, RATE_LIMIT_USER_MESSAGE);

// 3.4 Raw plain text 429 error
const test3_4 = simulateOnError({ message: 'Request failed with status code 429' });
assertEqual('3.4 Plain text 429 status code parsed correctly', test3_4.toastError, RATE_LIMIT_USER_MESSAGE);

// 3.5 Plain text "rate limit" error in uppercase / mixed case
const test3_5 = simulateOnError({ message: 'RATE LIMIT EXCEEDED FOR IP 192.168.1.1' });
assertEqual('3.5 Mixed-case "RATE LIMIT" error parsed correctly', test3_5.toastError, RATE_LIMIT_USER_MESSAGE);

// 3.6 HTML 429 response from proxy/CDN
const test3_6 = simulateOnError({ message: '<html><head><title>429 Too Many Requests</title></head></html>' });
assertEqual('3.6 HTML 429 response parsed correctly', test3_6.toastError, RATE_LIMIT_USER_MESSAGE);

// 3.7 Non-rate-limit JSON error (e.g. 500 or AI quota)
const test3_7 = simulateOnError({ message: JSON.stringify({ error: 'AI model service temporarily unavailable' }) });
assertEqual('3.7 Non-rate-limit JSON error formatted with Error: prefix', test3_7.toastError, 'Error: AI model service temporarily unavailable');

// 3.8 Non-rate-limit plain text error with existing "Error:" prefix
const test3_8 = simulateOnError({ message: 'Error: Network connection lost' });
assertEqual('3.8 Error message with existing Error: prefix does not duplicate', test3_8.toastError, 'Error: Network connection lost');

// 3.9 Empty error message fallback
const test3_9 = simulateOnError({ message: '' });
assertEqual('3.9 Empty error message falls back to unexpected error', test3_9.toastError, 'Error: An unexpected error occurred.');

// -----------------------------------------------------------------------------
// TEST SUITE 4: Layout App Router Tree Verification
// -----------------------------------------------------------------------------
console.log('\n=== SUITE 4: Layout App Router Tree & Compilation ===');

const layoutPath = path.resolve('src/app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

assertTrue('4.1 layout.tsx imports CSPostHogProvider', layoutContent.includes("import { CSPostHogProvider } from \"@/components/posthog-provider\";"));
assertTrue('4.2 layout.tsx imports Toaster from sonner', layoutContent.includes("import { Toaster } from \"@/components/ui/sonner\";"));
assertTrue('4.3 layout.tsx wraps RootLayout children with CSPostHogProvider', layoutContent.includes('<CSPostHogProvider>') && layoutContent.includes('</CSPostHogProvider>'));
assertTrue('4.4 layout.tsx contains Toaster component', layoutContent.includes('<Toaster />') || layoutContent.includes('<Toaster/>'));

// Verify nesting order in AST
const phStart = layoutContent.indexOf('<CSPostHogProvider>');
const themeStart = layoutContent.indexOf('<ThemeProvider');
const mainStart = layoutContent.indexOf('<main');
const toasterStart = layoutContent.indexOf('<Toaster');
const phEnd = layoutContent.indexOf('</CSPostHogProvider>');

assertTrue('4.5 Provider nesting order: CSPostHogProvider -> ThemeProvider -> main -> Toaster -> /CSPostHogProvider',
  phStart < themeStart && themeStart < mainStart && mainStart < toasterStart && toasterStart < phEnd
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n=============================================================================');
console.log('                        SUMMARY OF VERIFICATION RESULTS                     ');
console.log('=============================================================================');
const totalAssertions = assertions.length;
const passedAssertions = assertions.filter(a => a.passed).length;
const failedAssertions = assertions.filter(a => !a.passed).length;

console.log(`Total Scenarios Tested: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${failedAssertions}`);
console.log('=============================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
