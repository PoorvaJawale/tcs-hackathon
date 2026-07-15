/** In-memory sliding-window rate limiter (per IP). Suitable for a single-
 *  instance hackathon deployment; swap for Redis/Upstash in production. */

const WINDOW_MS = 60_000;
const LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10);

const hits = new Map<string, number[]>();

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || "local";
}

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= LIMIT) {
    const retryAfterSec = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000);
    hits.set(key, timestamps);
    return { ok: false, retryAfterSec };
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true, retryAfterSec: 0 };
}
