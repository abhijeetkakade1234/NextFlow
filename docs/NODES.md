# NextFlow — Node Specifications

## Node Type Registry
```typescript
// src/components/canvas/nodeTypes.ts
import { NodeTypes } from '@xyflow/react'
import { TextNode } from '@/components/nodes/TextNode'
import { UploadImageNode } from '@/components/nodes/UploadImageNode'
import { UploadVideoNode } from '@/components/nodes/UploadVideoNode'
import { LLMNode } from '@/components/nodes/LLMNode'
import { CropImageNode } from '@/components/nodes/CropImageNode'
import { ExtractFrameNode } from '@/components/nodes/ExtractFrameNode'

export const nodeTypes: NodeTypes = {
  textNode:         TextNode,
  uploadImageNode:  UploadImageNode,
  uploadVideoNode:  UploadVideoNode,
  llmNode:          LLMNode,
  cropImageNode:    CropImageNode,
  extractFrameNode: ExtractFrameNode,
}
```

---

## TypeScript Types for All Nodes

```typescript
// src/types/nodes.ts
import { Node } from '@xyflow/react'

// Handle type values — used for connection validation
export type HandleType = 'text' | 'image_url' | 'video_url' | 'number'

// ─── Node Data Types ───────────────────────────────────────

export type TextNodeData = {
  label: string
  content: string            // textarea value
  // output handle: text
}

export type UploadImageNodeData = {
  label: string
  imageUrl: string | null    // Transloadit CDN URL after upload
  fileName: string | null
  // output handle: image_url
}

export type UploadVideoNodeData = {
  label: string
  videoUrl: string | null    // Transloadit CDN URL after upload
  fileName: string | null
  // output handle: video_url
}

export type LLMNodeData = {
  label: string
  model: GeminiModel
  // Manual fields (disabled when handle is connected):
  manualSystemPrompt: string
  manualUserMessage: string
  // Execution results:
  result: string | null
  isRunning: boolean
  error: string | null
  // Connected state flags (set by execution engine):
  systemPromptConnected: boolean
  userMessageConnected: boolean
  imagesConnected: boolean
}

export type CropImageNodeData = {
  label: string
  // Manual fields (disabled when handle connected):
  xPercent: number           // 0-100, default 0
  yPercent: number           // 0-100, default 0
  widthPercent: number       // 0-100, default 100
  heightPercent: number      // 0-100, default 100
  // Execution results:
  result: string | null      // cropped image URL
  isRunning: boolean
  error: string | null
}

export type ExtractFrameNodeData = {
  label: string
  // Manual field (disabled when handle connected):
  timestamp: string          // seconds or "50%", default "0"
  // Execution results:
  result: string | null      // extracted frame URL
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

// ─── App Node (React Flow Node + our data) ────────────────

export type AppNode = Node<NodeData>

// ─── Gemini Models ─────────────────────────────────────────

export type GeminiModel =
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-flash-8b'

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'gemini-1.5-flash',       label: 'Gemini 1.5 Flash (fast)' },
  { value: 'gemini-1.5-pro',         label: 'Gemini 1.5 Pro (smart)' },
  { value: 'gemini-2.0-flash-exp',   label: 'Gemini 2.0 Flash (latest)' },
  { value: 'gemini-1.5-flash-8b',    label: 'Gemini 1.5 Flash 8B (cheapest)' },
]
```

---

## BaseNode.tsx (shared wrapper for all nodes)

```tsx
// src/components/nodes/BaseNode.tsx
'use client'
import { ReactNode } from 'react'
import { NodeProps, useReactFlow } from '@xyflow/react'
import { Trash2, Play } from 'lucide-react'
import { useExecutionStore } from '@/store/execution-store'
import { cn } from '@/lib/utils'

type BaseNodeProps = {
  id: string
  title: string
  icon: ReactNode
  children: ReactNode
  onRun?: () => void
  showRunButton?: boolean
  className?: string
}

export function BaseNode({
  id, title, icon, children, onRun, showRunButton = true, className
}: BaseNodeProps) {
  const { deleteElements } = useReactFlow()
  const nodeStatus = useExecutionStore(s => s.nodeStatuses[id])
  const isRunning = nodeStatus === 'RUNNING'

  return (
    <div
      className={cn(
        'min-w-[280px] rounded-xl border border-krea-border bg-krea-surface',
        'transition-all duration-200',
        isRunning && 'node-running border-krea-accent',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-krea-border">
        <div className="flex items-center gap-2">
          <span className="text-krea-accent">{icon}</span>
          <span className="text-sm font-medium text-krea-text">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {showRunButton && (
            <button
              onClick={onRun}
              disabled={isRunning}
              className="p-1 rounded hover:bg-krea-accent/20 text-krea-muted hover:text-krea-accent transition-colors disabled:opacity-50"
            >
              <Play size={12} />
            </button>
          )}
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="p-1 rounded hover:bg-red-500/20 text-krea-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">{children}</div>
    </div>
  )
}
```

