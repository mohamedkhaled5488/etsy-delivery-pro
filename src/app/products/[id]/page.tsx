'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  FileText,
  Download,
  Copy,
  CheckCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Package,
  Wand2,
  Clock,
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import TemplateSelector from '@/components/pdf/TemplateSelector'
import { formatBytes, formatDateRelative, copyToClipboard, generatePublicDownloadUrl } from '@/lib/utils'
import type { Product, PDFTemplate } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function ProductPage() {
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate>('neutral')
  const [customMessage, setCustomMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const downloadPageUrl = generatePublicDownloadUrl(productId, APP_URL)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (!res.ok) throw new Error('Product not found')
      const data = await res.json()
      setProduct(data.product)

      const latestPDF = data.product.pdf_generations?.find((g: { is_latest: boolean }) => g.is_latest)
      if (latestPDF) setSelectedTemplate(latestPDF.template)
    } catch {
      toast.error('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePDF() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/generate-pdf/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate, customMessage: customMessage || undefined }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'PDF generation failed')
      }

      const data = await res.json()
      toast.success('PDF generated successfully!')

      // Refresh product to show new PDF
      await fetchProduct()

      // Auto-download via the API route (relative URL avoids port mismatch)
      window.open(`/api/pdf/${productId}?template=${selectedTemplate}`, '_blank')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopyLink() {
    const ok = await copyToClipboard(downloadPageUrl)
    if (ok) {
      setCopied(true)
      toast.success('Download link copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-stone-500">Product not found</p>
          <Link href="/" className="btn-secondary mt-4">Back to Dashboard</Link>
        </div>
      </AppLayout>
    )
  }

  const latestPDF = product.pdf_generations?.find((g) => g.is_latest)
  const allPDFs = product.pdf_generations?.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT: Product info + generate PDF */}
        <div className="col-span-2 space-y-5">
          {/* Product header */}
          <div className="card p-5">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-xl bg-stone-100 overflow-hidden relative flex-shrink-0">
                {product.preview_image_url ? (
                  <Image
                    src={product.preview_image_url}
                    alt={product.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-stone-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-stone-800">{product.title}</h1>
                <p className="text-sm text-stone-400 mt-1">
                  {product.file_count} files · {formatBytes(product.total_size)} ·
                  Uploaded {formatDateRelative(product.created_at)}
                </p>

                {/* Download link */}
                <div className="flex items-center gap-2 mt-3 p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-500 truncate flex-1">{downloadPageUrl}</span>
                  <button onClick={handleCopyLink} className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}>
                    {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a href={downloadPageUrl} target="_blank" rel="noopener noreferrer"
                     className="flex-shrink-0 p-1.5 rounded border border-stone-300 bg-white text-stone-500 hover:bg-stone-50">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Generator */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-stone-800">Generate Delivery PDF</h2>
            </div>

            {/* Template selector */}
            <div>
              <label className="label">Choose Template</label>
              <TemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate} />
            </div>

            {/* Custom message */}
            <div>
              <label className="label">Custom Thank You Message (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Leave blank to use your shop's default message from Settings…"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGeneratePDF}
              disabled={generating}
              className="btn-accent w-full py-3"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {latestPDF ? 'Regenerate PDF' : 'Generate PDF'}
                </>
              )}
            </button>

            {latestPDF && (
              <p className="text-xs text-center text-stone-400">
                Last generated {formatDateRelative(latestPDF.created_at)} · {latestPDF.template} template ·{' '}
                {formatBytes(latestPDF.file_size)}
              </p>
            )}
          </div>

          {/* Files list */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-700">Files in This Product</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {product.files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-base">{getFileEmoji(file.name)}</span>
                  <span className="flex-1 text-sm text-stone-700 truncate">{file.name}</span>
                  <span className="text-xs text-stone-400 flex-shrink-0">{formatBytes(file.size)}</span>
                  <a href={file.url} target="_blank" rel="noopener noreferrer"
                     className="flex-shrink-0 p-1.5 text-stone-400 hover:text-brand-600 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: PDF History */}
        <div className="space-y-5">
          {/* Download latest PDF */}
          {latestPDF?.pdf_url && (
            <div className="card p-5 bg-brand-50 border-brand-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-brand-600" />
                <p className="text-sm font-semibold text-brand-800">PDF Ready</p>
              </div>
              <p className="text-xs text-brand-600 mb-4">
                Upload this PDF to Etsy as your digital delivery file.
              </p>
              <a
                href={`/api/pdf/${productId}?template=${latestPDF.template}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
                           bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          )}

          {/* ZIP download */}
          {product.zip_url && (
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-600 mb-2">ZIP Archive</p>
              <a
                href={product.zip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
              >
                <Download className="w-3.5 h-3.5" />
                Download All Files (ZIP)
              </a>
            </div>
          )}

          {/* PDF History */}
          {allPDFs && allPDFs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100">
                <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">PDF History</h3>
              </div>
              <div className="divide-y divide-stone-100">
                {allPDFs.map((pdf) => (
                  <div key={pdf.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-stone-700 capitalize">{pdf.template}</p>
                      <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDateRelative(pdf.created_at)}
                        {pdf.is_latest && (
                          <span className="ml-1 px-1 py-px bg-brand-100 text-brand-700 rounded text-[9px] font-medium">
                            Latest
                          </span>
                        )}
                      </p>
                    </div>
                    {pdf.pdf_url && (
                      <a
                        href={`/api/pdf/${productId}?template=${pdf.template}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-brand-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function getFileEmoji(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
    svg: '🎨', ai: '🎨', psd: '🎨', eps: '🎨',
    pdf: '📄',
    zip: '🗜️', rar: '🗜️',
  }
  return map[ext] ?? '📁'
}
