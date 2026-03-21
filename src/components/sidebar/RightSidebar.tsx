// src/components/sidebar/RightSidebar.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight, ChevronLeft, History, Loader2 } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { WorkflowRun } from '@/types/workflow'
import { RUN_STARTED_EVENT } from '@/lib/run-events'

function getWorkflowIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/workflows\/([^/]+)\/?$/)
  return match?.[1] ?? null
}

function getStatusClasses(status: WorkflowRun['status']): string {
  if (status === 'SUCCESS') return 'text-green-400 bg-green-500/10 border-green-500/20'
  if (status === 'FAILED') return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (status === 'PARTIAL') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
}

export function RightSidebar() {
  const pathname = usePathname()
  const workflowId = useMemo(() => getWorkflowIdFromPath(pathname), [pathname])
  const { rightSidebarOpen, toggleRightSidebar, selectedRunId, setSelectedRunId } = useUIStore()
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!workflowId) {
      setRuns([])
      setSelectedRunId(null)
      return
    }

    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    const fetchRuns = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/runs?workflowId=${workflowId}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        const nextRuns = Array.isArray(data.runs) ? data.runs : []
        setRuns(nextRuns)

        const hasRunning = nextRuns.some((run: WorkflowRun) => run.status === 'RUNNING')
        if (hasRunning && !timer) {
          timer = setInterval(fetchRuns, 2500)
        }
        if (!hasRunning && timer) {
          clearInterval(timer)
          timer = null
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const onRunStarted = () => {
      void fetchRuns()
    }

    void fetchRuns()
    window.addEventListener(RUN_STARTED_EVENT, onRunStarted)

    return () => {
      active = false
      if (timer) clearInterval(timer)
      window.removeEventListener(RUN_STARTED_EVENT, onRunStarted)
    }
  }, [workflowId, setSelectedRunId])

  return (
    <aside
      className={cn(
        'h-full bg-[#111111] border-l border-[#1f1f1f] flex flex-col transition-all duration-200 flex-shrink-0',
        rightSidebarOpen ? 'w-72' : 'w-12'
      )}
    >
      {rightSidebarOpen ? (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={14} className="text-[#7c3aed]" />
              <h2 className="text-sm font-semibold text-[#e5e5e5]">Run History</h2>
            </div>
            <button
              onClick={toggleRightSidebar}
              className="p-1 rounded text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!workflowId && (
              <div className="text-center py-10 px-3">
                <History size={28} className="text-[#1f1f1f] mx-auto mb-2" />
                <p className="text-sm text-[#6b7280]">Open a workflow to view runs</p>
              </div>
            )}

            {workflowId && isLoading && runs.length === 0 && (
              <div className="flex items-center justify-center py-8 text-[#6b7280] text-sm gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading runs...
              </div>
            )}

            {workflowId && !isLoading && runs.length === 0 && (
              <div className="text-center py-10 px-3">
                <History size={28} className="text-[#1f1f1f] mx-auto mb-2" />
                <p className="text-sm text-[#6b7280]">No runs yet</p>
                <p className="text-xs text-[#6b7280] mt-1">Run a workflow to see history here</p>
              </div>
            )}

            {runs.map((run) => {
              const isSelected = run.id === selectedRunId
              const completed = run.nodeResults.filter(n => n.status !== 'RUNNING').length
              const total = run.nodeResults.length
              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={cn(
                    'w-full text-left rounded-lg border p-2.5 transition-colors',
                    isSelected
                      ? 'border-[#7c3aed] bg-[#161616]'
                      : 'border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#141414]'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[#9ca3af] font-mono truncate">{run.id.slice(-8)}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border uppercase', getStatusClasses(run.status))}>
                      {run.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6b7280]">
                    <span>{completed}/{total} nodes</span>
                    <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-3">
          <button
            onClick={toggleRightSidebar}
            className="p-2 rounded-lg text-[#6b7280] hover:text-[#e5e5e5] hover:bg-[#161616] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}
