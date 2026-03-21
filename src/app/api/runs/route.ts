// src/app/api/runs/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateRunSchema } from '@/schemas/run.schema'
import { executeWorkflow } from '@/lib/execution-engine'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = CreateRunSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  const { workflowId, scope, nodeIds, nodeId } = result.data

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
  })
  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })

  const allNodes = workflow.nodesJson as any[]
  const allEdges = workflow.edgesJson as any[]

  let targetNodeIds: string[]
  if (scope === 'FULL') {
    targetNodeIds = allNodes.map(n => n.id)
  } else if (scope === 'SELECTED') {
    targetNodeIds = nodeIds!
  } else {
    targetNodeIds = [nodeId!]
  }

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      scope,
      status: 'RUNNING',
      nodeIds: targetNodeIds,
      nodeResults: {
        create: targetNodeIds.map(nId => {
          const node = allNodes.find(n => n.id === nId)
          return {
            nodeId: nId,
            nodeType: node?.type ?? 'unknown',
            nodeLabel: node?.data?.label ?? nId,
            status: 'RUNNING',
            inputs: null,
          }
        }),
      },
    },
    include: { nodeResults: true },
  })

  // Start execution async — don't await
  executeWorkflow(allNodes, allEdges, targetNodeIds, run.id, run.nodeResults)
    .catch(err => {
      console.error('Execution failed:', err)
      prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', completedAt: new Date() },
      })
    })

  return NextResponse.json({ runId: run.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workflowId = searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 })

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId, userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { nodeResults: { orderBy: { startedAt: 'asc' } } },
  })

  return NextResponse.json({ runs })
}
