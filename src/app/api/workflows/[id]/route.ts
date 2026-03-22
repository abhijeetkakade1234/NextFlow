// src/app/api/workflows/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateWorkflowSchema } from '@/schemas/workflow.schema'
import { Prisma } from '@prisma/client'
import { enforceRateLimit } from '@/lib/rate-limit'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
    include: {
      runs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          nodeResults: {
            orderBy: { startedAt: 'asc' },
          },
        },
      },
    },
  })

  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ workflow })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = enforceRateLimit(req, userId, {
    key: 'workflows:update',
    limit: 120,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    )
  }

  const body = await req.json()
  const result = UpdateWorkflowSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  const updateData: Prisma.WorkflowUpdateManyMutationInput = {
    ...(result.data.name !== undefined ? { name: result.data.name } : {}),
    ...(result.data.nodesJson !== undefined
      ? { nodesJson: result.data.nodesJson as Prisma.InputJsonValue }
      : {}),
    ...(result.data.edgesJson !== undefined
      ? { edgesJson: result.data.edgesJson as Prisma.InputJsonValue }
      : {}),
    ...(result.data.viewport !== undefined
      ? { viewport: result.data.viewport as Prisma.InputJsonValue }
      : {}),
  }

  const updated = await prisma.workflow.updateMany({
    where: { id, userId },
    data: updateData,
  })

  if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.workflow.deleteMany({
    where: { id, userId },
  })

  return NextResponse.json({ success: true })
}
