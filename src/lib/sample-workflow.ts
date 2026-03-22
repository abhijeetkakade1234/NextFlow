import type { Edge, Viewport } from '@xyflow/react'
import type { AppNode } from '@/types/nodes'

export const SAMPLE_WORKFLOW_NAME = 'Product Marketing Kit Generator'

export const SAMPLE_VIEWPORT: Viewport = { x: 40, y: 20, zoom: 0.75 }

export const SAMPLE_NODES: AppNode[] = [
  {
    id: 'upload-image-1',
    type: 'uploadImageNode',
    position: { x: 80, y: 90 },
    data: { label: 'Upload Image', imageUrl: null, fileName: null, error: null },
  },
  {
    id: 'crop-image-1',
    type: 'cropImageNode',
    position: { x: 410, y: 90 },
    data: {
      label: 'Crop Image',
      xPercent: 10,
      yPercent: 10,
      widthPercent: 80,
      heightPercent: 80,
      result: null,
      isRunning: false,
      error: null,
    },
  },
  {
    id: 'text-system-1',
    type: 'textNode',
    position: { x: 410, y: 290 },
    data: {
      label: 'System Prompt',
      content: 'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.',
    },
  },
  {
    id: 'text-product-1',
    type: 'textNode',
    position: { x: 410, y: 460 },
    data: {
      label: 'Product Details',
      content: 'Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.',
    },
  },
  {
    id: 'llm-1',
    type: 'llmNode',
    position: { x: 750, y: 250 },
    data: {
      label: 'Run LLM',
      model: 'gemini-2.5-flash',
      manualSystemPrompt: '',
      manualUserMessage: '',
      result: null,
      isRunning: false,
      error: null,
      systemPromptConnected: false,
      userMessageConnected: false,
      imagesConnected: false,
    },
  },
  {
    id: 'upload-video-1',
    type: 'uploadVideoNode',
    position: { x: 80, y: 640 },
    data: { label: 'Upload Video', videoUrl: null, fileName: null, error: null },
  },
  {
    id: 'extract-frame-1',
    type: 'extractFrameNode',
    position: { x: 410, y: 640 },
    data: {
      label: 'Extract Frame',
      timestamp: '50%',
      result: null,
      isRunning: false,
      error: null,
    },
  },
  {
    id: 'text-system-2',
    type: 'textNode',
    position: { x: 1110, y: 140 },
    data: {
      label: 'Final System Prompt',
      content: 'You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.',
    },
  },
  {
    id: 'llm-2',
    type: 'llmNode',
    position: { x: 1110, y: 360 },
    data: {
      label: 'Final Marketing Summary',
      model: 'gemini-2.5-flash',
      manualSystemPrompt: '',
      manualUserMessage: '',
      result: null,
      isRunning: false,
      error: null,
      systemPromptConnected: false,
      userMessageConnected: false,
      imagesConnected: false,
    },
  },
]

export const SAMPLE_EDGES: Edge[] = [
  { id: 'e1', source: 'upload-image-1', sourceHandle: 'output', target: 'crop-image-1', targetHandle: 'image_url', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e2', source: 'crop-image-1', sourceHandle: 'output', target: 'llm-1', targetHandle: 'images', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e3', source: 'text-system-1', sourceHandle: 'output', target: 'llm-1', targetHandle: 'system_prompt', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e4', source: 'text-product-1', sourceHandle: 'output', target: 'llm-1', targetHandle: 'user_message', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e5', source: 'upload-video-1', sourceHandle: 'output', target: 'extract-frame-1', targetHandle: 'video_url', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e6', source: 'text-system-2', sourceHandle: 'output', target: 'llm-2', targetHandle: 'system_prompt', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e7', source: 'llm-1', sourceHandle: 'output', target: 'llm-2', targetHandle: 'user_message', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e8', source: 'crop-image-1', sourceHandle: 'output', target: 'llm-2', targetHandle: 'images', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e9', source: 'extract-frame-1', sourceHandle: 'output', target: 'llm-2', targetHandle: 'images', type: 'custom', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
]
