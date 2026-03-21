// src/app/(dashboard)/workflows/[id]/page.tsx
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { WorkflowEditorClient } from './WorkflowEditorClient'

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
  })
  if (!workflow) notFound()

  return (
    <WorkflowEditorClient
      workflowId={workflow.id}
      initialName={workflow.name}
      initialNodes={(workflow.nodesJson as any[]) ?? []}
      initialEdges={(workflow.edgesJson as any[]) ?? []}
      initialViewport={(workflow.viewport as any) ?? undefined}
    />
  )
}
