// src/components/nodes/CropImageNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Crop } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { CropImageFlowNode } from '@/types/nodes'
import { emitRunStarted } from '@/lib/run-events'

import { Settings2 } from 'lucide-react'

function NumberInput({
  label, value, onChange, disabled
}: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-krea-muted uppercase tracking-wider ml-1">{label}</label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2
                   text-sm font-bold text-white outline-none focus:border-krea-accent/50 transition-all nodrag
                   disabled:opacity-40 disabled:cursor-not-allowed text-center"
      />
    </div>
  )
}

export function CropImageNode({ id, data }: NodeProps<CropImageFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const edges = useEdges()

  const xConnected = edges.some(e => e.target === id && e.targetHandle === 'x_percent')
  const yConnected = edges.some(e => e.target === id && e.targetHandle === 'y_percent')
  const wConnected = edges.some(e => e.target === id && e.targetHandle === 'width_percent')
  const hConnected = edges.some(e => e.target === id && e.targetHandle === 'height_percent')

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
    <BaseNode id={id} title="Smart Cropper" icon={<Crop size={18} />} onRun={handleRun}>
      <div className="flex flex-col gap-5">
        {/* Image input handle */}
        <div className="relative bg-white/5 rounded-2xl px-4 py-3 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 size={12} className="text-krea-muted" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Image Source</span>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-bold text-blue-400 uppercase">Input</span>
             <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </div>
          <Handle
            type="target"
            position={Position.Left}
            id="image_url"
            data-handletype="image_url"
            className="!bg-blue-500"
          />
        </div>

        {/* Crop parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative group/param">
            <NumberInput label="Offset X" value={data.xPercent} onChange={v => updateNodeData(id, { xPercent: v })} disabled={xConnected} />
            <Handle type="target" position={Position.Left} id="x_percent" data-handletype="number" className="opacity-0 group-hover/param:opacity-100 transition-opacity" />
          </div>
          <div className="relative group/param">
            <NumberInput label="Offset Y" value={data.yPercent} onChange={v => updateNodeData(id, { yPercent: v })} disabled={yConnected} />
            <Handle type="target" position={Position.Left} id="y_percent" data-handletype="number" className="opacity-0 group-hover/param:opacity-100 transition-opacity" />
          </div>
          <div className="relative group/param">
            <NumberInput label="Width %" value={data.widthPercent} onChange={v => updateNodeData(id, { widthPercent: v })} disabled={wConnected} />
            <Handle type="target" position={Position.Left} id="width_percent" data-handletype="number" className="opacity-0 group-hover/param:opacity-100 transition-opacity" />
          </div>
          <div className="relative group/param">
            <NumberInput label="Height %" value={data.heightPercent} onChange={v => updateNodeData(id, { heightPercent: v })} disabled={hConnected} />
            <Handle type="target" position={Position.Left} id="height_percent" data-handletype="number" className="opacity-0 group-hover/param:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Preview */}
        {data.result ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="aspect-video w-full rounded-[24px] overflow-hidden border border-white/10 shadow-xl bg-black/40">
              <img src={data.result} alt="Cropped" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[24px] opacity-20">
             <span className="text-[9px] font-bold text-white uppercase tracking-widest">Process output to preview</span>
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

export default CropImageNode

