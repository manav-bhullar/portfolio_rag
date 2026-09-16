import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

// Simple filtering to drop generic/uninteresting queries from the ticker
const filterUninteresting = (queries: string[]) => {
  const boringWords = ['hi', 'hello', 'hey', 'who are you', 'what do you do', 'test'];
  return queries.filter((q) => {
    const lower = q.toLowerCase().trim();
    if (lower.length < 5) return false;
    if (boringWords.includes(lower)) return false;
    return true;
  });
};

export async function GET() {
  try {
    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ trending: [] });
    }

    const rawQueries = await redis.lrange('portfolio_recent_queries', 0, 49);
    const interesting = filterUninteresting(rawQueries);
    
    // Deduplicate and take top 5
    const unique = Array.from(new Set(interesting)).slice(0, 5);

    return NextResponse.json({ trending: unique });
  } catch (err) {
    console.error('Error fetching trending queries:', err);
    return NextResponse.json({ trending: [] });
  }
}