---

## 1. TextNode

### Handles
| Handle | Type | Direction | Position |
|--------|------|-----------|----------|
| output | text | source | Right |

### Component
```tsx
// src/components/nodes/TextNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Type } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { TextNodeData } from '@/types/nodes'

export function TextNode({ id, data }: NodeProps<TextNodeData>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)

  return (
    <BaseNode id={id} title="Text" icon={<Type size={14} />} showRunButton={false}>
      <textarea
        value={data.content}
        onChange={e => updateNodeData(id, { content: e.target.value })}
        placeholder="Enter text..."
        rows={4}
        className="w-full resize-none bg-krea-bg border border-krea-border rounded-lg p-2 
                   text-sm text-krea-text placeholder-krea-muted outline-none
                   focus:border-krea-accent transition-colors nodrag"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="text"
        className="!bg-krea-accent !border-2 !border-krea-bg !w-3 !h-3"
      />
    </BaseNode>
  )
}
```

---

## 2. UploadImageNode

### Handles
| Handle | Type | Direction | Position |
|--------|------|-----------|----------|
| output | image_url | source | Right |

### Key Pattern: Transloadit Upload
```tsx
// src/components/nodes/UploadImageNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Image as ImageIcon, Upload } from 'lucide-react'
import { useCallback } from 'react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { UploadImageNodeData } from '@/types/nodes'

export function UploadImageNode({ id, data }: NodeProps<UploadImageNodeData>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)

  const handleUpload = useCallback(async (file: File) => {
    // 1. Get signed Transloadit params from our API
    const res = await fetch('/api/upload/params', {
      method: 'POST',
      body: JSON.stringify({ fileType: 'image', fileName: file.name }),
      headers: { 'Content-Type': 'application/json' },
    })
    const { params, signature } = await res.json()

    // 2. Upload via Transloadit Assembly
    const formData = new FormData()
    formData.append('params', JSON.stringify(params))
    formData.append('signature', signature)
    formData.append('file', file)

    const uploadRes = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      body: formData,
    })
    const assembly = await uploadRes.json()

    // 3. Poll for completion and get CDN URL
    const imageUrl = assembly.results?.':original'?.[0]?.url
    if (imageUrl) {
      updateNodeData(id, { imageUrl, fileName: file.name })
    }
  }, [id, updateNodeData])

  return (
    <BaseNode id={id} title="Upload Image" icon={<ImageIcon size={14} />} showRunButton={false}>
      {data.imageUrl ? (
        <div className="relative">
          <img
            src={data.imageUrl}
            alt={data.fileName ?? 'uploaded'}
            className="w-full h-32 object-cover rounded-lg border border-krea-border"
          />
          <button
            onClick={() => updateNodeData(id, { imageUrl: null, fileName: null })}
            className="absolute top-1 right-1 bg-krea-bg/80 rounded p-0.5 text-krea-muted hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed 
                         border-krea-border rounded-lg cursor-pointer hover:border-krea-accent 
                         transition-colors nodrag">
          <Upload size={20} className="text-krea-muted mb-1" />
          <span className="text-xs text-krea-muted">jpg, jpeg, png, webp, gif</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="image_url"
        className="!bg-blue-500 !border-2 !border-krea-bg !w-3 !h-3"
      />
    </BaseNode>
  )
}
```

---

## 3. UploadVideoNode

### Handles
| Handle | Type | Direction | Position |
|--------|------|-----------|----------|
| output | video_url | source | Right |

### Key differences from UploadImageNode
- Accept: `.mp4,.mov,.webm,.m4v`
- Preview: `<video>` tag with controls, not `<img>`
- Handle color: green (video) vs blue (image)

```tsx
// Preview section only — rest identical to UploadImageNode pattern:
{data.videoUrl ? (
  <video
    src={data.videoUrl}
    controls
    className="w-full rounded-lg border border-krea-border max-h-32"
  />
) : (
  <label className="...">
    <input type="file" accept=".mp4,.mov,.webm,.m4v" ... />
  </label>
)}
```

---

## 4. LLMNode

