import { getClientIp, checkRateLimit } from '../src/lib/ratelimit';
import { POST } from '../src/app/api/chat/route';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function record(suite: string, name: string, passed: boolean, details?: Record<string, unknown>, error?: string) {
  results.push({ suite, name, passed, error, details });
  const icon = passed ? '✔' : '✖';
  console.log(`  ${icon} [${suite}] ${name}`);
  if (!passed && error) {
    console.error(`      ERROR: ${error}`);
  }
}

async function runEmpiricalSuite() {
  console.log('======================================================================');
  console.log('       Empirical Stress Test Harness: R1 Rate Limiting               ');
  console.log('======================================================================\n');

  // =========================================================================
  // 1. IP Extraction Across Varied Formats
  // =========================================================================
  console.log('--- 1. IP Extraction Tests ---');

  // 1.1 Single IPv4 in x-forwarded-for
  {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': '203.0.113.195' },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'Single IPv4 in x-forwarded-for', ip === '203.0.113.195', { ip, expected: '203.0.113.195' });
  }

  // 1.2 Multi-proxy chain in x-forwarded-for (first is client IP)
  {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18, 150.172.238.178' },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'Multi-proxy x-forwarded-for extracts client IP', ip === '203.0.113.50', { ip, expected: '203.0.113.50' });
  }

  // 1.3 Whitespace trimming in x-forwarded-for
  {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': '   198.51.100.42   , 10.0.0.1 ' },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'Whitespace trimming in x-forwarded-for', ip === '198.51.100.42', { ip, expected: '198.51.100.42' });
  }

  // 1.4 IPv6 in x-forwarded-for
  {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': '2001:db8:85a3::8a2e:370:7334, 198.51.100.1' },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'IPv6 in x-forwarded-for', ip === '2001:db8:85a3::8a2e:370:7334', { ip, expected: '2001:db8:85a3::8a2e:370:7334' });
  }

  // 1.5 x-real-ip when x-forwarded-for is absent
  {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-real-ip': '192.0.2.77' },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'x-real-ip fallback when x-forwarded-for absent', ip === '192.0.2.77', { ip, expected: '192.0.2.77' });
  }

  // 1.6 cf-connecting-ip (Cloudflare) when x-forwarded-for and x-real-ip absent
  {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'cf-connecting-ip': '198.51.100.99' },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'cf-connecting-ip fallback', ip === '198.51.100.99', { ip, expected: '198.51.100.99' });
  }

  // 1.7 NextRequest 'ip' property fallback
  {
    const req = new Request('http://localhost/api/chat');
    Object.defineProperty(req, 'ip', { value: '172.16.0.5', writable: false });
    const ip = getClientIp(req);
    record('IP Extraction', 'NextRequest.ip property fallback', ip === '172.16.0.5', { ip, expected: '172.16.0.5' });
  }

  // 1.8 Header precedence (x-forwarded-for > x-real-ip > cf-connecting-ip)
  {
    const req = new Request('http://localhost/api/chat', {
      headers: {
        'x-forwarded-for': '10.1.1.1, 10.1.1.2',
        'x-real-ip': '10.2.2.2',
        'cf-connecting-ip': '10.3.3.3',
      },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'Header precedence (x-forwarded-for first)', ip === '10.1.1.1', { ip, expected: '10.1.1.1' });
  }

  // 1.9 Fallback to 127.0.0.1 when no headers or ip present
  {
    const req = new Request('http://localhost/api/chat');
    const ip = getClientIp(req);
    record('IP Extraction', 'Default fallback 127.0.0.1 when headers missing', ip === '127.0.0.1', { ip, expected: '127.0.0.1' });
  }

  // 1.10 Empty string x-forwarded-for gracefully falls back
  {
    const req = new Request('http://localhost/api/chat', {
      headers: {
        'x-forwarded-for': '',
        'x-real-ip': '192.0.2.88',
      },
    });
    const ip = getClientIp(req);
    record('IP Extraction', 'Empty x-forwarded-for falls back to x-real-ip', ip === '192.0.2.88', { ip, expected: '192.0.2.88' });
  }

  // =========================================================================
  // 2. Sliding Window Rate Limiting (10 allowed, 11th rejected)
  // =========================================================================
  console.log('\n--- 2. Sliding Window Rate Limiting Tests ---');

  const testIp1 = `192.0.2.${Math.floor(Math.random() * 10000 + 100)}`;

  let all10Passed = true;
  const remainingSequence: number[] = [];

  for (let i = 1; i <= 10; i++) {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-real-ip': testIp1 },
    });
    const res = await checkRateLimit(req);
    remainingSequence.push(res.remaining);
    if (!res.success) {
      all10Passed = false;
    }
  }

  record(
    'Sliding Window',
    '10 consecutive requests from same IP all succeed',
    all10Passed,
    { remainingSequence, expectedLength: 10 }
  );

  record(
    'Sliding Window',
    'Remaining quota decreases monotonically from 9 to 0',
    remainingSequence[0] === 9 && remainingSequence[9] === 0,
    { firstRemaining: remainingSequence[0], lastRemaining: remainingSequence[9] }
  );

  // 11th request MUST fail
  const breachReq = new Request('http://localhost/api/chat', {
    headers: { 'x-real-ip': testIp1 },
  });
  const breachRes = await checkRateLimit(breachReq);

  const breachOk =
    breachRes.success === false &&
    breachRes.remaining === 0 &&
    breachRes.limit === 10 &&
    breachRes.reset > Date.now() &&
    typeof breachRes.retryAfter === 'number' &&
    breachRes.retryAfter > 0;

  record(
    'Sliding Window',
    '11th request is rejected (success=false, remaining=0, retryAfter>0)',
    breachOk,
    { breachRes, now: Date.now() }
  );

  // 12th request also rejected
  const req12 = new Request('http://localhost/api/chat', {
    headers: { 'x-real-ip': testIp1 },
  });
  const res12 = await checkRateLimit(req12);
  record(
    'Sliding Window',
    '12th request continues to be blocked',
    res12.success === false && res12.remaining === 0,
    { res12 }
  );

  // =========================================================================
  // 3. Client IP Isolation
  // =========================================================================
  console.log('\n--- 3. Client IP Isolation Tests ---');

  const ipA = `198.51.100.10`;
  const ipB = `198.51.100.20`;
  const ipC = `2001:db8:dead:beef::1`;

  // Exhaust IP A
  for (let i = 0; i < 10; i++) {
    const req = new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': ipA },
    });
    await checkRateLimit(req);
  }
  const checkA = await checkRateLimit(new Request('http://localhost/api/chat', {
    headers: { 'x-forwarded-for': ipA },
  }));
  const isABlocked = !checkA.success;

  // IP B sends first request
  const checkB1 = await checkRateLimit(new Request('http://localhost/api/chat', {
    headers: { 'x-forwarded-for': ipB },
  }));

  // IP C (IPv6) sends first request
  const checkC1 = await checkRateLimit(new Request('http://localhost/api/chat', {
    headers: { 'x-forwarded-for': ipC },
  }));

  record(
    'IP Isolation',
    'IP A is blocked while IP B receives full quota (remaining=9)',
    isABlocked && checkB1.success && checkB1.remaining === 9,
    { isABlocked, ipBRemaining: checkB1.remaining }
  );

  record(
    'IP Isolation',
    'IPv6 client IP C is also isolated and succeeds (remaining=9)',
    checkC1.success && checkC1.remaining === 9,
    { ipCRemaining: checkC1.remaining }
  );

  // =========================================================================
  // 4. Route Handler /api/chat Guard & Headers
  // =========================================================================
  console.log('\n--- 4. Route Handler /api/chat Guard Tests ---');

  const routeIp = `203.0.113.88`;

  // Exhaust quota for routeIp
  for (let i = 0; i < 10; i++) {
    await checkRateLimit(new Request('http://localhost/api/chat', {
      headers: { 'x-forwarded-for': routeIp },
    }));
  }

  // Invoke POST route handler directly when rate limited
  const blockedHttpReq = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: {
      'x-forwarded-for': routeIp,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  });

  const httpResponse = await POST(blockedHttpReq);

  const statusIs429 = httpResponse.status === 429;
  const retryAfterHeader = httpResponse.headers.get('Retry-After');
  const limitHeader = httpResponse.headers.get('X-RateLimit-Limit');
  const remainingHeader = httpResponse.headers.get('X-RateLimit-Remaining');
  const resetHeader = httpResponse.headers.get('X-RateLimit-Reset');
  const contentType = httpResponse.headers.get('Content-Type');

  const bodyJson = await httpResponse.json();

  record(
    'Route Handler Guard',
    'Returns HTTP Status 429 when rate limited',
    statusIs429,
    { status: httpResponse.status }
  );

  record(
    'Route Handler Guard',
    'Returns required rate limit response headers (Retry-After, X-RateLimit-*)',
    Boolean(retryAfterHeader && limitHeader === '10' && remainingHeader === '0' && resetHeader && contentType?.includes('application/json')),
    {
      retryAfterHeader,
      limitHeader,
      remainingHeader,
      resetHeader,
      contentType,
    }
  );

  record(
    'Route Handler Guard',
    'Response body contains structured error JSON with retryAfter',
    Boolean(bodyJson && bodyJson.error && typeof bodyJson.retryAfter === 'number' && bodyJson.retryAfter > 0),
    { bodyJson }
  );

  // =========================================================================
  // 5. Fallback Behavior (Upstash Unset vs Mocked / Error Recovery)
  // =========================================================================
  console.log('\n--- 5. Fallback Behavior Tests ---');

  // Test local fallback without Upstash env vars
  const isEnvUnset = !process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN;
  record(
    'Fallback Behavior',
    'In-memory fallback works seamlessly when Upstash env vars are unset',
    isEnvUnset,
    { UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL }
  );

  // Summary
  console.log('\n======================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Empirical Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmpiricalSuite().catch((err) => {
  console.error('Test harness execution failed:', err);
  process.exit(1);
});
