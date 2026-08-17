import path from 'node:path';

export interface ChatRequestOptions {
  ip?: string;
  forwardedFor?: string;
  realIp?: string;
  messages?: Array<{ role: string; content: string }>;
  headers?: Record<string, string>;
  method?: string;
}

export interface RateLimitHeaders {
  retryAfter: string | null;
  limit: string | null;
  remaining: string | null;
  reset: string | null;
}

/**
 * Creates a standard Fetch API Request object simulating Next.js App Router requests.
 */
export function createChatRequest(options: ChatRequestOptions = {}): Request {
  const {
    ip,
    forwardedFor,
    realIp,
    messages = [{ role: 'user', content: 'Tell me about yourself' }],
    headers = {},
    method = 'POST',
  } = options;

  const headerMap = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });

  if (forwardedFor) {
    headerMap.set('x-forwarded-for', forwardedFor);
  } else if (ip) {
    headerMap.set('x-forwarded-for', ip);
  }

  if (realIp) {
    headerMap.set('x-real-ip', realIp);
  }

  const url = 'http://localhost:3000/api/chat';
  const body = method === 'GET' || method === 'HEAD' ? null : JSON.stringify({ messages });

  return new Request(url, {
    method,
    headers: headerMap,
    body,
  });
}

/**
 * Parses and extracts standard rate limiting headers from an HTTP Response.
 */
export function parseRateLimitHeaders(response: Response): RateLimitHeaders {
  return {
    retryAfter: response.headers.get('retry-after') || response.headers.get('Retry-After'),
    limit: response.headers.get('x-ratelimit-limit') || response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('x-ratelimit-remaining') || response.headers.get('X-RateLimit-Remaining'),
    reset: response.headers.get('x-ratelimit-reset') || response.headers.get('X-RateLimit-Reset'),
  };
}

/**
 * Invokes the actual POST handler from src/app/api/chat/route.ts.
 */
export async function invokeChatRoute(req: Request): Promise<Response> {
  const routePath = path.resolve(process.cwd(), 'src/app/api/chat/route.ts');
  const routeModule = await import(routePath);
  if (typeof routeModule.POST !== 'function') {
    throw new Error(`POST handler not exported from ${routePath}`);
  }
  return await routeModule.POST(req);
}

/**
 * Reference In-Memory Rate Limiter (Oracle) matching Upstash sliding window algorithm (10 req/60s per IP).
 */
export class SlidingWindowRateLimiterOracle {
  private maxRequests: number;
  private windowMs: number;
  private hits: Map<string, number[]>;

  constructor(maxRequests = 10, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
    this.hits = new Map();
  }

  limit(ip: string, now = Date.now()): { success: boolean; limit: number; remaining: number; reset: number } {
    const timestamps = (this.hits.get(ip) || []).filter((t) => now - t < this.windowMs);
    const success = timestamps.length < this.maxRequests;

    if (success) {
      timestamps.push(now);
      this.hits.set(ip, timestamps);
    }

    const oldest = timestamps[0] || now;
    const reset = oldest + this.windowMs;
    const remaining = Math.max(0, this.maxRequests - timestamps.length);

    return {
      success,
      limit: this.maxRequests,
      remaining,
      reset,
    };
  }

  resetAll(): void {
    this.hits.clear();
  }
}
