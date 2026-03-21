// src/app/api/workflows/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateWorkflowSchema } from '@/schemas/workflow.schema'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { runs: true } },
    },
  })

  return NextResponse.json({ workflows })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = CreateWorkflowSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  const workflow = await prisma.workflow.create({
    data: { ...result.data, userId },
  })

  return NextResponse.json({ workflow }, { status: 201 })
}
