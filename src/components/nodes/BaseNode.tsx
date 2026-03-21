// src/components/nodes/BaseNode.tsx
'use client'
import { ReactNode } from 'react'
import { useReactFlow } from '@xyflow/react'
import { Trash2, Play, Loader2 } from 'lucide-react'
import { useExecutionStore } from '@/store/execution-store'
import { cn } from '@/lib/utils'

type BaseNodeProps = {
  id: string
  title: string
  icon: ReactNode
  children: ReactNode
  onRun?: () => void
  showRunButton?: boolean
  className?: string
}

export function BaseNode({
  id, title, icon, children, onRun, showRunButton = true, className
}: BaseNodeProps) {
  const { deleteElements } = useReactFlow()
  const nodeStatus = useExecutionStore(s => s.nodeStatuses[id])
  const isRunning = nodeStatus === 'running'

  return (
    <div
      className={cn(
        'min-w-[280px] rounded-xl border border-[#1f1f1f] bg-[#111111]',
        'transition-all duration-200 shadow-lg',
        isRunning && 'node-running border-[#7c3aed]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <span className="text-[#7c3aed]">
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : icon}
          </span>
          <span className="text-sm font-medium text-[#e5e5e5]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {showRunButton && (
            <button
              onClick={onRun}
              disabled={isRunning}
              title="Run this node"
              className="p-1 rounded hover:bg-[#7c3aed]/20 text-[#6b7280] hover:text-[#7c3aed] transition-colors disabled:opacity-50"
            >
              <Play size={12} />
            </button>
          )}
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            title="Delete node"
            className="p-1 rounded hover:bg-red-500/20 text-[#6b7280] hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Status bar */}
      {nodeStatus && nodeStatus !== 'idle' && (
        <div className={cn(
          'h-0.5 w-full transition-all',
          nodeStatus === 'running' && 'bg-[#7c3aed]',
          nodeStatus === 'success' && 'bg-[#10b981]',
          nodeStatus === 'error' && 'bg-[#ef4444]',
        )} />
      )}

      {/* Content */}
      <div className="p-3">{children}</div>
    </div>
  )
}
