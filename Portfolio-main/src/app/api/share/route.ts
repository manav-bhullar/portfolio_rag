import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis only if env vars are present
const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: 'Redis is not configured in this environment.' },
        { status: 501 }
      );
    }

    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    
    // Save to Redis with a 7-day expiration (604800 seconds)
    const key = `portfolio_share_${token}`;
    await redis.set(key, JSON.stringify(messages), { ex: 604800 });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[Share API] Error saving conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
