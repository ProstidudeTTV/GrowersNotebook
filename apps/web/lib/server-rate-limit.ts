type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
  var __gnRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!globalThis.__gnRateLimitStore) {
    globalThis.__gnRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return globalThis.__gnRateLimitStore;
}

function pruneExpired(now: number) {
  const store = getStore();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    const ip = first?.trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  return "unknown";
}

export function takeRateLimit(opts: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  pruneExpired(now);

  const store = getStore();
  const bucketKey = `${opts.bucket}:${opts.key}`;
  const current = store.get(bucketKey);

  if (!current || current.resetAt <= now) {
    const next: RateLimitEntry = {
      count: 1,
      resetAt: now + opts.windowMs,
    };
    store.set(bucketKey, next);
    return {
      ok: true,
      remaining: Math.max(0, opts.limit - next.count),
      retryAfterSec: Math.ceil(opts.windowMs / 1000),
    };
  }

  if (current.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(bucketKey, current);
  return {
    ok: true,
    remaining: Math.max(0, opts.limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
