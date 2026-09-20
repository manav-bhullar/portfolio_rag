import { checkRateLimit } from '@/lib/ratelimit';
import { Redis } from '@upstash/redis';

export const runtime = 'edge';

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

export async function POST(req: Request) {
  try {
    // 1. Check rate limit to prevent spamming the share endpoint
    const rateLimit = await checkRateLimit(req);
    if (!rateLimit.success) {
      const retryAfter = rateLimit.retryAfter ?? Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return new Response(
        JSON.stringify({ error: `Too many requests. Try again in ${retryAfter}s.` }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages payload' }), { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
      return new Response(
        JSON.stringify({ error: 'Redis is not configured in this environment' }),
        { status: 501 }
      );
    }

    // 2. Generate a random token
    const token = crypto.randomUUID().replace(/-/g, '');
    const key = `portfolio_share_${token}`;

    // 3. Store messages in Redis with a 30-day TTL (2592000 seconds)
    await redis.setex(key, 2592000, JSON.stringify(messages));

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Share API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
