import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  retryAfter?: number; // Number of seconds to wait if rate limited
  pending?: Promise<unknown>;
}

// In-memory sliding window rate limiter fallback for local dev & testing
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 10, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  limit(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Filter out timestamps older than the sliding window
    const existing = this.requests.get(identifier) || [];
    const recent = existing.filter((ts) => ts > windowStart);

    if (recent.length >= this.maxRequests) {
      const oldestInWindow = recent[0];
      const reset = oldestInWindow + this.windowMs;
      const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
        retryAfter,
      };
    }

    recent.push(now);
    this.requests.set(identifier, recent);

    // Periodic cleanup of stale entries if map gets large
    if (this.requests.size > 1000) {
      for (const [key, timestamps] of this.requests.entries()) {
        const valid = timestamps.filter((t) => t > windowStart);
        if (valid.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, valid);
        }
      }
    }

    return {
      success: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - recent.length),
      reset: now + this.windowMs,
    };
  }
}

// Singleton instances
let upstashRatelimit: Ratelimit | null = null;
let inMemoryLimiter: InMemoryRateLimiter | null = null;
let devWarningLogged = false;

function getRateLimiter(): Ratelimit | InMemoryRateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    if (!upstashRatelimit) {
      const redis = new Redis({ url, token });
      upstashRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        analytics: true,
        prefix: 'portfolio_chat_ratelimit',
        ephemeralCache: new Map(),
      });
    }
    return upstashRatelimit;
  }

  if (!inMemoryLimiter) {
    inMemoryLimiter = new InMemoryRateLimiter(10, 60 * 1000);
  }

  if (!devWarningLogged && process.env.NODE_ENV !== 'test') {
    console.warn(
      '[RateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured. Using in-memory rate limiter fallback (10 requests / 60s).'
    );
    devWarningLogged = true;
  }

  return inMemoryLimiter;
}

/**
 * Extracts client IP safely from request headers with multi-proxy support.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;

  // 1. x-forwarded-for (first IP in chain is original client)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  // 2. x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 3. cf-connecting-ip (Cloudflare)
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }

  // 4. Check if req has an 'ip' property (NextRequest)
  if ('ip' in req && typeof (req as { ip?: string }).ip === 'string') {
    const ip = (req as { ip?: string }).ip;
    if (ip) return ip;
  }

  return '127.0.0.1';
}

/**
 * Checks rate limit for the incoming request.
 * Fails open in production on unexpected Redis errors to prevent chat disruption.
 */
export async function checkRateLimit(req: Request): Promise<RateLimitResult> {
  const ip = getClientIp(req);

  try {
    const limiter = getRateLimiter();
    const result = await limiter.limit(ip);
    const retryAfter = !result.success
      ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
      : undefined;

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter,
      pending: 'pending' in result ? result.pending : undefined,
    };
  } catch (error) {
    console.error('[RateLimit] Unexpected error during rate limit check, failing open:', error);
    // Fail-open default
    return {
      success: true,
      limit: 10,
      remaining: 1,
      reset: Date.now() + 60000,
    };
  }
}
