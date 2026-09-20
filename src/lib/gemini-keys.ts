/**
 * Shared, cooldown-aware pool of Gemini/Google API keys.
 *
 * Reads every GEMINI_API_KEY* / GOOGLE_API_KEY* env var and tracks which
 * ones have recently failed (e.g. a 429 rate-limit) so future picks —
 * from either the chat route or the embeddings module — avoid a hot key
 * for a cooldown window instead of choosing uniformly at random.
 *
 * State is in-memory only, so it's best-effort per server instance rather
 * than a globally-consistent view. That's fine here: the failure mode
 * we're guarding against (one exhausted key still getting picked 1-in-N
 * of the time and failing the whole request) is exactly what "prefer
 * keys that haven't just failed" fixes, even without perfect global state.
 */

const COOLDOWN_MS = 60_000;

// key -> timestamp (ms) when it becomes eligible again
const cooldowns = new Map<string, number>();

function allKeys(): string[] {
  return Object.keys(process.env)
    .filter((k) => k.startsWith('GEMINI_API_KEY') || k.startsWith('GOOGLE_API_KEY'))
    .map((k) => process.env[k])
    .filter((v): v is string => Boolean(v));
}

function shuffle(arr: string[]): string[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Mark a key as having just failed (e.g. 429) — it's deprioritized for COOLDOWN_MS. */
export function reportKeyFailure(key: string) {
  cooldowns.set(key, Date.now() + COOLDOWN_MS);
}

/**
 * Get all configured keys, shuffled, with healthy (not-in-cooldown) keys
 * first. If every key is currently cooling down, falls back to the full
 * (still shuffled) list rather than throwing — better to retry a
 * recently-bad key than refuse to serve the request at all.
 */
export function getKeysHealthyFirst(): string[] {
  const keys = allKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini/Google API keys found in environment variables');
  }

  const now = Date.now();
  const healthy = keys.filter((k) => (cooldowns.get(k) ?? 0) <= now);
  const cooling = keys.filter((k) => (cooldowns.get(k) ?? 0) > now);

  return healthy.length > 0 ? shuffle(healthy) : shuffle(cooling);
}

/** Pick a single healthy key at random — for single-shot calls that won't retry. */
export function getHealthyKey(): string {
  return getKeysHealthyFirst()[0];
}

/** Heuristic: does this error look like a rate-limit / quota failure? */
export function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate.?limit|quota|resource_exhausted/i.test(msg);
}
