// src/components/sidebar/RightSidebar.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight, ChevronLeft, History, Loader2, ArrowLeft } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { NodeResult, WorkflowRun } from '@/types/workflow'
import { RUN_HISTORY_REFRESH_EVENT, RUN_STARTED_EVENT } from '@/lib/run-events'

function getWorkflowIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/workflows\/([^/]+)\/?$/)
  return match?.[1] ?? null
}

function getStatusClasses(status: WorkflowRun['status']): string {
  if (status === 'SUCCESS') return 'text-green-400 bg-green-500/10 border-green-500/20'
  if (status === 'FAILED') return 'text-red-400 bg-red-500/10 border-red-500/20'
  if (status === 'PARTIAL') return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
}

function getScopeLabel(scope: WorkflowRun['scope']): string {
  if (scope === 'FULL') return 'Full'
  if (scope === 'SINGLE') return 'Single'
  return 'Selected'
}

function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '--'
  return `${(durationMs / 1000).toFixed(1)}s`
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function renderCompact(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function nodeStatusClasses(status: NodeResult['status']): string {
  if (status === 'SUCCESS') return 'text-green-400 border-green-500/20 bg-green-500/10'
  if (status === 'FAILED') return 'text-red-400 border-red-500/20 bg-red-500/10'
  return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
}

function toEpoch(value?: string): number | null {
  if (!value) return null
  const ts = Date.parse(value)
  return Number.isFinite(ts) ? ts : null
}

function formatOffset(startedAt: string | undefined, runStartedAt: string): string {
  const runStart = toEpoch(runStartedAt)
  const nodeStart = toEpoch(startedAt)
  if (runStart === null || nodeStart === null) return '--'
  const seconds = Math.max(0, (nodeStart - runStart) / 1000)
  return `+${seconds.toFixed(1)}s`
}

export function RightSidebar() {
  const pathname = usePathname()
  const workflowId = useMemo(() => getWorkflowIdFromPath(pathname), [pathname])
  const { rightSidebarOpen, toggleRightSidebar, selectedRunId, setSelectedRunId } = useUIStore()
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null

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
    window.addEventListener(RUN_HISTORY_REFRESH_EVENT, onRunStarted)

    return () => {
      active = false
      if (timer) clearInterval(timer)
      window.removeEventListener(RUN_STARTED_EVENT, onRunStarted)
      window.removeEventListener(RUN_HISTORY_REFRESH_EVENT, onRunStarted)
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
              if (selectedRun) return null
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
                  <div className="mt-2 flex items-center justify-between text-xs text-[#9ca3af]">
                    <span>{getScopeLabel(run.scope)}</span>
                    <span>{formatDuration(run.durationMs)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[#6b7280]">
                    <span>{completed}/{total} nodes</span>
                    <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                  </div>
                </button>
              )
            })}

            {selectedRun && (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedRunId(null)}
                  className="w-full flex items-center gap-2 text-xs text-[#9ca3af] hover:text-[#e5e5e5]
                             px-2 py-1 rounded border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors"
                >
                  <ArrowLeft size={12} /> Back to runs
                </button>
                <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[#9ca3af]">
                      Run {selectedRun.id.slice(-8)}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border uppercase', getStatusClasses(selectedRun.status))}>
                      {selectedRun.status}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#6b7280]">
                    <div>Scope: <span className="text-[#9ca3af]">{getScopeLabel(selectedRun.scope)}</span></div>
                    <div>Duration: <span className="text-[#9ca3af]">{formatDuration(selectedRun.durationMs)}</span></div>
                    <div className="col-span-2">
                      Started: <span className="text-[#9ca3af]">{new Date(selectedRun.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {[...selectedRun.nodeResults]
                  .sort((a, b) => {
                    const aTs = toEpoch(a.startedAt) ?? 0
                    const bTs = toEpoch(b.startedAt) ?? 0
                    return aTs - bTs
                  })
                  .map((nodeResult) => {
                  const parsedInputs = parseJson(nodeResult.inputs)
                  const parsedOutput = parseJson(nodeResult.output)
                  return (
                    <div key={nodeResult.id} className="rounded-lg border border-[#1f1f1f] bg-[#101010] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#e5e5e5] truncate">
                          {nodeResult.nodeLabel ?? nodeResult.nodeType}
                        </span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border uppercase', nodeStatusClasses(nodeResult.status))}>
                          {nodeResult.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-[#9ca3af]">
                        <p className="truncate">Inputs: {renderCompact(parsedInputs)}</p>
                        {nodeResult.error ? (
                          <p className="truncate text-red-400 mt-1">Error: {nodeResult.error}</p>
                        ) : (
                          <p className="truncate mt-1">Output: {renderCompact(parsedOutput)}</p>
                        )}
                        <p className="text-[#6b7280] mt-1">Node duration: {formatDuration(nodeResult.durationMs)}</p>
                        <p className="text-[#6b7280] mt-1">
                          Start offset: {formatOffset(nodeResult.startedAt, selectedRun.startedAt)}
                        </p>
                        <p className="text-[#6b7280] mt-1 truncate">
                          Started: {nodeResult.startedAt ? new Date(nodeResult.startedAt).toLocaleTimeString() : '--'}
                        </p>
                        <p className="text-[#6b7280] mt-1 truncate">
                          Completed: {nodeResult.completedAt ? new Date(nodeResult.completedAt).toLocaleTimeString() : '--'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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
