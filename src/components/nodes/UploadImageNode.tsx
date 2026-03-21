// src/components/nodes/UploadImageNode.tsx
'use client'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import { BaseNode } from './BaseNode'
import { useWorkflowStore } from '@/store/workflow-store'
import type { UploadImageFlowNode } from '@/types/nodes'

export function UploadImageNode({ id, data }: NodeProps<UploadImageFlowNode>) {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true)
      setUploadStatus('Preparing upload...')
      updateNodeData(id, { error: null })

      const res = await fetch('/api/upload/params', {
        method: 'POST',
        body: JSON.stringify({ fileType: 'image', fileName: file.name }),
        headers: { 'Content-Type': 'application/json' },
      })
      const paramsPayload = await res.json()
      if (!res.ok) {
        updateNodeData(id, {
          error: paramsPayload.error ?? 'Failed to prepare upload params',
        })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }
      const { params, paramsString, signature } = paramsPayload

      const formData = new FormData()
      formData.append('params', typeof paramsString === 'string' ? paramsString : JSON.stringify(params))
      formData.append('signature', signature)
      formData.append('file', file)

      const uploadRes = await fetch('https://api2.transloadit.com/assemblies', {
        method: 'POST',
        body: formData,
      })
      const assembly = await uploadRes.json()
      if (!uploadRes.ok) {
        const uploadError =
          assembly?.error ??
          assembly?.message ??
          (Array.isArray(assembly?.errors) ? assembly.errors.join(', ') : null) ??
          `Transloadit upload failed (${uploadRes.status})`
        updateNodeData(id, { error: uploadError })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }
      if (!assembly?.assembly_id) {
        updateNodeData(id, {
          error: 'Upload failed: missing assembly id from Transloadit',
        })
        setIsUploading(false)
        setUploadStatus(null)
        return
      }

      let attempts = 0
      const poll = async (): Promise<string | null> => {
        setUploadStatus(`Processing upload... (${Math.min(attempts + 1, 20)}/20)`)
        const statusRes = await fetch(`https://api2.transloadit.com/assemblies/${assembly.assembly_id}`)
        const status = await statusRes.json()
        if (status.ok === 'ASSEMBLY_COMPLETED') {
          return status.results?.optimized?.[0]?.url ?? status.results?.[':original']?.[0]?.url
        }
        if (attempts++ < 20 && status.ok !== 'REQUEST_ABORTED') {
          await new Promise(r => setTimeout(r, 1000))
          return poll()
        }
        return null
      }

      const imageUrl = await poll()
      if (imageUrl) {
        updateNodeData(id, {
          imageUrl,
          fileName: file.name,
          error: null,
        })
        setIsUploading(false)
        setUploadStatus(null)
      } else {
        updateNodeData(id, {
          error: 'Upload polling timed out or assembly did not complete',
        })
        setIsUploading(false)
        setUploadStatus(null)
      }
    } catch (err) {
      console.error('Upload failed', err)
      updateNodeData(id, {
        error: 'Upload failed. Check console/logs for details.',
      })
      setIsUploading(false)
      setUploadStatus(null)
    }
  }, [id, updateNodeData])

  return (
    <BaseNode id={id} title="Upload Image" icon={<ImageIcon size={14} />} showRunButton={false}>
      {data.imageUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.fileName ?? 'uploaded'}
            className="w-full h-32 object-cover rounded-lg border border-[#1f1f1f]"
          />
          <button
            onClick={() => updateNodeData(id, { imageUrl: null, fileName: null })}
            className="absolute top-1 right-1 bg-[#0a0a0a]/80 rounded p-0.5 text-[#6b7280] hover:text-red-400 transition-colors"
          >
            ✕
          </button>
          {data.fileName && (
            <p className="text-xs text-[#6b7280] mt-1 truncate">{data.fileName}</p>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed
                         border-[#1f1f1f] rounded-lg cursor-pointer hover:border-[#7c3aed]
                         transition-colors nodrag">
          {isUploading ? (
            <>
              <Loader2 size={20} className="text-[#7c3aed] mb-1 animate-spin" />
              <span className="text-xs text-[#9ca3af]">{uploadStatus ?? 'Uploading...'}</span>
            </>
          ) : (
            <>
              <Upload size={20} className="text-[#6b7280] mb-1" />
              <span className="text-xs text-[#6b7280]">jpg, jpeg, png, webp, gif</span>
            </>
          )}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            disabled={isUploading}
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      )}
      {data.error && (
        <div className="mt-2 p-2 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/30">
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
