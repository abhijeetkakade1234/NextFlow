import { NextRequest } from 'next/server'

type RateLimitConfig = {
  key: string
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function cleanup(now: number): void {
  if (buckets.size < 2000) return
  for (const [k, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(k)
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function enforceRateLimit(
  req: NextRequest,
  userId: string | null | undefined,
  config: RateLimitConfig
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  cleanup(now)

  const actor = userId ?? getClientIp(req)
  const bucketKey = `${config.key}:${actor}`
  const current = buckets.get(bucketKey)

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + config.windowMs })
    return { ok: true }
  }

  if (current.count >= config.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return { ok: false, retryAfterSec }
  }

  current.count += 1
  return { ok: true }
}
