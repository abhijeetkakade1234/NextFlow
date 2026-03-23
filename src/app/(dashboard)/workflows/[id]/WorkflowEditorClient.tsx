// src/app/(dashboard)/workflows/[id]/WorkflowEditorClient.tsx
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'
import { useExecutionStore } from '@/store/execution-store'
import { useUIStore } from '@/store/ui-store'
import { LeftSidebar } from '@/components/sidebar/LeftSidebar'
import { RightSidebar } from '@/components/sidebar/RightSidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomToolbar } from '@/components/canvas/BottomToolbar'
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas'
import { useAutoSave } from '@/hooks/useAutoSave'
import { ReactFlowProvider, type Edge, type Viewport } from '@xyflow/react'
import type { AppNode } from '@/types/nodes'
import type { NodeResult } from '@/types/workflow'
import { RUN_STARTED_EVENT, emitRunHistoryRefresh, type RunStartedDetail } from '@/lib/run-events'
import { SAMPLE_EDGES, SAMPLE_NODES, SAMPLE_VIEWPORT, SAMPLE_WORKFLOW_NAME } from '@/lib/sample-workflow'

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
    setWorkflowId, setWorkflowName, setIsSaving, loadWorkflow, updateNodeData, markClean,
    nodes, edges,
  } = useWorkflowStore()
  const { selectedNodeIds, setSelectedNodeIds } = useUIStore()
  const {
    isRunning, startRun, resetExecution,
    setNodeStatus, setNodeOutput, setNodeError, completeRun,
  } = useExecutionStore()
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const importFileInputRef = useRef<HTMLInputElement | null>(null)
  const lastPersistedNameRef = useRef(initialName)
  const [notice, setNotice] = useState<string | null>(null)

  const parseErrorMessage = async (res: Response, fallback: string): Promise<string> => {
    const retryAfter = res.headers.get('Retry-After')
    const retryHint = retryAfter ? ` Retry in ~${retryAfter}s.` : ''
    const payload = await res.json().catch(() => null)
    if (payload?.error && typeof payload.error === 'string') {
      return `${payload.error}${retryHint}`
    }
    return `${fallback}${retryHint}`
  }

  // Initialize store on mount
  useEffect(() => {
    setWorkflowId(workflowId)
    setWorkflowName(initialName)
    loadWorkflow(initialNodes, initialEdges, initialViewport)
    lastPersistedNameRef.current = initialName
    setSelectedNodeIds([])
  }, [workflowId])

  // Auto-save hook
  useAutoSave({
    onError: (message: string) => setNotice(message),
  })

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handler = (evt: Event) => {
      const customEvt = evt as CustomEvent<RunStartedDetail>
      const detail = customEvt.detail
      if (!detail?.runId) return

      startRun(detail.runId, detail.nodeIds)
      startRunPolling(detail.runId)
    }

    window.addEventListener(RUN_STARTED_EVENT, handler)
    return () => window.removeEventListener(RUN_STARTED_EVENT, handler)
  }, [startRun])

  const applyNodeResult = (nodeResult: NodeResult) => {
    if (nodeResult.status === 'RUNNING') {
      setNodeStatus(nodeResult.nodeId, 'running')
      updateNodeData(nodeResult.nodeId, { isRunning: true, error: null } as any)
      return
    }

    if (nodeResult.status === 'FAILED') {
      setNodeStatus(nodeResult.nodeId, 'error')
      setNodeError(nodeResult.nodeId, nodeResult.error ?? 'Run failed')
      updateNodeData(nodeResult.nodeId, {
        isRunning: false,
        error: nodeResult.error ?? 'Run failed',
      } as any)
      return
    }

    // SUCCESS
    let parsedOutput: unknown = nodeResult.output
    if (typeof parsedOutput === 'string') {
      try {
        parsedOutput = JSON.parse(parsedOutput)
      } catch {
        // leave as raw string
      }
    }

    const textOutput =
      typeof parsedOutput === 'object' && parsedOutput !== null && 'text' in parsedOutput
        ? String((parsedOutput as Record<string, unknown>).text ?? '')
        : ''

    const urlOutput =
      typeof parsedOutput === 'object' && parsedOutput !== null && 'url' in parsedOutput
        ? String((parsedOutput as Record<string, unknown>).url ?? '')
        : ''

    if (textOutput) {
      setNodeOutput(nodeResult.nodeId, textOutput)
      updateNodeData(nodeResult.nodeId, { isRunning: false, error: null, result: textOutput } as any)
    } else if (urlOutput) {
      setNodeOutput(nodeResult.nodeId, urlOutput)
      updateNodeData(nodeResult.nodeId, { isRunning: false, error: null, result: urlOutput } as any)
    } else {
      setNodeStatus(nodeResult.nodeId, 'success')
      updateNodeData(nodeResult.nodeId, { isRunning: false, error: null } as any)
    }
  }

  const startRunPolling = (runId: string) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`)
        if (!res.ok) return

        const data = await res.json()
        const run = data.run as { status: string; nodeResults: NodeResult[] }
        if (!run) return

        for (const nodeResult of run.nodeResults) {
          applyNodeResult(nodeResult)
        }

        if (run.status !== 'RUNNING') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current)
            pollTimerRef.current = null
          }
          completeRun()
        }
      } catch {
        // Keep polling; transient fetch errors should not break run UI.
      }
    }

    poll()
    pollTimerRef.current = setInterval(poll, 1200)
  }

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
        startRunPolling(data.runId)
        emitRunHistoryRefresh()
      } else {
        const retryHint = res.headers.get('Retry-After')
        setNotice(
          `${data?.error ?? `Run failed (${res.status})`}${retryHint ? ` Retry in ~${retryHint}s.` : ''}`
        )
      }
    } catch (err) {
      console.error('Run failed', err)
      setNotice('Run failed. Please try again.')
    }
  }

  const handleRunSelected = async () => {
    if (selectedNodeIds.length === 0) return
    resetExecution()
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          scope: 'SELECTED',
          nodeIds: selectedNodeIds,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        startRun(data.runId, selectedNodeIds)
        startRunPolling(data.runId)
        emitRunHistoryRefresh()
      } else {
        const retryHint = res.headers.get('Retry-After')
        setNotice(
          `${data?.error ?? `Selected run failed (${res.status})`}${retryHint ? ` Retry in ~${retryHint}s.` : ''}`
        )
      }
    } catch (err) {
      console.error('Selected run failed', err)
      setNotice('Selected run failed. Please try again.')
    }
  }

  const persistWorkflowName = useCallback(async () => {
    const normalizedName = workflowName.trim() || 'Untitled Workflow'
    if (normalizedName === lastPersistedNameRef.current) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName }),
      })
      if (!res.ok) {
        setNotice(await parseErrorMessage(res, `Failed to rename workflow (${res.status}).`))
        return
      }
      setWorkflowName(normalizedName)
      lastPersistedNameRef.current = normalizedName
    } finally {
      setIsSaving(false)
    }
  }, [workflowId, workflowName, setIsSaving, setWorkflowName])

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

  const saveWorkflowSnapshot = useCallback(async (
    nextName: string,
    nextNodes: AppNode[],
    nextEdges: Edge[],
    nextViewport?: Viewport
  ) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          nodesJson: nextNodes,
          edgesJson: nextEdges,
          viewport: nextViewport,
        }),
      })
      if (!res.ok) throw new Error(await parseErrorMessage(res, `Failed to save workflow snapshot (${res.status}).`))
      markClean()
      lastPersistedNameRef.current = nextName
    } finally {
      setIsSaving(false)
    }
  }, [workflowId, setIsSaving, markClean])

  const handleLoadSample = async () => {
    const sampleName = SAMPLE_WORKFLOW_NAME
    setWorkflowName(sampleName)
    loadWorkflow(SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_VIEWPORT)
    await saveWorkflowSnapshot(sampleName, SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_VIEWPORT)
  }

  const handleImportFile = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text) as {
      name?: string
      nodesJson?: AppNode[]
      edgesJson?: Edge[]
      viewport?: Viewport
    }

    const importedName = (parsed.name ?? 'Imported Workflow').trim() || 'Imported Workflow'
    const importedNodes = Array.isArray(parsed.nodesJson) ? parsed.nodesJson : []
    const importedEdges = Array.isArray(parsed.edgesJson) ? parsed.edgesJson : []
    const importedViewport = parsed.viewport

    setWorkflowName(importedName)
    loadWorkflow(importedNodes, importedEdges, importedViewport)
    await saveWorkflowSnapshot(importedName, importedNodes, importedEdges, importedViewport)
  }

  return (
    <ReactFlowProvider>
      <div className="flex w-screen h-screen bg-krea-bg overflow-hidden relative">
        <LeftSidebar />
        
        <main className="flex-1 relative flex flex-col h-full overflow-hidden">
          <TopBar />
          
          <div className="flex-1 relative">
            {notice && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] min-w-[320px] rounded-xl border border-red-500/30 bg-krea-surface backdrop-blur-md px-4 py-3 text-xs text-red-300 flex items-start justify-between gap-4 shadow-krea">
                <span className="break-words">{notice}</span>
                <button
                  onClick={() => setNotice(null)}
                  className="text-red-300/70 hover:text-red-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Canvas Area */}
            <div className="w-full h-full relative">
              <WorkflowCanvas workflowId={workflowId} />
              <BottomToolbar />
            </div>
          </div>
        </main>

        <RightSidebar />
      </div>
    </ReactFlowProvider>
  )
}
