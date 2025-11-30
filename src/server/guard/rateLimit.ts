export type RateKey = { scope: 'ip' | 'hub'; key: string; windowSec: number; max: number };

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit({ scope, key, windowSec, max }: RateKey) {
  const now = Date.now();
  const id = `${scope}:${key}:${windowSec}`;
  const bucket = buckets.get(id) ?? { count: 0, resetAt: now + windowSec * 1000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowSec * 1000;
  }
  bucket.count += 1;
  buckets.set(id, bucket);
  return {
    allowed: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function clientIpFromHeaders(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

