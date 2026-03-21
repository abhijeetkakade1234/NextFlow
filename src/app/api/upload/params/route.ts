// src/app/api/upload/params/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { UploadParamsSchema } from '@/schemas/upload.schema'
import { createTransloaditParams } from '@/lib/transloadit'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = UploadParamsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { params, signature } = createTransloaditParams(result.data.fileType)
  return NextResponse.json({ params, signature })
}
