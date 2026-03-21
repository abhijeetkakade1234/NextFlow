// src/components/nodes/TextNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Type } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { TextFlowNode } from '@/types/nodes'

export function TextNode({ id, data }: NodeProps<TextFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)

  return (
    <BaseNode id={id} title="Text" icon={<Type size={14} />} showRunButton={false}>
      <textarea
        value={data.content}
        onChange={e => updateNodeData(id, { content: e.target.value })}
        placeholder="Enter text..."
        rows={4}
        className="w-full resize-none bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2
                   text-sm text-[#e5e5e5] placeholder-[#6b7280] outline-none
                   focus:border-[#7c3aed] transition-colors nodrag"
      />
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