### Handles
| Handle | Name | Type | Direction | Position | Required |
|--------|------|------|-----------|----------|----------|
| target | system_prompt | text | Left | Left (top) | No |
| target | user_message | text | Left | Left (middle) | Yes |
| target | images | image_url | Left | Left (bottom) | No (multiple) |
| source | output | text | Right | Right | - |

### Key Features
- Model dropdown (4 Gemini models)
- Manual text fields — **greyed out when handle is connected**
- Result displayed INLINE on the node (not separate node)
- Run button in header triggers Trigger.dev task via API call
- `isRunning` → pulsating glow + disabled run button

```tsx
// src/components/nodes/LLMNode.tsx
'use client'
import { Handle, Position, NodeProps, useEdges } from '@xyflow/react'
import { Bot, Loader2 } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import { GEMINI_MODELS } from '@/types/nodes'
import type { LLMNodeData } from '@/types/nodes'

export function LLMNode({ id, data }: NodeProps<LLMNodeData>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const edges = useEdges()

  // Detect if handles are connected to disable manual fields
  const systemConnected = edges.some(e => e.target === id && e.targetHandle === 'system_prompt')
  const userConnected   = edges.some(e => e.target === id && e.targetHandle === 'user_message')
  const imagesConnected = edges.some(e => e.target === id && e.targetHandle === 'images')

  const handleRun = async () => {
    updateNodeData(id, { isRunning: true, error: null, result: null })
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        body: JSON.stringify({ scope: 'SINGLE', nodeId: id }),
        headers: { 'Content-Type': 'application/json' },
      })
      // Result will be polled/pushed and update the store
    } catch (err) {
      updateNodeData(id, { isRunning: false, error: 'Failed to start run' })
    }
  }

  return (
    <BaseNode
      id={id}
      title="Run LLM"
      icon={data.isRunning ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
      onRun={handleRun}
    >
      {/* System Prompt Handle + Input */}
      <div className="relative mb-2">
        <Handle type="target" position={Position.Left} id="system_prompt"
          style={{ top: '50%' }}
          data-handletype="text"
          className="!bg-yellow-500 !border-2 !border-krea-bg !w-3 !h-3"
        />
        <label className="text-xs text-krea-muted mb-1 block ml-4">System Prompt</label>
        <textarea
          value={data.manualSystemPrompt}
          onChange={e => updateNodeData(id, { manualSystemPrompt: e.target.value })}
          disabled={systemConnected}
          placeholder={systemConnected ? 'Connected from node...' : 'Optional system prompt...'}
          rows={2}
          className="w-full resize-none bg-krea-bg border border-krea-border rounded-lg p-2
                     text-xs text-krea-text placeholder-krea-muted outline-none
                     focus:border-krea-accent transition-colors nodrag
                     disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* User Message Handle + Input */}
      <div className="relative mb-2">
        <Handle type="target" position={Position.Left} id="user_message"
          style={{ top: '50%' }}
          data-handletype="text"
          className="!bg-krea-accent !border-2 !border-krea-bg !w-3 !h-3"
        />
        <label className="text-xs text-krea-muted mb-1 block ml-4">User Message *</label>
        <textarea
          value={data.manualUserMessage}
          onChange={e => updateNodeData(id, { manualUserMessage: e.target.value })}
          disabled={userConnected}
          placeholder={userConnected ? 'Connected from node...' : 'Enter message...'}
          rows={3}
          className="... nodrag disabled:opacity-40"
        />
      </div>

      {/* Images Handle (no manual input, just shows connection state) */}
      <div className="relative mb-2">
        <Handle type="target" position={Position.Left} id="images"
          data-handletype="image_url"
          className="!bg-blue-500 !border-2 !border-krea-bg !w-3 !h-3"
        />
        <div className="ml-4 text-xs text-krea-muted">
          Images: {imagesConnected ? '✓ Connected' : 'Not connected'}
        </div>
      </div>

      {/* Model Selector */}
      <select
        value={data.model}
        onChange={e => updateNodeData(id, { model: e.target.value as any })}
        className="w-full bg-krea-bg border border-krea-border rounded-lg p-2 text-xs 
                   text-krea-text outline-none focus:border-krea-accent nodrag mb-2"
      >
        {GEMINI_MODELS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {/* Inline Result */}
      {data.result && (
        <div className="mt-2 p-2 bg-krea-bg rounded-lg border border-krea-success/30">
          <p className="text-xs text-krea-muted mb-1">Output:</p>
          <p className="text-xs text-krea-text whitespace-pre-wrap">{data.result}</p>
        </div>
      )}

      {data.error && (
        <div className="mt-2 p-2 bg-krea-error/10 rounded-lg border border-krea-error/30">
          <p className="text-xs text-red-400">{data.error}</p>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="text"
        className="!bg-krea-accent !border-2 !border-krea-bg !w-3 !h-3"
      />
    </BaseNode>
  )
}
```

