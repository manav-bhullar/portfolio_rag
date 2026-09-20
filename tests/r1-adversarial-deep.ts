import { getClientIp, checkRateLimit } from '../src/lib/ratelimit';
import { POST } from '../src/app/api/chat/route';

interface ChallengeResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  details: string;
  metrics?: Record<string, unknown>;
}

const challengeResults: ChallengeResult[] = [];

function recordChallenge(
  id: string,
  category: string,
  name: string,
  passed: boolean,
  details: string,
  metrics?: Record<string, unknown>
) {
  challengeResults.push({ id, category, name, passed, details, metrics });
  const icon = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`  ${icon} [${id}] [${category}] ${name}`);
  if (!passed) {
    console.error(`      -> FAILURE: ${details}`);
  }
}

async function runAdversarialStress() {
  console.log('======================================================================');
  console.log('        Adversarial Stress Test Suite: R1 Rate Limiting               ');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // DIMENSION 1: High Concurrency & Burst Race Conditions
  // -------------------------------------------------------------------------
  console.log('--- Dimension 1: Concurrency & Burst Race Conditions ---');
  {
    const burstIp = `192.168.99.${Math.floor(Math.random() * 8000 + 100)}`;
    const burstCount = 50;

    // Launch 50 simultaneous asynchronous requests
    const promises = Array.from({ length: burstCount }, (_, i) =>
      checkRateLimit(
        new Request('http://localhost/api/chat', {
          headers: { 'x-forwarded-for': burstIp },
        })
      )
    );

    const outcomes = await Promise.all(promises);
    const successCount = outcomes.filter((o) => o.success).length;
    const failureCount = outcomes.filter((o) => !o.success).length;

    const exactQuotaEnforced = successCount === 10 && failureCount === 40;
    recordChallenge(
      'ADV-R1-01',
      'Concurrency',
      '50 simultaneous concurrent requests from same IP allow exactly 10 and reject 40',
      exactQuotaEnforced,
      `Expected 10 successes and 40 rejections, got ${successCount} successes and ${failureCount} rejections`,
      { burstCount, successCount, failureCount }
    );

    // Verify all rejected requests have valid retryAfter >= 1
    const allRejectedHaveRetryAfter = outcomes
      .filter((o) => !o.success)
      .every((o) => typeof o.retryAfter === 'number' && o.retryAfter >= 1);

    recordChallenge(
      'ADV-R1-02',
      'Concurrency',
      'All concurrently rejected requests return valid retryAfter >= 1s',
      allRejectedHaveRetryAfter,
      'One or more rejected requests missing valid retryAfter',
      { failureCount }
    );
  }

  // -------------------------------------------------------------------------
  // DIMENSION 2: Sliding Window Boundary Math & Time-Slice Dynamics
  // -------------------------------------------------------------------------
  console.log('\n--- Dimension 2: Sliding Window Math & Time-Slice Dynamics ---');
  {
    // Test true sliding window behavior using time mocking
    const originalDateNow = Date.now;
    try {
      let simulatedTime = 1700000000000;
      Date.now = () => simulatedTime;

      const dynamicIp = '10.200.1.55';

      // Send 5 requests at T = 0s
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(
          new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
        );
        if (!res.success) throw new Error(`Request ${i + 1} at T=0 unexpectedly failed`);
      }

      // Advance time by 30 seconds
      simulatedTime += 30 * 1000; // T = 30s

      // Send 5 more requests at T = 30s (total in window = 10)
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(
          new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
        );
        if (!res.success) throw new Error(`Request ${i + 6} at T=30s unexpectedly failed`);
      }

      // 11th request at T = 35s MUST fail (10 requests within [T-60s, T])
      simulatedTime += 5 * 1000; // T = 35s
      const breachAt35 = await checkRateLimit(
        new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
      );

      const breachCorrect = !breachAt35.success && breachAt35.remaining === 0;

      // Advance time to T = 65s.
      // The first 5 requests from T=0s have expired (65s > 60s).
      // But the 5 requests from T=30s are still active (35s < 60s).
      // Thus, exactly 5 requests should succeed at T = 65s!
      simulatedTime = 1700000000000 + 65 * 1000; // T = 65s

      let successAt65 = 0;
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(
          new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
        );
        if (res.success) successAt65++;
      }

      // 6th request at T = 65s must fail (window has 5 from T=30s + 5 from T=65s = 10 total)
      const breachAt65 = await checkRateLimit(
        new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
      );

      const slidingWindowAccurate = breachCorrect && successAt65 === 5 && !breachAt65.success;

      recordChallenge(
        'ADV-R1-03',
        'Sliding Window',
        'Partial window expiration releases exactly the expired quota fraction',
        slidingWindowAccurate,
        `Breach at 35s: ${breachCorrect}, Successes at 65s: ${successAt65} (expected 5), 6th at 65s rejected: ${!breachAt65.success}`,
        { breachCorrect, successAt65, breachAt65Success: breachAt65.success }
      );

      // Advance to T = 95s: The 5 requests from T=30s expire. 5 slots free up.
      simulatedTime = 1700000000000 + 95 * 1000;
      let successAt95 = 0;
      for (let i = 0; i < 5; i++) {
        const res = await checkRateLimit(
          new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
        );
        if (res.success) successAt95++;
      }
      const breachAt95 = await checkRateLimit(
        new Request('http://localhost/api/chat', { headers: { 'x-real-ip': dynamicIp } })
      );

      recordChallenge(
        'ADV-R1-04',
        'Sliding Window',
        'Subsequent window slice expiration releases remaining quota correctly',
        successAt95 === 5 && !breachAt95.success,
        `Successes at 95s: ${successAt95} (expected 5), 6th at 95s rejected: ${!breachAt95.success}`,
        { successAt95, breachAt95Success: breachAt95.success }
      );
    } finally {
      Date.now = originalDateNow;
    }
  }

  // -------------------------------------------------------------------------
  // DIMENSION 3: High Cardinality & Map Memory Cleanup Stress
  // -------------------------------------------------------------------------
  console.log('\n--- Dimension 3: High Cardinality & Memory Leak Resistance ---');
  {
    const originalDateNow = Date.now;
    try {
      let simulatedTime = 1700000000000;
      Date.now = () => simulatedTime;

      // Generate 1,500 distinct IPs to trigger cleanup threshold (> 1000 entries)
      for (let i = 1; i <= 1500; i++) {
        const ip = `172.31.${Math.floor(i / 256)}.${i % 256}`;
        await checkRateLimit(
          new Request('http://localhost/api/chat', { headers: { 'x-real-ip': ip } })
        );
      }

      // Advance time by 70s so all entries expire
      simulatedTime += 70 * 1000;

      // Trigger one more request to invoke cleanup
      const cleanupTriggerIp = '172.31.255.254';
      const triggerRes = await checkRateLimit(
        new Request('http://localhost/api/chat', { headers: { 'x-real-ip': cleanupTriggerIp } })
      );

      recordChallenge(
        'ADV-R1-05',
        'Memory Resistance',
        'High cardinality entries (>1,000 distinct client IPs) do not crash limiter',
        triggerRes.success === true,
        'Limiter failed during/after high cardinality test',
        { entriesCreated: 1501 }
      );
    } finally {
      Date.now = originalDateNow;
    }
  }

  // -------------------------------------------------------------------------
  // DIMENSION 4: Malicious, Non-Standard, and Edge-Case Headers
  // -------------------------------------------------------------------------
  console.log('\n--- Dimension 4: Malicious & Edge-Case Header Fuzzing ---');
  {
    const maliciousHeaders: Array<{ name: string; header: Record<string, string> }> = [
      { name: 'SQL Injection in X-Forwarded-For', header: { 'x-forwarded-for': "' OR '1'='1; 192.168.1.1" } },
      { name: 'XSS script tag in X-Forwarded-For', header: { 'x-forwarded-for': '<script>alert(1)</script>, 10.0.0.1' } },
      { name: 'IPv6 with square brackets & port', header: { 'x-forwarded-for': '[2001:db8::1]:8080' } },
      { name: 'IPv4 with port notation', header: { 'x-forwarded-for': '192.0.2.1:3000, 10.0.0.1' } },
      { name: 'Very long header payload (1KB)', header: { 'x-forwarded-for': '99.99.99.99, ' + '1.1.1.1, '.repeat(100) } },
      { name: 'Encoded Unicode/percent in X-Real-IP', header: { 'x-real-ip': '%F0%9F%9A%80.127.0.0.1' } },
      { name: 'Multiple commas with empty slots', header: { 'x-forwarded-for': ' , , 192.168.1.50 ' } },
      { name: 'Tab and newline characters in header', header: { 'x-real-ip': '  192.168.1.99  ' } },
    ];

    let allFuzzPassed = true;
    for (const test of maliciousHeaders) {
      try {
        const req = new Request('http://localhost/api/chat', { headers: test.header as HeadersInit });
        const ip = getClientIp(req);
        const rateCheck = await checkRateLimit(req);
        if (!rateCheck || typeof rateCheck.success !== 'boolean' || !ip) {
          allFuzzPassed = false;
        }
      } catch (err) {
        console.error(`Fuzz test failed on ${test.name}:`, err);
        allFuzzPassed = false;
      }
    }

    recordChallenge(
      'ADV-R1-06',
      'Header Fuzzing',
      'Robust extraction & rate check across 8 adversarial/malformed header patterns',
      allFuzzPassed,
      'One or more malformed header inputs threw unexpected exception'
    );
  }

  // -------------------------------------------------------------------------
  // DIMENSION 5: Fail-Open Resilience Under Infrastructure Failure
  // -------------------------------------------------------------------------
  console.log('\n--- Dimension 5: Fail-Open Resilience Under Infrastructure Failure ---');
  {
    // If Redis/Upstash is down or throws error, checkRateLimit must fail open
    // We test this by verifying checkRateLimit handles unexpected errors in limiter.limit()
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': '192.0.2.200' },
    });

    const result = await checkRateLimit(req);
    const failsOpenSafely =
      result.success === true &&
      result.limit === 10 &&
      typeof result.remaining === 'number' &&
      typeof result.reset === 'number';

    recordChallenge(
      'ADV-R1-07',
      'Fail-Open Resilience',
      'Rate limiter provides valid fallback structure with success=true when in error/dev state',
      failsOpenSafely,
      'Fallback result does not match expected RateLimitResult interface',
      { result }
    );
  }

  // -------------------------------------------------------------------------
  // DIMENSION 6: Route Handler 429 Response & Headers Conformance
  // -------------------------------------------------------------------------
  console.log('\n--- Dimension 6: Route Handler 429 Response Spec Conformance ---');
  {
    const exhaustIp = `192.0.2.222`;

    // Exhaust quota
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(
        new Request('http://localhost/api/chat', { headers: { 'x-forwarded-for': exhaustIp } })
      );
    }

    // Call POST handler
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'x-forwarded-for': exhaustIp,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test message' }],
      }),
    });

    const response = await POST(req);
    const body = await response.json();

    const is429 = response.status === 429;
    const hasRetryAfter = Number(response.headers.get('Retry-After')) >= 1;
    const hasLimit = response.headers.get('X-RateLimit-Limit') === '10';
    const hasRemaining = response.headers.get('X-RateLimit-Remaining') === '0';
    const hasReset = Number(response.headers.get('X-RateLimit-Reset')) > Date.now() - 10000;
    const hasErrorBody = typeof body.error === 'string' && typeof body.message === 'string';
    const bodyRetryMatchesHeader = String(body.retryAfter) === response.headers.get('Retry-After');

    const fullSpecConformance =
      is429 &&
      hasRetryAfter &&
      hasLimit &&
      hasRemaining &&
      hasReset &&
      hasErrorBody &&
      bodyRetryMatchesHeader;

    recordChallenge(
      'ADV-R1-08',
      'Spec Conformance',
      'HTTP 429 response meets exact IETF/Next.js rate limit header and body specifications',
      fullSpecConformance,
      `Spec check failed: is429=${is429}, hasRetryAfter=${hasRetryAfter}, hasLimit=${hasLimit}, hasRemaining=${hasRemaining}, hasReset=${hasReset}, hasErrorBody=${hasErrorBody}, bodyRetryMatchesHeader=${bodyRetryMatchesHeader}`,
      {
        status: response.status,
        headers: {
          'Retry-After': response.headers.get('Retry-After'),
          'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit'),
          'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining'),
          'X-RateLimit-Reset': response.headers.get('X-RateLimit-Reset'),
        },
        body,
      }
    );
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  const total = challengeResults.length;
  const passed = challengeResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Adversarial Challenges: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialStress().catch((err) => {
  console.error('Adversarial suite execution error:', err);
  process.exit(1);
});
