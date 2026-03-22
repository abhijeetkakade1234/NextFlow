import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ImportWorkflowSchema } from '@/schemas/workflow.schema'
import { Prisma } from '@prisma/client'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimit = enforceRateLimit(req, userId, {
    key: 'workflows:import',
    limit: 10,
    windowMs: 60_000,
  })
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    )
  }

  const body = await req.json()
  const parsed = ImportWorkflowSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 5).map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    return NextResponse.json(
      {
        error: 'Invalid workflow import payload',
        details: parsed.error.flatten(),
        issues,
      },
      { status: 400 }
    )
  }

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: parsed.data.name.trim() || 'Imported Workflow',
      description: parsed.data.description,
      nodesJson: parsed.data.nodesJson as Prisma.InputJsonValue,
      edgesJson: parsed.data.edgesJson as Prisma.InputJsonValue,
      viewport: parsed.data.viewport as Prisma.InputJsonValue | undefined,
    },
    select: { id: true },
  })

  return NextResponse.json({ workflowId: workflow.id }, { status: 201 })
}
