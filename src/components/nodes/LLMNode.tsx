// src/components/nodes/LLMNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Bot } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import { GEMINI_MODELS } from '@/types/nodes'
import type { LLMFlowNode } from '@/types/nodes'
import { emitRunStarted } from '@/lib/run-events'

export function LLMNode({ id, data }: NodeProps<LLMFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const edges = useEdges()

  const systemConnected = edges.some(e => e.target === id && e.targetHandle === 'system_prompt')
  const userConnected   = edges.some(e => e.target === id && e.targetHandle === 'user_message')
  const imagesConnected = edges.some(e => e.target === id && e.targetHandle === 'images')

  const handleRun = async () => {
    updateNodeData(id, { isRunning: true, error: null, result: null })
    try {
      const workflowId = (window as any).__currentWorkflowId
      if (!workflowId) {
        updateNodeData(id, { isRunning: false, error: 'Save the workflow first to run nodes' })
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
    <BaseNode
      id={id}
      title="Run LLM"
      icon={<Bot size={14} />}
      onRun={handleRun}
    >
      {/* System Prompt */}
      <div className="relative mb-3">
        <Handle
          type="target"
          position={Position.Left}
          id="system_prompt"
          style={{ top: '50%' }}
          data-handletype="text"
          className="!bg-yellow-500 !border-2 !border-[#0a0a0a] !w-3 !h-3"
        />
        <label className="text-xs text-[#6b7280] mb-1 block ml-4">System Prompt</label>
        <textarea
          value={data.manualSystemPrompt}
          onChange={e => updateNodeData(id, { manualSystemPrompt: e.target.value })}
          disabled={systemConnected}
          placeholder={systemConnected ? 'Connected from node...' : 'Optional system prompt...'}
          rows={2}
          className="w-full resize-none bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2
                     text-xs text-[#e5e5e5] placeholder-[#6b7280] outline-none
                     focus:border-[#7c3aed] transition-colors nodrag
                     disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* User Message */}
      <div className="relative mb-3">
        <Handle
          type="target"
          position={Position.Left}
          id="user_message"
          style={{ top: '50%' }}
          data-handletype="text"
          className="!bg-[#7c3aed] !border-2 !border-[#0a0a0a] !w-3 !h-3"
        />
        <label className="text-xs text-[#6b7280] mb-1 block ml-4">User Message *</label>
        <textarea
          value={data.manualUserMessage}
          onChange={e => updateNodeData(id, { manualUserMessage: e.target.value })}
          disabled={userConnected}
          placeholder={userConnected ? 'Connected from node...' : 'Enter message...'}
          rows={3}
          className="w-full resize-none bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2
                     text-xs text-[#e5e5e5] placeholder-[#6b7280] outline-none
                     focus:border-[#7c3aed] transition-colors nodrag
                     disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* Images handle */}
      <div className="relative mb-3">
        <Handle
          type="target"
          position={Position.Left}
          id="images"
          style={{ top: '50%' }}
          data-handletype="image_url"
          className="!bg-blue-500 !border-2 !border-[#0a0a0a] !w-3 !h-3"
        />
        <div className="ml-4 text-xs text-[#6b7280]">
          Images: {imagesConnected ? '✓ Connected' : 'Not connected'}
        </div>
      </div>

      {/* Model Selector */}
      <select
        value={data.model}
        onChange={e => updateNodeData(id, { model: e.target.value as any })}
        className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2 text-xs
                   text-[#e5e5e5] outline-none focus:border-[#7c3aed] nodrag mb-2"
      >
        {GEMINI_MODELS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {/* Inline Result */}
      {data.result && (
        <div className="mt-2 p-2 bg-[#0a0a0a] rounded-lg border border-[#10b981]/30">
          <p className="text-xs text-[#6b7280] mb-1">Output:</p>
          <p className="text-xs text-[#e5e5e5] whitespace-pre-wrap max-h-32 overflow-y-auto">{data.result}</p>
        </div>
      )}

      {data.error && (
        <div className="mt-2 p-2 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/30">
          <p className="text-xs text-red-400">{data.error}</p>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="text"
        className="!bg-[#7c3aed] !border-2 !border-[#0a0a0a] !w-3 !h-3"
      />
    </BaseNode>
  )
}
