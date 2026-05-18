'use client'

import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PDFTemplate } from '@/types'

const TEMPLATES: { id: PDFTemplate; label: string; colors: string }[] = [
  { id: 'neutral',  label: 'Neutral',   colors: 'bg-amber-50  border-amber-200  text-amber-800'  },
  { id: 'minimal',  label: 'Minimal',   colors: 'bg-stone-50  border-stone-200  text-stone-800'  },
  { id: 'luxury',   label: 'Luxury',    colors: 'bg-yellow-50 border-yellow-300 text-yellow-900' },
  { id: 'botanical',label: 'Botanical', colors: 'bg-green-50  border-green-200  text-green-800'  },
  { id: 'modern',   label: 'Modern',    colors: 'bg-violet-50 border-violet-200 text-violet-800' },
]

export default function TemplatePreviewBar() {
  const [loading, setLoading] = useState<PDFTemplate | null>(null)

  async function downloadDemo(template: PDFTemplate) {
    setLoading(template)
    try {
      const res = await fetch(`/api/demo-pdf?template=${template}`)
      if (!res.ok) {
        const err = await res.json()
        alert(`PDF generation failed: ${err.error}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `demo-${template}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to generate demo PDF. Check the console for details.')
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-brand-600" />
        <h2 className="text-sm font-semibold text-stone-700">Preview PDF Templates</h2>
        <span className="ml-auto text-xs text-stone-400">No Supabase needed — instant download</span>
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Click any template to download a sample delivery PDF and see exactly how it looks.
      </p>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map(({ id, label, colors }) => (
          <button
            key={id}
            onClick={() => downloadDemo(id)}
            disabled={loading !== null}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium',
              'transition-all hover:shadow-sm active:scale-[0.98] disabled:opacity-60',
              colors
            )}
          >
            {loading === id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
