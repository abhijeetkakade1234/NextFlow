// src/components/canvas/nodeTypes.ts
import type { ComponentType } from 'react'
import type { NodeProps } from '@xyflow/react'
import { TextNode } from '@/components/nodes/TextNode'
import { UploadImageNode } from '@/components/nodes/UploadImageNode'
import { UploadVideoNode } from '@/components/nodes/UploadVideoNode'
import { LLMNode } from '@/components/nodes/LLMNode'
import { CropImageNode } from '@/components/nodes/CropImageNode'
import { ExtractFrameNode } from '@/components/nodes/ExtractFrameNode'

// NodeTypes maps string keys → components that accept NodeProps for a specific
// Node shape. React Flow's NodeTypes definition uses NodeProps (untyped), so we
// satisfy that contract by casting through ComponentType<NodeProps> which is the
// interface React Flow itself uses when rendering nodes.

type AnyNodeComponent = ComponentType<NodeProps>

export const nodeTypes: Record<string, AnyNodeComponent> = {
  textNode:         TextNode as AnyNodeComponent,
  uploadImageNode:  UploadImageNode as AnyNodeComponent,
  uploadVideoNode:  UploadVideoNode as AnyNodeComponent,
  llmNode:          LLMNode as AnyNodeComponent,
  cropImageNode:    CropImageNode as AnyNodeComponent,
  extractFrameNode: ExtractFrameNode as AnyNodeComponent,
}
