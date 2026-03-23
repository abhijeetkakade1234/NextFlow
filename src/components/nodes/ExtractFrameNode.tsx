// src/components/nodes/ExtractFrameNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Film } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { ExtractFrameFlowNode } from '@/types/nodes'
import { emitRunStarted } from '@/lib/run-events'

export function ExtractFrameNode({ id, data }: NodeProps<ExtractFrameFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const edges = useEdges()

  const timestampConnected = edges.some(e => e.target === id && e.targetHandle === 'timestamp')

  const handleRun = async () => {
    updateNodeData(id, { isRunning: true, error: null, result: null })
    try {
      const workflowId = (window as any).__currentWorkflowId
      if (!workflowId) {
        updateNodeData(id, { isRunning: false, error: 'Save workflow first' })
        return
      }
      const res = await fetch('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ workflowId, scope: 'SINGLE', nodeId: id }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        updateNodeData(id, { isRunning: false, error: data.error ?? 'Run failed' })
        return
      }
      emitRunStarted(data.runId, [id])
    } catch {
      updateNodeData(id, { isRunning: false, error: 'Failed to start run' })
    }
  }

  return (
    <BaseNode id={id} title="Frame Extractor" icon={<Film size={18} />} onRun={handleRun}>
      <div className="flex flex-col gap-5">
        {/* Video input handle */}
        <div className="relative bg-white/5 rounded-2xl px-4 py-3 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film size={12} className="text-krea-muted" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Video Stream</span>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-bold text-red-400 uppercase">Input</span>
             <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          </div>
          <Handle
            type="target"
            position={Position.Left}
            id="video_url"
            data-handletype="video_url"
            className="!bg-red-500"
          />
        </div>

        {/* Timestamp input */}
        <div className="relative group/input">
           <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">Seek Time</span>
           </div>
           
           <div className="relative">
            <input
              type="text"
              value={data.timestamp}
              onChange={e => updateNodeData(id, { timestamp: e.target.value })}
              disabled={timestampConnected}
              placeholder='e.g. 5 or "50%"'
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3
                         text-sm font-bold text-white placeholder-white/20 outline-none
                         focus:border-krea-accent/50 transition-all nodrag disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <Handle
              type="target"
              position={Position.Left}
              id="timestamp"
              data-handletype="text"
              className="opacity-0 group-hover/input:opacity-100 transition-opacity"
            />
           </div>
           <p className="text-[9px] text-krea-muted mt-2 px-1 uppercase tracking-tighter">Enter seconds or percentage (e.g. 50%)</p>
        </div>

        {/* Preview */}
        {data.result ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="aspect-video w-full rounded-[24px] overflow-hidden border border-white/10 shadow-xl bg-black/40">
              <img src={data.result} alt="Extracted frame" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[24px] opacity-20">
             <span className="text-[9px] font-bold text-white uppercase tracking-widest">Frame will appear here</span>
          </div>
        )}

        {data.error && (
          <div className="bg-krea-error/10 border border-krea-error/20 rounded-2xl p-3">
            <p className="text-[10px] font-bold text-krea-error uppercase tracking-widest text-center">{data.error}</p>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="image_url"
        className="!bg-blue-500"
      />
    </BaseNode>
  )
}

export default ExtractFrameNode

