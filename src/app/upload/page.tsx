'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Upload as UploadIcon, ChevronRight, Info } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import DropZone from '@/components/upload/DropZone'
import { getSupabaseClient, STORAGE_BUCKET } from '@/lib/supabase'
import { isImageFile } from '@/lib/utils'

type Stage = 'idle' | 'uploading' | 'completing' | 'done'
interface Progress { stage: Stage; message: string; percent: number }

// Detected at build time — empty string when not configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const USE_LOCAL = !SUPABASE_URL || !SUPABASE_URL.startsWith('https://')

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Upload timed out after ${Math.round(ms / 60000)} min`)), ms)
    promise.then((v) => { clearTimeout(timer); resolve(v) }, (e) => { clearTimeout(timer); reject(e) })
  })
}

export default function UploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState<Progress>({ stage: 'idle', message: '', percent: 0 })
  const isUploading = progress.stage !== 'idle' && progress.stage !== 'done'

  function onFilesChange(newFiles: File[]) {
    setFiles(newFiles)
    if (newFiles.length > 0 && !title) {
      const firstPath = (newFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath
      if (firstPath) setTitle(firstPath.split('/')[0])
    }
  }

  // ── LOCAL upload (no Supabase) ─────────────────────────────
  async function uploadLocal() {
    setProgress({ stage: 'uploading', message: 'Saving files locally…', percent: 20 })

    const formData = new FormData()
    formData.append('title', title.trim())
    const folderName = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] || title
    formData.append('folderName', folderName)
    files.forEach((f) => formData.append('files', f))

    setProgress({ stage: 'uploading', message: `Uploading ${files.length} files…`, percent: 40 })

    const res = await fetch('/api/upload/local', { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Local upload failed')
    }
    const { product } = await res.json()

    setProgress({ stage: 'done', message: 'Upload complete!', percent: 100 })
    toast.success('Files uploaded! Now generate your delivery PDF.')
    setTimeout(() => router.push(`/products/${product.id}`), 900)
  }

  // ── SUPABASE upload ────────────────────────────────────────
  async function uploadSupabase() {
    setProgress({ stage: 'uploading', message: 'Preparing upload…', percent: 5 })

    const folderName =
      (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] || title

    const initRes = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        folderName,
        files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      }),
    })
    if (!initRes.ok) {
      const text = await initRes.text()
      let msg = 'Failed to initialise upload'
      try { msg = JSON.parse(text).error || msg } catch { msg = text || msg }
      throw new Error(msg)
    }
    const { productId, signedUrls } = await initRes.json()

    // Upload files with limited concurrency (2 at a time = full bandwidth per file)
    setProgress({ stage: 'uploading', message: `Uploading ${files.length} files…`, percent: 10 })
    let done = 0
    let previewImagePath: string | null = null
    const uploaded: { name: string; path: string; type: string; size: number; url: string }[] = []
    const queue = [...files]

    async function worker() {
      while (queue.length > 0) {
        const file = queue.shift()!
        const sd = signedUrls[file.name]
        if (!sd) throw new Error(`No upload URL for ${file.name}`)
        const result = await withTimeout(
          getSupabaseClient().storage.from(STORAGE_BUCKET).uploadToSignedUrl(sd.path, sd.token, file, { contentType: file.type }),
          8 * 60 * 1000
        )
        if (result.error) throw new Error(`Failed to upload ${file.name}: ${result.error.message}`)
        done++
        setProgress({ stage: 'uploading', message: `Uploading… ${done} of ${files.length} done`, percent: 10 + (done / files.length) * 80 })
        if (!previewImagePath && isImageFile(file.name)) previewImagePath = sd.path
        uploaded.push({ name: file.name, path: sd.path, type: file.type, size: file.size, url: '' })
      }
    }
    await Promise.all([worker(), worker()]) // 2 concurrent streams

    // Finalize
    setProgress({ stage: 'completing', message: 'Finalising…', percent: 92 })
    const completeRes = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, files: uploaded, zipPath: null, previewImagePath }),
    })
    if (!completeRes.ok) {
      const text = await completeRes.text()
      let msg = 'Finalise failed'
      try { msg = JSON.parse(text).error || msg } catch { msg = text || msg }
      throw new Error(msg)
    }

    setProgress({ stage: 'done', message: 'Upload complete!', percent: 100 })
    toast.success('Files uploaded! Now generate your delivery PDF.')
    setTimeout(() => router.push(`/products/${productId}`), 900)
  }

  async function handleUpload() {
    if (files.length === 0) { toast.error('Please select files to upload'); return }
    if (!title.trim()) { toast.error('Please enter a product title'); return }

    try {
      if (USE_LOCAL) await uploadLocal()
      else await uploadSupabase()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      setProgress({ stage: 'idle', message: '', percent: 0 })
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Upload Product Files</h1>
          <p className="text-sm text-stone-500 mt-1">
            Upload your digital product folder to generate a delivery PDF for Etsy buyers.
          </p>
        </div>

        {/* Mode banner */}
        {USE_LOCAL && (
          <div className="flex items-start gap-3 p-3.5 mb-6 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Local mode</strong> — files are stored on this computer.
              Set up Supabase in <code>.env.local</code> to enable cloud storage for sharing with buyers.
            </span>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="label">Product Title</label>
            <input
              type="text" className="input"
              placeholder="e.g. Wildflower Botanical Wall Art Set"
              value={title} onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="label">Product Files</label>
            <DropZone files={files} onFilesChange={onFilesChange} />
          </div>

          {progress.stage !== 'idle' && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {progress.stage === 'done'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                  }
                  <span className="text-sm font-medium text-stone-700">{progress.message}</span>
                </div>
                <span className="text-xs text-stone-400">{Math.round(progress.percent)}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-300 progress-animated"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {progress.stage === 'idle' && (
            <button
              type="button" onClick={handleUpload}
              disabled={files.length === 0 || !title.trim()}
              className="btn-accent w-full py-3 text-sm"
            >
              <UploadIcon className="w-4 h-4" />
              Upload & Continue
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
