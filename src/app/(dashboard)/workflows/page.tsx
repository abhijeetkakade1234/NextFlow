// src/app/(dashboard)/workflows/page.tsx
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Workflow, Clock, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ImportWorkflowButton } from './ImportWorkflowButton'

async function createWorkflowAction() {
  'use server'
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wf = await prisma.workflow.create({
    data: { userId, name: 'Untitled Workflow' }
  })
  redirect(`/workflows/${wf.id}`)
}

export default async function WorkflowsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 overflow-auto">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#7c3aed] rounded-lg flex items-center justify-center">
              <Workflow size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e5e5e5]">NextFlow</h1>
              <p className="text-xs text-[#6b7280]">Visual LLM Workflow Builder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportWorkflowButton />
            <form action={createWorkflowAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9]
                           text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={16} />
                New Workflow
              </button>
            </form>
          </div>
        </div>

        {/* Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* New Workflow Card */}
          <form action={createWorkflowAction}>
            <button
              type="submit"
              className="w-full aspect-video border-2 border-dashed border-[#1f1f1f]
                         rounded-xl flex flex-col items-center justify-center gap-2
                         hover:border-[#7c3aed] hover:bg-[#7c3aed]/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center group-hover:bg-[#7c3aed]/20 transition-colors">
                <Plus size={20} className="text-[#6b7280] group-hover:text-[#7c3aed] transition-colors" />
              </div>
              <span className="text-sm text-[#6b7280] group-hover:text-[#7c3aed] transition-colors">New Workflow</span>
            </button>
          </form>

          {/* Existing Workflows */}
          {workflows.map((wf: (typeof workflows)[number]) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className="block aspect-video bg-[#111111] border border-[#1f1f1f] rounded-xl p-4
                         hover:border-[#2a2a2a] hover:bg-[#161616] transition-all group"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-md bg-[#7c3aed]/20 flex items-center justify-center">
                    <Workflow size={14} className="text-[#7c3aed]" />
                  </div>
                  <span className="text-xs text-[#6b7280] flex items-center gap-1">
                    <Play size={10} />
                    {wf._count.runs} run{wf._count.runs !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#e5e5e5] group-hover:text-white mt-auto line-clamp-2">
                  {wf.name}
                </h3>
                {wf.description && (
                  <p className="text-xs text-[#6b7280] mt-1 line-clamp-1">{wf.description}</p>
                )}
                <p className="text-xs text-[#6b7280] mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(wf.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {workflows.length === 0 && (
          <div className="text-center py-16 col-span-3">
            <Workflow size={48} className="text-[#1f1f1f] mx-auto mb-4" />
            <p className="text-[#6b7280]">No workflows yet. Create your first one!</p>
          </div>
        )}
      </div>
    </div>
  )
}
