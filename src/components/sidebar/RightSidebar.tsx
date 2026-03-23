'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight, ChevronLeft, History, Loader2, ArrowLeft, Clock, Activity } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import type { NodeResult, WorkflowRun } from '@/types/workflow'
import { RUN_HISTORY_REFRESH_EVENT, RUN_STARTED_EVENT } from '@/lib/run-events'

function getWorkflowIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/workflows\/([^/]+)\/?$/)
  return match?.[1] ?? null
}

function getStatusClasses(status: WorkflowRun['status']): string {
  if (status === 'SUCCESS') return 'text-krea-success bg-krea-success/10 border-krea-success/20'
  if (status === 'FAILED') return 'text-krea-error bg-krea-error/10 border-krea-error/20'
  if (status === 'PARTIAL') return 'text-krea-warning bg-krea-warning/10 border-krea-warning/20'
  return 'text-krea-accent bg-krea-accent/10 border-krea-accent/20'
}

function getScopeLabel(scope: WorkflowRun['scope']): string {
  if (scope === 'FULL') return 'Full Run'
  if (scope === 'SINGLE') return 'Single Node'
  return 'Selected Nodes'
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
  if (status === 'SUCCESS') return 'text-krea-success border-krea-success/20 bg-krea-success/10'
  if (status === 'FAILED') return 'text-krea-error border-krea-error/20 bg-krea-error/10'
  return 'text-krea-accent border-krea-accent/20 bg-krea-accent/10'
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
        'h-full bg-krea-surface border-l border-krea-border flex flex-col transition-all duration-300 shadow-krea overflow-hidden',
        rightSidebarOpen ? 'w-80' : 'w-[72px]'
      )}
    >
      {rightSidebarOpen ? (
        <>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <History size={18} className="text-krea-accent" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">History</h2>
            </div>
            <button
              onClick={toggleRightSidebar}
              className="p-1.5 rounded-xl text-krea-muted hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
            {!workflowId && (
              <div className="text-center py-12 px-4 opacity-40">
                <History size={32} className="mx-auto mb-3" />
                <p className="text-sm">Open a workflow to view runs</p>
              </div>
            )}

            {workflowId && isLoading && runs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-krea-muted gap-3">
                <Loader2 size={24} className="animate-spin text-krea-accent" />
                <span className="text-xs font-medium">Loading history...</span>
              </div>
            )}

            {workflowId && !isLoading && runs.length === 0 && (
              <div className="text-center py-12 px-4 opacity-40">
                <History size={32} className="mx-auto mb-3" />
                <p className="text-sm">No runs yet</p>
                <p className="text-xs mt-1">Run a workflow to see history here</p>
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
                    'w-full text-left rounded-2xl border p-4 transition-all duration-200 group relative overflow-hidden',
                    isSelected
                      ? 'border-krea-accent bg-krea-accent/5'
                      : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                  )}
                >
                  {/* Top Row: Scope & Time */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white uppercase tracking-tight">
                      {getScopeLabel(run.scope)}
                    </span>
                    <span className="text-[10px] text-krea-muted font-medium">
                      {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Middle Row: Duration & Nodes Count */}
                  <div className="flex items-center gap-3 text-[10px] text-krea-muted mb-3">
                    <span className="flex items-center gap-1 font-mono">
                      {formatDuration(run.durationMs)}
                    </span>
                    <span className="flex items-center gap-1 opacity-60">
                      {completed}/{total} nodes
                    </span>
                  </div>
                  
                  {/* Bottom Row: ID & Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-krea-muted group-hover:text-krea-text-secondary transition-colors uppercase">
                      ID: {run.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight border', getStatusClasses(run.status))}>
                      {run.status}
                    </span>
                  </div>
                </button>
              )
            })}

            {selectedRun && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                  onClick={() => setSelectedRunId(null)}
                  className="group flex items-center gap-2 text-xs font-bold text-krea-muted hover:text-white transition-all mb-2"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  BACK TO HISTORY
                </button>

                <div className="rounded-2xl border border-krea-accent/30 bg-krea-accent/5 p-4 shadow-lg shadow-krea-accent/10">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-[10px] font-mono font-bold text-krea-accent-light">
                      RUN DETAILS / {selectedRun.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight border', getStatusClasses(selectedRun.status))}>
                      {selectedRun.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-krea-muted mb-0.5">Scope</span>
                      <span className="text-white font-bold">{getScopeLabel(selectedRun.scope)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-krea-muted mb-0.5">Duration</span>
                      <span className="text-white font-bold">{formatDuration(selectedRun.durationMs)}</span>
                    </div>
                    <div className="flex flex-col col-span-2">
                      <span className="text-krea-muted mb-0.5">Started At</span>
                      <span className="text-white font-medium">{new Date(selectedRun.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="px-1 text-[10px] font-bold text-krea-muted uppercase tracking-[0.2em]">Nodes Timeline</p>
                  {[...selectedRun.nodeResults]
                    .sort((a, b) => (toEpoch(a.startedAt) ?? 0) - (toEpoch(b.startedAt) ?? 0))
                    .map((nodeResult) => {
                      const parsedInputs = parseJson(nodeResult.inputs)
                      const parsedOutput = parseJson(nodeResult.output)
                      return (
                        <div key={nodeResult.id} className="rounded-2xl border border-white/5 bg-white/2 p-4 hover:border-white/10 transition-colors group">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="text-sm font-bold text-white truncate">
                              {nodeResult.nodeLabel ?? nodeResult.nodeType}
                            </span>
                            <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border', nodeStatusClasses(nodeResult.status))}>
                              {nodeResult.status}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-[11px]">
                            <div className="bg-black/20 rounded-lg p-2 font-mono text-krea-text-secondary overflow-hidden max-h-24 overflow-y-auto border border-white/5">
                              <span className="text-krea-muted block mb-1">OUTPUT</span>
                              {nodeResult.error ? (
                                <span className="text-krea-error">{nodeResult.error}</span>
                              ) : (
                                <span className="whitespace-pre-wrap">{renderCompact(parsedOutput)}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] text-krea-muted font-medium pt-1">
                              <span>Offset: {formatOffset(nodeResult.startedAt, selectedRun.startedAt)}</span>
                              <span>{formatDuration(nodeResult.durationMs)}</span>
                            </div>
                          </div>
                        </div>
                      )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-6">
          <button
            onClick={toggleRightSidebar}
            className="p-3 rounded-2xl text-krea-muted hover:text-white hover:bg-white/10 transition-all font-bold"
          >
             <ChevronLeft size={20} />
          </button>
          <div className="mt-4 rotate-90 whitespace-nowrap text-[10px] font-bold text-krea-muted tracking-[0.3em] uppercase opacity-50">
            Run History
          </div>
        </div>
      )}
    </aside>
  )
}

