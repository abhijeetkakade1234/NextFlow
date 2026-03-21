// src/components/nodes/CropImageNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Crop } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { CropImageFlowNode } from '@/types/nodes'

function NumberInput({
  label, value, onChange, disabled
}: { label: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div>
      <label className="text-xs text-[#6b7280] mb-1 block">{label}</label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2 py-1
                   text-xs text-[#e5e5e5] outline-none focus:border-[#7c3aed] nodrag
                   disabled:opacity-40 disabled:cursor-not-allowed"
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
    <BaseNode id={id} title="Crop Image" icon={<Crop size={14} />} onRun={handleRun}>
      {/* Image input handle */}
      <div className="relative mb-3">
        <Handle
          type="target"
          position={Position.Left}
          id="image_url"
          style={{ top: '50%' }}
          data-handletype="image_url"
          className="!bg-blue-500 !border-2 !border-[#0a0a0a] !w-3 !h-3"
        />
        <div className="ml-4 text-xs text-[#6b7280]">Image: required</div>
      </div>

      {/* Crop parameters */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="relative">
          <Handle type="target" position={Position.Left} id="x_percent"
            style={{ top: '50%' }} data-handletype="number"
            className="!bg-orange-500 !border-2 !border-[#0a0a0a] !w-2.5 !h-2.5" />
          <NumberInput label="X %" value={data.xPercent} onChange={v => updateNodeData(id, { xPercent: v })} disabled={xConnected} />
        </div>
        <div className="relative">
          <Handle type="target" position={Position.Left} id="y_percent"
            style={{ top: '50%' }} data-handletype="number"
            className="!bg-orange-500 !border-2 !border-[#0a0a0a] !w-2.5 !h-2.5" />
          <NumberInput label="Y %" value={data.yPercent} onChange={v => updateNodeData(id, { yPercent: v })} disabled={yConnected} />
        </div>
        <div className="relative">
          <Handle type="target" position={Position.Left} id="width_percent"
            style={{ top: '50%' }} data-handletype="number"
            className="!bg-orange-500 !border-2 !border-[#0a0a0a] !w-2.5 !h-2.5" />
          <NumberInput label="Width %" value={data.widthPercent} onChange={v => updateNodeData(id, { widthPercent: v })} disabled={wConnected} />
        </div>
        <div className="relative">
          <Handle type="target" position={Position.Left} id="height_percent"
            style={{ top: '50%' }} data-handletype="number"
            className="!bg-orange-500 !border-2 !border-[#0a0a0a] !w-2.5 !h-2.5" />
          <NumberInput label="Height %" value={data.heightPercent} onChange={v => updateNodeData(id, { heightPercent: v })} disabled={hConnected} />
        </div>
      </div>

      {data.result && (
        <div className="mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.result} alt="Cropped" className="w-full h-24 object-cover rounded-lg border border-[#1f1f1f]" />
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
