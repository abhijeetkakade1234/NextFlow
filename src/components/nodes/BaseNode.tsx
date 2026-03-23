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
        'min-w-[320px] rounded-[32px] border border-white/5 bg-krea-surface backdrop-blur-md',
        'transition-all duration-300 shadow-krea group/node ring-1 ring-white/5',
        isRunning && 'animate-pulse-glow ring-krea-accent ring-2',
        className
      )}
    >
      {/* Header - Integrated */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-krea-muted uppercase tracking-[0.2em] mb-0.5">Node</span>
            <div className="flex items-center gap-2">
              <div className={cn(
                'text-krea-accent transition-colors',
                isRunning && 'text-krea-accent'
              )}>
                {isRunning ? <Loader2 size={16} className="animate-spin" /> : icon}
              </div>
              <span className="text-sm font-bold text-white tracking-tight">{title}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover/node:opacity-100 transition-opacity">
          {showRunButton && (
            <button
              onClick={onRun}
              disabled={isRunning}
              title="Run this node"
              className="p-2 rounded-xl bg-white/5 hover:bg-krea-accent hover:text-white text-krea-muted transition-all disabled:opacity-50"
            >
              <Play size={14} fill="currentColor" />
            </button>
          )}
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            title="Delete node"
            className="p-2 rounded-xl bg-white/5 hover:bg-krea-error hover:text-white text-krea-muted transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress line */}
      <div className="px-6">
        <div className="h-px w-full bg-white/5" />
      </div>

      {/* Content */}
      <div className="px-6 py-5">{children}</div>

      {/* Error/Status Footer if needed could go here */}
    </div>
  )
}

