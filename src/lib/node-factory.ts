// src/lib/node-factory.ts
import { AppNode } from '@/types/nodes'

export function createNode(
  type: string,
  position: { x: number; y: number }
): AppNode {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const defaults: Record<string, unknown> = {
    textNode: {
      label: 'Text',
      content: '',
    },
    uploadImageNode: {
      label: 'Upload Image',
      imageUrl: null,
      fileName: null,
      error: null,
    },
    uploadVideoNode: {
      label: 'Upload Video',
      videoUrl: null,
      fileName: null,
      error: null,
    },
    llmNode: {
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
    cropImageNode: {
      label: 'Crop Image',
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
      result: null,
      isRunning: false,
      error: null,
    },
    extractFrameNode: {
      label: 'Extract Frame',
      timestamp: '0',
      result: null,
      isRunning: false,
      error: null,
    },
  }

  return {
    id,
    type,
    position,
    data: defaults[type] as any,
  }
}
