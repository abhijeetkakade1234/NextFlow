// src/app/(dashboard)/workflows/page.tsx
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Workflow, Clock, Play, Search, ChevronDown, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ImportWorkflowButton } from './ImportWorkflowButton'

import { WorkflowListClient } from './WorkflowListClient'

async function createWorkflowAction(formData: FormData) {
  'use server'
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wf = await prisma.workflow.create({
    data: { userId, name: 'Untitled Workflow' }
  })
  redirect(`/workflows/${wf.id}`)
}

async function createFromTemplateAction(name: string, nodes: any, edges: any) {
  'use server'
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const wf = await prisma.workflow.create({
    data: {
      userId,
      name: `Template: ${name}`,
      nodesJson: nodes,
      edgesJson: edges
    }
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
      updatedAt: true,
      _count: { select: { runs: true } },
    },
  })

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      {/* Hero Section */}
      <div className="relative h-[400px] w-full overflow-hidden flex items-center px-12">
        {/* Background Banner */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://s.krea.ai/nodesHeaderBannerBlurGradient.webp"
            alt="Nodes Banner"
            className="w-full h-full object-cover opacity-90 mix-blend-screen scale-110"
          />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-blue-500/20">
              <img
                src="https://www.krea.ai/api/img?f=webp&i=https://s.krea.ai/icons/NodeEditor.png&s=256"
                alt="Node Editor"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Node Editor</h1>
          </div>
          <p className="text-lg text-white/90 leading-snug mb-8 max-w-xl font-medium">
            Nodes is the most powerful way to operate NextFlow. Connect every tool and model into complex automated pipelines.
          </p>
          <form action={createWorkflowAction}>
            <button
              type="submit"
              className="group flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-white/90 transition-all shadow-xl shadow-white/5 active:scale-95"
            >
              <span>New Workflow</span>
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" strokeWidth={3} />
            </button>
          </form>
        </div>
      </div>

      <WorkflowListClient
        initialWorkflows={workflows as any}
        createWorkflowAction={createWorkflowAction}
        createFromTemplateAction={createFromTemplateAction}
      />
    </div>
  )
}
