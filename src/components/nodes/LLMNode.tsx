// src/components/nodes/LLMNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Bot, Play, Loader2, Edit3, ChevronDown } from 'lucide-react'
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
    // 1. Update local UI state
    updateNodeData(id, { isRunning: true, error: null, result: null })

    try {
      const workflowId = (window as any).__currentWorkflowId
      if (!workflowId) {
        updateNodeData(id, { isRunning: false, error: 'Save workflow first' })
        return
      }

      // 2. IMMEDIATE SAVE: Ensure backend has latest prompt/settings
      // We manually trigger the save API to bypass the 1.5s debounce of useAutoSave
      const store = useWorkflowStore.getState()
      const saveRes = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: store.workflowName,
          nodesJson: store.nodes,
          edgesJson: store.edges,
          viewport: store.viewport,
        }),
      })

      if (!saveRes.ok) throw new Error('Failed to save state before run')
      store.markClean()

      // 3. Trigger Run
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

      // 4. Client-side listener for the execution store will pick this up
      emitRunStarted(data.runId, [id])
    } catch (err: any) {
      updateNodeData(id, { isRunning: false, error: err.message || 'Failed to start run' })
    }
  }

  return (
    <BaseNode
      id={id}
      title="Generator"
      icon={<Bot size={18} />}
      onRun={handleRun}
    >
      <div className="flex flex-col gap-5">
        {/* Model Selector at top like Krea */}
        <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 ring-1 ring-white/5">
          <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">Model</span>
          <select
            value={data.model}
            onChange={e => updateNodeData(id, { model: e.target.value as any })}
            className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer nodrag text-right"
          >
            {GEMINI_MODELS.map(m => (
              <option key={m.value} value={m.value} className="bg-krea-surface-solid">{m.label}</option>
            ))}
          </select>
        </div>

        {/* System Prompt Area */}
        <div className="relative group/system">
           <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">System Prompt</span>
           </div>
           
           <div className="relative">
            <textarea
              value={data.manualSystemPrompt}
              onChange={e => updateNodeData(id, { manualSystemPrompt: e.target.value })}
              disabled={systemConnected}
              placeholder={systemConnected ? 'Driven by connection...' : 'You are a helpful AI assistant...'}
              rows={2}
              className="w-full resize-none bg-white/2 border border-white/5 rounded-2xl p-4
                         text-[11px] text-white/80 placeholder-white/20 outline-none
                         focus:border-krea-accent/50 focus:bg-white/5 transition-all nodrag
                         disabled:opacity-40 disabled:cursor-not-allowed leading-relaxed"
            />
            <Handle
              type="target"
              position={Position.Left}
              id="system_prompt"
              data-handletype="text"
              className="!bg-yellow-500 !top-1/2"
            />
           </div>
        </div>

        {/* Prompt Area */}
        <div className="relative group/input">
           <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">User Message</span>
             <Edit3 size={12} className="text-krea-muted opacity-0 group-hover/input:opacity-100 transition-opacity" />
           </div>
           
           <div className="relative">
            <textarea
              value={data.manualUserMessage}
              onChange={e => updateNodeData(id, { manualUserMessage: e.target.value })}
              disabled={userConnected}
              placeholder={userConnected ? 'Driven by connection...' : 'A beautiful sunset over a calm ocean...'}
              rows={4}
              className="w-full resize-none bg-white/2 border border-white/5 rounded-2xl p-4
                         text-sm text-white placeholder-white/20 outline-none
                         focus:border-krea-accent/50 focus:bg-white/5 transition-all nodrag
                         disabled:opacity-40 disabled:cursor-not-allowed leading-relaxed"
            />
            <Handle
              type="target"
              position={Position.Left}
              id="user_message"
              data-handletype="text"
              className="!bg-yellow-500"
            />
           </div>
        </div>

        {/* Result Area */}
        {data.result || data.isRunning ? (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">Result</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 min-h-[100px] relative overflow-hidden group/result">
              {data.result ? (
                <p className="text-sm text-krea-text-secondary whitespace-pre-wrap leading-relaxed">
                  {data.result}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 opacity-20">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-white mb-3 animate-spin duration-[3s]" />
                  <span className="text-[10px] font-bold tracking-tighter uppercase">Processing...</span>
                </div>
              )}
              
              <Handle
                type="source"
                position={Position.Right}
                id="output"
                data-handletype="text"
                className="!bg-yellow-500"
              />
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[24px] opacity-20">
             <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Results will appear here</span>
          </div>
        )}

        {/* Settings Collapsible (Simulation) */}
        <div className="flex items-center justify-between px-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <ChevronDown size={14} className="text-krea-muted" />
            <span className="text-[10px] font-bold text-krea-muted uppercase tracking-widest">Advanced Settings</span>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="images" data-handletype="image_url" className="!top-3/4 !bg-blue-500" />
    </BaseNode>
  )
}

export default LLMNode
