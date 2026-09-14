import { checkRateLimit } from '../src/lib/ratelimit';

async function testUpstashEnvBehavior() {
  console.log('======================================================================');
  console.log('       Upstash Redis Env Vars & Network Failure Simulation           ');
  console.log('======================================================================\n');

  // Test 1: Simulate invalid Upstash credentials (network/auth failure)
  process.env.UPSTASH_REDIS_REST_URL = 'https://fake-endpoint.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake_invalid_token_12345';

  console.log('1. Testing behavior with mock/invalid Upstash environment variables:');
  const req = new Request('http://localhost/api/chat', {
    headers: { 'x-forwarded-for': '198.51.100.77' },
  });

  const result = await checkRateLimit(req);
  console.log('   Result returned:', result);

  const passedFailOpen =
    result.success === true &&
    result.limit === 10 &&
    typeof result.remaining === 'number' &&
    typeof result.reset === 'number';

  console.log(`   Fail-Open on Upstash Error: ${passedFailOpen ? '✔ PASS' : '✖ FAIL'}`);

  // Test 2: Clean up env vars and test in-memory fallback
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  console.log('\n2. Testing in-memory fallback after unsetting env variables:');
  const req2 = new Request('http://localhost/api/chat', {
    headers: { 'x-forwarded-for': '198.51.100.78' },
  });
  const result2 = await checkRateLimit(req2);
  console.log('   Result returned:', result2);

  const passedInMemory =
    result2.success === true &&
    result2.limit === 10 &&
    typeof result2.remaining === 'number' &&
    typeof result2.reset === 'number';

  console.log(`   In-memory fallback after reset: ${passedInMemory ? '✔ PASS' : '✖ FAIL'}`);

  if (!passedFailOpen || !passedInMemory) {
    process.exit(1);
  }
}

testUpstashEnvBehavior().catch((err) => {
  console.error('Upstash env test failed with exception:', err);
  process.exit(1);
});
