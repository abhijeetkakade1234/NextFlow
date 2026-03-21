// src/components/nodes/ExtractFrameNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Film } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { ExtractFrameFlowNode } from '@/types/nodes'

export function ExtractFrameNode({ id, data }: NodeProps<ExtractFrameFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const edges = useEdges()

  const timestampConnected = edges.some(e => e.target === id && e.targetHandle === 'timestamp')

  const handleRun = async () => {
    updateNodeData(id, { isRunning: true, error: null, result: null })
    try {
      const workflowId = (window as any).__currentWorkflowId
      if (!workflowId) {
        updateNodeData(id, { isRunning: false, error: 'Save the workflow first' })
        return
      }
      await fetch('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ workflowId, scope: 'SINGLE', nodeId: id }),
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      updateNodeData(id, { isRunning: false, error: 'Failed to start run' })
    }
  }

  return (
    <BaseNode id={id} title="Extract Frame" icon={<Film size={14} />} onRun={handleRun}>
      {/* Video input handle */}
      <div className="relative mb-3">
        <Handle
          type="target"
          position={Position.Left}
          id="video_url"
          style={{ top: '50%' }}
          data-handletype="video_url"
          className="!bg-green-500 !border-2 !border-[#0a0a0a] !w-3 !h-3"
        />
        <div className="ml-4 text-xs text-[#6b7280]">Video: required</div>
      </div>

      {/* Timestamp input */}
      <div className="relative mb-3">
        <Handle
          type="target"
          position={Position.Left}
          id="timestamp"
          style={{ top: '50%' }}
          data-handletype="text"
          className="!bg-[#7c3aed] !border-2 !border-[#0a0a0a] !w-3 !h-3"
        />
        <label className="text-xs text-[#6b7280] mb-1 block ml-4">Timestamp</label>
        <input
          type="text"
          value={data.timestamp}
          onChange={e => updateNodeData(id, { timestamp: e.target.value })}
          disabled={timestampConnected}
          placeholder='e.g. 5 or "50%"'
          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2 py-1.5
                     text-xs text-[#e5e5e5] placeholder-[#6b7280] outline-none
                     focus:border-[#7c3aed] nodrag disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-[#6b7280] mt-1">Seconds (e.g. &quot;5&quot;) or percent (e.g. &quot;50%&quot;)</p>
      </div>

      {data.result && (
        <div className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.result} alt="Extracted frame" className="w-full h-24 object-cover rounded-lg border border-[#1f1f1f]" />
        </div>
      )}
      {data.error && (
        <div className="mb-2 p-2 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/30">
          <p className="text-xs text-red-400">{data.error}</p>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="image_url"
        className="!bg-blue-500 !border-2 !border-[#0a0a0a] !w-3 !h-3"
      />
    </BaseNode>
  )
}