---

## 5. CropImageNode

### Handles
| Handle | Name | Type | Direction | Position | Required |
|--------|------|------|-----------|----------|----------|
| target | image_url | image_url | Left | Left (top) | Yes |
| target | x_percent | number | Left | Left | No |
| target | y_percent | number | Left | Left | No |
| target | width_percent | number | Left | Left | No |
| target | height_percent | number | Left | Left | No |
| source | output | image_url | Right | Right | - |

### Key Pattern: Connected Handle Disables Manual Input
```tsx
// For each numeric input field:
const xConnected = edges.some(e => e.target === id && e.targetHandle === 'x_percent')

<input
  type="number"
  min={0} max={100}
  value={data.xPercent}
  onChange={e => updateNodeData(id, { xPercent: Number(e.target.value) })}
  disabled={xConnected}
  className="... disabled:opacity-40 disabled:cursor-not-allowed"
/>
```

### Default Values
```typescript
const defaultCropData: CropImageNodeData = {
  label: 'Crop Image',
  xPercent: 0,
  yPercent: 0,
  widthPercent: 100,
  heightPercent: 100,
  result: null,
  isRunning: false,
  error: null,
}
```

---

## 6. ExtractFrameNode

### Handles
| Handle | Name | Type | Direction | Position | Required |
|--------|------|------|-----------|----------|----------|
| target | video_url | video_url | Left | Left (top) | Yes |
| target | timestamp | text/number | Left | Left (bottom) | No |
| source | output | image_url | Right | Right | - |

### Timestamp Input
```tsx
<input
  type="text"
  value={data.timestamp}
  onChange={e => updateNodeData(id, { timestamp: e.target.value })}
  disabled={timestampConnected}
  placeholder='e.g. 5 or "50%"'
  className="..."
/>
<p className="text-xs text-krea-muted mt-1">
  Enter seconds (e.g. "5") or percentage (e.g. "50%")
</p>
```

---

## Handle Color Coding
| Data Type | Color | CSS |
|-----------|-------|-----|
| text | purple | `!bg-krea-accent` |
| image_url | blue | `!bg-blue-500` |
| video_url | green | `!bg-green-500` |
| number | orange | `!bg-orange-500` |

---

## Default Node Factory (used by sidebar buttons)

```typescript
// src/lib/node-factory.ts
import { AppNode } from '@/types/nodes'

export function createNode(
  type: string,
  position: { x: number; y: number }
): AppNode {
  const id = `${type}-${Date.now()}`
  const defaults: Record<string, any> = {
    textNode:         { label: 'Text', content: '' },
    uploadImageNode:  { label: 'Upload Image', imageUrl: null, fileName: null },
    uploadVideoNode:  { label: 'Upload Video', videoUrl: null, fileName: null },
    llmNode:          { label: 'Run LLM', model: 'gemini-1.5-flash', manualSystemPrompt: '', manualUserMessage: '', result: null, isRunning: false, error: null },
    cropImageNode:    { label: 'Crop Image', xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, result: null, isRunning: false, error: null },
    extractFrameNode: { label: 'Extract Frame', timestamp: '0', result: null, isRunning: false, error: null },
  }
  return { id, type, position, data: defaults[type] }
}
```

---

## Sidebar Node Buttons (Left Sidebar)

```tsx
// 6 buttons in order:
const SIDEBAR_NODES = [
  { type: 'textNode',         label: 'Text',          icon: Type,        color: 'text-purple-400' },
  { type: 'uploadImageNode',  label: 'Upload Image',  icon: Image,       color: 'text-blue-400' },
  { type: 'uploadVideoNode',  label: 'Upload Video',  icon: Video,       color: 'text-green-400' },
  { type: 'llmNode',          label: 'Run Any LLM',   icon: Bot,         color: 'text-krea-accent' },
  { type: 'cropImageNode',    label: 'Crop Image',    icon: Crop,        color: 'text-orange-400' },
  { type: 'extractFrameNode', label: 'Extract Frame', icon: Film,        color: 'text-pink-400' },
]

// Each button: onClick → addNode(createNode(type, getCanvasCenter()))
// Also draggable: onDragStart sets dataTransfer, canvas onDrop creates node at drop position
```
