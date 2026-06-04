import "server-only";

/*
 * Minimal in-memory fixed-window rate limiter.
 * Good enough as a baseline; on serverless it is per-instance, so for
 * production-grade limits back this with Upstash Redis (see README).
 */
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  entry.count += 1;
  const ok = entry.count <= limit;
  return { ok, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
