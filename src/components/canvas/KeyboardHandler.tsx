// src/components/canvas/KeyboardHandler.tsx
'use client'
import { useEffect } from 'react'
import { useWorkflowHistory } from '@/store/workflow-store'

export function KeyboardHandler() {
  const { undo, redo } = useWorkflowHistory()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return null
}
