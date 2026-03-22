'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'

export function ImportWorkflowButton() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileSelect = async (file: File) => {
    setIsImporting(true)
    setError(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text) as Record<string, unknown>

      const res = await fetch('/api/workflows/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typeof json.name === 'string' ? json.name : 'Imported Workflow',
          nodesJson: json.nodesJson,
          edgesJson: json.edgesJson,
          viewport: json.viewport,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.workflowId) {
        const retryAfter = res.headers.get('Retry-After')
        const retryHint = retryAfter ? ` Retry in ~${retryAfter}s.` : ''
        throw new Error(`${data?.error ?? 'Import failed'}${retryHint}`)
      }

      router.push(`/workflows/${data.workflowId}`)
    } catch (error) {
      console.error(error)
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to import workflow JSON. Ensure it has name, nodesJson and edgesJson.'
      )
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {error && (
        <div className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 rounded-md px-2 py-1">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleImportClick}
        disabled={isImporting}
        className="flex items-center gap-2 px-4 py-2 border border-[#1f1f1f] hover:border-[#2a2a2a]
                   text-[#e5e5e5] text-sm font-medium rounded-lg transition-colors
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Upload size={16} />
        {isImporting ? 'Importing...' : 'Import JSON'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileSelect(file)
        }}
      />
    </>
  )
}
