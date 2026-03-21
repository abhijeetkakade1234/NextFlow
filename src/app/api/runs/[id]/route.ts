// src/app/api/runs/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const run = await prisma.workflowRun.findFirst({
    where: { id, userId },
    include: {
      nodeResults: { orderBy: { startedAt: 'asc' } },
    },
  })

  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ run })
}
