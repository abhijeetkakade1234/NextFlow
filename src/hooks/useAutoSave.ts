// src/hooks/useAutoSave.ts
'use client'
import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'

type UseAutoSaveOptions = {
  onError?: (message: string) => void
}

function parseRetryAfter(res: Response): string {
  const retryAfter = res.headers.get('Retry-After')
  if (!retryAfter) return ''
  const seconds = Number(retryAfter)
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  return ` Retry in ~${seconds}s.`
}

export function useAutoSave(options?: UseAutoSaveOptions) {
  const { workflowId, workflowName, nodes, edges, viewport, isDirty, setIsSaving, markClean } = useWorkflowStore()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!isDirty || !workflowId) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        const res = await fetch(`/api/workflows/${workflowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflowName.trim() || 'Untitled Workflow',
            nodesJson: Array.isArray(nodes) ? nodes : [],
            edgesJson: Array.isArray(edges) ? edges : [],
            viewport: viewport || { x: 0, y: 0, zoom: 1 },
          }),
        })
        if (!res.ok) {
          const details = await res.json().catch(() => null)
          const suffix = parseRetryAfter(res)
          throw new Error(
            `Auto-save failed (${res.status})${suffix}${details ? ` ${JSON.stringify(details)}` : ''}`.trim()
          )
        }
        markClean()
      } catch (err) {
        console.error('Auto-save failed', err)
        options?.onError?.(
          err instanceof Error ? err.message : 'Auto-save failed. Please try again.'
        )
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => clearTimeout(timerRef.current)
  }, [workflowName, nodes, edges, viewport, isDirty, workflowId, setIsSaving, markClean])
}
