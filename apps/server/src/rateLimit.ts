import type { Request, RequestHandler } from 'express'

interface RateLimitOptions {
  keyPrefix: string
  max: number
  windowMs: number
  skip?: (req: Request) => boolean
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function createRateLimit({ keyPrefix, max, windowMs, skip }: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    if (skip?.(req)) {
      next()
      return
    }

    const now = Date.now()
    if (buckets.size > 10_000) pruneExpired(now)

    const key = `${keyPrefix}:${clientKey(req)}`
    const current = buckets.get(key)
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs }
    const remaining = Math.max(0, max - bucket.count - 1)
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000)

    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count >= max) {
      res.setHeader('Retry-After', String(resetSeconds))
      res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' })
      return
    }

    bucket.count += 1
    buckets.set(key, bucket)
    next()
  }
}
