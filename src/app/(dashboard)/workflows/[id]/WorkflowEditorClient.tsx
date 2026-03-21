// src/app/(dashboard)/workflows/[id]/WorkflowEditorClient.tsx
'use client'
import { useEffect } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'
import { useExecutionStore } from '@/store/execution-store'
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas'
import { useAutoSave } from '@/hooks/useAutoSave'
import { Loader2, Play, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import type { Edge, Viewport } from '@xyflow/react'
import type { AppNode } from '@/types/nodes'

type Props = {
  workflowId: string
  initialName: string
  initialNodes: AppNode[]
  initialEdges: Edge[]
  initialViewport?: Viewport
}

export function WorkflowEditorClient({
  workflowId, initialName, initialNodes, initialEdges, initialViewport
}: Props) {
  const {
    workflowName, isSaving, isDirty,
    setWorkflowId, setWorkflowName, loadWorkflow,
    nodes, edges,
  } = useWorkflowStore()
  const { isRunning, startRun, resetExecution } = useExecutionStore()

  // Initialize store on mount
  useEffect(() => {
    setWorkflowId(workflowId)
    setWorkflowName(initialName)
    loadWorkflow(initialNodes, initialEdges, initialViewport)
  }, [workflowId])

  // Auto-save hook
  useAutoSave()

  const handleRunAll = async () => {
    resetExecution()
    const allNodeIds = nodes.map(n => n.id)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, scope: 'FULL' }),
      })
      const data = await res.json()
      if (res.ok) {
        startRun(data.runId, allNodeIds)
      }
    } catch (err) {
      console.error('Run failed', err)
    }
  }

  const handleExport = async () => {
    const res = await fetch(`/api/workflows/${workflowId}/export`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-12 border-b border-[#1f1f1f] bg-[#111111]
                         flex items-center px-4 gap-4 flex-shrink-0">
        {/* Back button */}
        <Link
          href="/workflows"
          className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="w-px h-5 bg-[#1f1f1f]" />

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-5 h-5 bg-[#7c3aed] rounded-md" />
          <span className="text-sm font-bold text-[#e5e5e5]">NextFlow</span>
        </div>

        <div className="w-px h-5 bg-[#1f1f1f]" />

        {/* Workflow name */}
        <input
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          className="bg-transparent text-sm text-[#e5e5e5] outline-none
                     border-b border-transparent focus:border-[#1f1f1f]
                     min-w-[160px] max-w-[300px]"
        />

        {/* Save indicator */}
        {isSaving && (
          <span className="text-xs text-[#6b7280] flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" /> Saving...
          </span>
        )}
        {isDirty && !isSaving && (
          <span className="text-xs text-[#6b7280]">Unsaved</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Run all button */}
          <button
            onClick={handleRunAll}
            disabled={isRunning || nodes.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#7c3aed]
                       hover:bg-[#6d28d9] rounded-lg text-sm font-medium text-white
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {isRunning ? 'Running...' : 'Run'}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="px-3 py-1.5 border border-[#1f1f1f] hover:border-[#2a2a2a]
                       rounded-lg text-sm text-[#6b7280] hover:text-[#e5e5e5] transition-colors"
          >
            <Download size={14} />
          </button>

          <UserButton />
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <WorkflowCanvas workflowId={workflowId} />
      </div>
    </div>
  )
}
