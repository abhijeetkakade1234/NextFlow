# NextFlow — Krea UI Design Spec

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER BAR (48px)                                          │
│  [Logo] [Workflow Name - editable] [Save indicator]  [User] │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│  LEFT    │         CANVAS                   │   RIGHT       │
│ SIDEBAR  │      (React Flow)                │  SIDEBAR      │
│ (240px)  │                                  │  (280px)      │
│          │   dot grid background            │               │
│  [<]     │   nodes + edges                  │   [>]         │
│          │   minimap (bottom-right)         │               │
│          │   controls (bottom-left)         │               │
│          │                                  │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

## Colors (Krea dark theme)
```css
/* Background layers — use these consistently */
--krea-bg:           #0a0a0a;    /* page background, canvas background */
--krea-surface:      #111111;    /* node background, sidebar background */
--krea-surface-2:    #161616;    /* slightly lighter for hover states */
--krea-border:       #1f1f1f;    /* default borders */
--krea-border-hover: #2a2a2a;    /* hovered borders */

/* Text */
--krea-text:         #e5e5e5;    /* primary text */
--krea-text-secondary: #9ca3af;  /* secondary text */
--krea-muted:        #6b7280;    /* placeholder, disabled, timestamps */

/* Accent */
--krea-accent:       #7c3aed;    /* purple — primary accent, edges, running state */
--krea-accent-hover: #6d28d9;    /* darker purple for hover */
--krea-accent-light: #a78bfa;    /* light purple for backgrounds */

/* Status */
--krea-success:      #10b981;    /* green */
--krea-error:        #ef4444;    /* red */
--krea-warning:      #f59e0b;    /* yellow/amber */
--krea-running:      #6366f1;    /* indigo for running */
```

## Left Sidebar

```tsx
// src/components/sidebar/LeftSidebar.tsx
// Width: 240px fixed, collapsible to 48px (icon-only mode)

<aside className="w-60 h-full bg-krea-surface border-r border-krea-border flex flex-col">
  {/* Search */}
  <div className="p-3 border-b border-krea-border">
    <div className="relative">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-krea-muted" />
      <input
        placeholder="Search nodes..."
        className="w-full bg-krea-bg border border-krea-border rounded-lg pl-8 pr-3 py-2
                   text-sm text-krea-text placeholder-krea-muted outline-none
                   focus:border-krea-accent transition-colors"
      />
    </div>
  </div>

  {/* Quick Access label */}
  <div className="px-3 py-2">
    <p className="text-xs font-medium text-krea-muted uppercase tracking-wider">Quick Access</p>
  </div>

  {/* 6 Node Buttons */}
  <div className="flex-1 overflow-y-auto px-2 space-y-1">
    {SIDEBAR_NODES.map(node => (
      <NodeDragButton key={node.type} {...node} />
    ))}
  </div>

  {/* Collapse toggle at bottom */}
  <div className="p-3 border-t border-krea-border">
    <button onClick={toggleLeftSidebar} className="...">
      <ChevronLeft size={16} />
    </button>
  </div>
</aside>
```

## Node Button (draggable)

```tsx
// src/components/sidebar/NodeDragButton.tsx
export function NodeDragButton({ type, label, icon: Icon, color }: NodeButtonProps) {
  const addNode = useWorkflowStore(s => s.addNode)
  
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={() => addNode(type)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                 text-krea-text hover:bg-krea-surface-2 hover:border-krea-border-hover
                 border border-transparent transition-all duration-150 group"
    >
      <div className={`p-1.5 rounded-md bg-krea-bg group-hover:bg-krea-border ${color}`}>
        <Icon size={14} />
      </div>
      <span className="text-sm">{label}</span>
      <GripVertical size={12} className="ml-auto text-krea-muted opacity-0 group-hover:opacity-100" />
    </button>
  )
}
```

## Right Sidebar

```tsx
// src/components/sidebar/RightSidebar.tsx
<aside className="w-72 h-full bg-krea-surface border-l border-krea-border flex flex-col">
  {/* Header */}
  <div className="px-4 py-3 border-b border-krea-border flex items-center justify-between">
    <h2 className="text-sm font-semibold text-krea-text">Run History</h2>
    <span className="text-xs text-krea-muted">{runs.length} runs</span>
  </div>

  {/* Scrollable list */}
  <div className="flex-1 overflow-y-auto">
    {selectedRunId
      ? <RunHistoryDetail run={runs.find(r => r.id === selectedRunId)} />
      : <RunHistoryList runs={runs} />
    }
  </div>
</aside>
```

