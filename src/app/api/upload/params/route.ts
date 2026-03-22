// src/app/api/upload/params/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { UploadParamsSchema } from '@/schemas/upload.schema'
import { createTransloaditParams } from '@/lib/transloadit'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = enforceRateLimit(req, userId, {
    key: 'upload:params',
    limit: 60,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    )
  }

  const body = await req.json()
  const result = UploadParamsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { params, paramsString, signature } = createTransloaditParams(result.data.fileType)
  return NextResponse.json({ params, paramsString, signature })
}
