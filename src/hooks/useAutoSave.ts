// src/hooks/useAutoSave.ts
'use client'
import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/store/workflow-store'

export function useAutoSave() {
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
            nodesJson: nodes,
            edgesJson: edges,
            viewport,
          }),
        })
        if (!res.ok) throw new Error(`Auto-save failed (${res.status})`)
        markClean()
      } catch (err) {
        console.error('Auto-save failed', err)
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => clearTimeout(timerRef.current)
  }, [workflowName, nodes, edges, viewport, isDirty, workflowId, setIsSaving, markClean])
}