## Header Bar

```tsx
// Part of (dashboard)/layout.tsx
<header className="h-12 border-b border-krea-border bg-krea-surface 
                   flex items-center px-4 gap-4 flex-shrink-0">
  {/* Logo */}
  <div className="flex items-center gap-2">
    <div className="w-6 h-6 bg-krea-accent rounded-md" />
    <span className="text-sm font-bold text-krea-text">NextFlow</span>
  </div>

  <div className="w-px h-5 bg-krea-border" />

  {/* Workflow name (inline editable) */}
  <input
    value={workflowName}
    onChange={e => setWorkflowName(e.target.value)}
    className="bg-transparent text-sm text-krea-text outline-none 
               border-b border-transparent focus:border-krea-border
               min-w-[160px] max-w-[300px]"
  />

  {/* Save indicator */}
  {isSaving && (
    <span className="text-xs text-krea-muted flex items-center gap-1">
      <Loader2 size={10} className="animate-spin" /> Saving...
    </span>
  )}

  <div className="ml-auto flex items-center gap-2">
    {/* Run full workflow button */}
    <button
      onClick={runFullWorkflow}
      disabled={isRunning}
      className="flex items-center gap-2 px-4 py-1.5 bg-krea-accent 
                 hover:bg-krea-accent-hover rounded-lg text-sm font-medium text-white
                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Play size={12} />
      Run
    </button>

    {/* Export button */}
    <button onClick={exportWorkflow}
      className="px-3 py-1.5 border border-krea-border hover:border-krea-border-hover 
                 rounded-lg text-sm text-krea-muted hover:text-krea-text transition-colors">
      Export
    </button>

    {/* User button (Clerk) */}
    <UserButton afterSignOutUrl="/sign-in" />
  </div>
</header>
```

## Canvas Drop Handler

```tsx
// In WorkflowCanvas.tsx — handle drag-from-sidebar
const onDrop = useCallback((event: React.DragEvent) => {
  event.preventDefault()
  const type = event.dataTransfer.getData('application/reactflow')
  if (!type) return

  // Convert screen coords to React Flow coords
  const position = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  })

  addNode(type, position)
}, [screenToFlowPosition, addNode])

const onDragOver = useCallback((event: React.DragEvent) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}, [])

return (
  <ReactFlow
    onDrop={onDrop}
    onDragOver={onDragOver}
    ...
  />
)
```

## Node Glow Effect (Running State)

```css
/* In globals.css */
.node-running {
  animation: pulse-glow 1.5s ease-in-out infinite;
  border-color: #7c3aed !important;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 8px 2px rgba(124, 58, 237, 0.4),
                0 0 0 1px rgba(124, 58, 237, 0.3);
  }
  50% {
    box-shadow: 0 0 24px 8px rgba(124, 58, 237, 0.7),
                0 0 0 1px rgba(124, 58, 237, 0.6);
  }
}
```

```tsx
// In BaseNode.tsx — apply conditionally
const isRunning = useExecutionStore(s => s.nodeStatuses[id] === 'running')

<div className={cn(
  'rounded-xl border border-krea-border bg-krea-surface',
  isRunning && 'node-running'
)}>
```

## Workflows List Page

```tsx
// src/app/(dashboard)/workflows/page.tsx
// Grid of workflow cards, each showing:
// - Workflow name
// - Last updated (relative time)
// - Number of runs
// - Quick actions: Open, Delete

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* New Workflow Card */}
  <button onClick={createWorkflow}
    className="aspect-video border-2 border-dashed border-krea-border 
               rounded-xl flex flex-col items-center justify-center gap-2
               hover:border-krea-accent hover:bg-krea-accent/5 transition-all">
    <Plus size={24} className="text-krea-muted" />
    <span className="text-sm text-krea-muted">New Workflow</span>
  </button>

  {/* Existing Workflow Cards */}
  {workflows.map(wf => (
    <WorkflowCard key={wf.id} workflow={wf} />
  ))}
</div>
```

## Typography
```css
/* Google Fonts — add to root layout <head> */
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>

/* Body font: Inter */
/* All font sizes: text-xs (12px), text-sm (14px), text-base (16px) */
/* No text larger than text-base in node content */
/* Section labels: text-xs uppercase tracking-wider */
```
