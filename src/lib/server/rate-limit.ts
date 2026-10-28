import { isIP } from "node:net";

import { appMode, ConfigurationError } from "@/lib/server/env";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  zyrvaRateLimitBuckets?: Map<string, Bucket>;
};

const buckets = globalForRateLimit.zyrvaRateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.zyrvaRateLimitBuckets = buckets;
const MAX_BUCKETS = 10_000;

function evictBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
  now = Date.now(),
): RateLimitResult {
  evictBuckets(now);
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  const allowed = bucket.count <= options.limit;
  return {
    allowed,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function requestIp(request: Request): string {
  if (process.env.TRUST_PROXY !== "true") {
    if (appMode() === "production") throw new ConfigurationError("TRUST_PROXY");
    return "direct";
  }
  const candidate =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "proxy-unknown";
}

export function resetRateLimitsForTests(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) buckets.clear();
}
