'use client'

import { useRef, useState, useCallback, DragEvent } from 'react'
import { FolderOpen, Upload, X, Image, FileText, Archive } from 'lucide-react'
import { cn, formatBytes, getFileExtension } from '@/lib/utils'

interface DropZoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'pdf', 'zip', 'ai', 'eps', 'psd']

function getFileIconComponent(filename: string) {
  const ext = getFileExtension(filename)
  if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) return Image
  if (ext === 'pdf') return FileText
  if (['zip', 'rar'].includes(ext)) return Archive
  return FileText
}

async function readDirectoryEntry(entry: FileSystemDirectoryEntry): Promise<File[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader()
    const results: File[] = []

    function readBatch() {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(results)
          return
        }

        for (const e of entries) {
          if (e.isFile) {
            const file = await new Promise<File>((res) =>
              (e as FileSystemFileEntry).file(res)
            )
            const ext = getFileExtension(file.name)
            if (ACCEPTED_EXTENSIONS.includes(ext)) {
              results.push(file)
            }
          } else if (e.isDirectory) {
            const nested = await readDirectoryEntry(e as FileSystemDirectoryEntry)
            results.push(...nested)
          }
        }
        readBatch()
      })
    }

    readBatch()
  })
}

export default function DropZone({ files, onFilesChange }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mergeFiles = useCallback(
    (newFiles: File[]) => {
      const existing = new Set(files.map((f) => f.name + f.size))
      const unique = newFiles.filter((f) => !existing.has(f.name + f.size))
      onFilesChange([...files, ...unique])
    },
    [files, onFilesChange]
  )

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const items = e.dataTransfer.items
    const collected: File[] = []

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry()
      if (!entry) continue

      if (entry.isDirectory) {
        const dirFiles = await readDirectoryEntry(entry as FileSystemDirectoryEntry)
        collected.push(...dirFiles)
      } else if (entry.isFile) {
        const file = await new Promise<File>((res) =>
          (entry as FileSystemFileEntry).file(res)
        )
        const ext = getFileExtension(file.name)
        if (ACCEPTED_EXTENSIONS.includes(ext)) collected.push(file)
      }
    }

    if (collected.length > 0) mergeFiles(collected)
  }

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    const filtered = selected.filter((f) =>
      ACCEPTED_EXTENSIONS.includes(getFileExtension(f.name))
    )
    if (filtered.length > 0) mergeFiles(filtered)
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all p-10 text-center cursor-pointer',
          isDragging
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50'
        )}
        onClick={() => folderInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
              isDragging ? 'bg-brand-100' : 'bg-stone-100'
            )}
          >
            <FolderOpen
              className={cn('w-7 h-7', isDragging ? 'text-brand-600' : 'text-stone-400')}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-stone-700">
              {isDragging ? 'Drop your folder here' : 'Drag & drop your folder'}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              or click to browse — JPG, PNG, PDF, ZIP, SVG, WebP, AI, EPS
            </p>
          </div>

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                folderInputRef.current?.click()
              }}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-stone-800 text-white
                         hover:bg-stone-700 transition-colors"
            >
              Select Folder
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-stone-300
                         text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Select Files
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          // @ts-ignore — webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          multiple
          onChange={handleFolderInput}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.svg,.pdf,.zip,.ai,.eps,.psd"
          onChange={handleFolderInput}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <span className="text-xs text-stone-400">{formatBytes(totalSize)} total</span>
          </div>

          <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
            {files.map((file, i) => {
              const Icon = getFileIconComponent(file.name)
              return (
                <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-stone-500" />
                  </div>
                  <span className="flex-1 text-xs text-stone-700 truncate">{file.name}</span>
                  <span className="text-xs text-stone-400 flex-shrink-0">{formatBytes(file.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-stone-100 text-stone-400
                               hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
