// src/app/api/workflows/[id]/export/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
    select: { name: true, nodesJson: true, edgesJson: true, viewport: true },
  })

  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(
    JSON.stringify({ ...workflow, exportedAt: new Date().toISOString() }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${workflow.name.replace(/\s+/g, '_')}.json"`,
      },
    }
  )
}
