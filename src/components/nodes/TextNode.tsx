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
    <BaseNode id={id} title="Text Object" icon={<Type size={18} />} showRunButton={false}>
      <div className="flex flex-col gap-3">
        <textarea
          value={data.content}
          onChange={e => updateNodeData(id, { content: e.target.value })}
          placeholder="Enter content..."
          rows={5}
          className="w-full resize-none bg-white/2 border border-white/5 rounded-2xl p-4
                     text-sm text-white placeholder-white/20 outline-none
                     focus:border-krea-accent/50 focus:bg-white/5 transition-all nodrag
                     leading-relaxed shadow-inner"
        />
        <div className="px-1 flex items-center justify-between opacity-40">
           <span className="text-[9px] font-bold text-krea-muted uppercase tracking-widest">Type: String</span>
           <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="text"
        className="!bg-yellow-500"
      />
    </BaseNode>
  )
}

export default TextNode
