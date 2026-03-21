// src/types/nodes.ts
import { Node } from '@xyflow/react'

// Handle type values — used for connection validation
export type HandleType = 'text' | 'image_url' | 'video_url' | 'number'

// ─── Node Data Types ───────────────────────────────────────

export type TextNodeData = {
  label: string
  content: string
}

export type UploadImageNodeData = {
  label: string
  imageUrl: string | null
  fileName: string | null
}

export type UploadVideoNodeData = {
  label: string
  videoUrl: string | null
  fileName: string | null
}

export type LLMNodeData = {
  label: string
  model: GeminiModel
  manualSystemPrompt: string
  manualUserMessage: string
  result: string | null
  isRunning: boolean
  error: string | null
  systemPromptConnected: boolean
  userMessageConnected: boolean
  imagesConnected: boolean
}

export type CropImageNodeData = {
  label: string
  xPercent: number
  yPercent: number
  widthPercent: number
  heightPercent: number
  result: string | null
  isRunning: boolean
  error: string | null
}

export type ExtractFrameNodeData = {
  label: string
  timestamp: string
  result: string | null
  isRunning: boolean
  error: string | null
}

// ─── Union Type ────────────────────────────────────────────

export type NodeData =
  | TextNodeData
  | UploadImageNodeData
  | UploadVideoNodeData
  | LLMNodeData
  | CropImageNodeData
  | ExtractFrameNodeData

// ─── App Node (React Flow Node + our data) ──────────────

export type AppNode = Node<NodeData>

// ─── Typed node variants (for NodeProps<T>) ─────────────
// React Flow v12: NodeProps<T> where T extends Node

export type TextFlowNode         = Node<TextNodeData>
export type UploadImageFlowNode  = Node<UploadImageNodeData>
export type UploadVideoFlowNode  = Node<UploadVideoNodeData>
export type LLMFlowNode          = Node<LLMNodeData>
export type CropImageFlowNode    = Node<CropImageNodeData>
export type ExtractFrameFlowNode = Node<ExtractFrameNodeData>

// ─── Gemini Models ──────────────────────────────────────

export type GeminiModel =
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-flash-8b'

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'gemini-1.5-flash',     label: 'Gemini 1.5 Flash (fast)' },
  { value: 'gemini-1.5-pro',       label: 'Gemini 1.5 Pro (smart)' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (latest)' },
  { value: 'gemini-1.5-flash-8b',  label: 'Gemini 1.5 Flash 8B (cheapest)' },
]

// ─── Handle type constants ──────────────────────────────

export const HANDLE_TYPES = {
  TEXT: 'text',
  IMAGE_URL: 'image_url',
  VIDEO_URL: 'video_url',
  NUMBER: 'number',
} as const
