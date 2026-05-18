'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  FileText,
  Download,
  Copy,
  ExternalLink,
  CheckCircle,
  Package,
  MoreVertical,
  Archive,
  Eye,
} from 'lucide-react'
import { cn, formatBytes, formatDateRelative, copyToClipboard } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  appUrl: string
  onArchive?: (id: string) => void
}

export default function ProductCard({ product, appUrl, onArchive }: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const downloadPageUrl = `${appUrl}/download/${product.id}`
  const latestPDF = product.pdf_generations?.find((g) => g.is_latest)

  async function handleCopyLink() {
    const ok = await copyToClipboard(downloadPageUrl)
    if (ok) {
      setCopied(true)
      toast.success('Download link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleArchive() {
    setMenuOpen(false)
    if (!confirm('Archive this product? It will no longer appear in your dashboard.')) return

    const res = await fetch(`/api/products?id=${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Product archived')
      onArchive?.(product.id)
    } else {
      toast.error('Failed to archive product')
    }
  }

  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700',
    uploading: 'bg-blue-50 text-blue-700',
    expired: 'bg-red-50 text-red-700',
    archived: 'bg-stone-50 text-stone-500',
  }

  return (
    <div className="card hover:shadow-md transition-shadow group">
      <div className="flex gap-4 p-4">
        {/* Preview image */}
        <div className="w-20 h-20 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden relative">
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
              <Package className="w-8 h-8 text-stone-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/products/${product.id}`}
                className="text-sm font-semibold text-stone-800 hover:text-brand-700 truncate block"
              >
                {product.title}
              </Link>
              <p className="text-xs text-stone-400 mt-0.5">
                {product.file_count} files · {formatBytes(product.total_size)} ·{' '}
                {formatDateRelative(product.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={cn('badge text-xs', statusColors[product.status])}>
                {product.status}
              </span>

              {/* Actions menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-7 z-20 bg-white border border-stone-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                      <Link
                        href={`/products/${product.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </Link>
                      <a
                        href={downloadPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview Page
                      </a>
                      <button
                        onClick={handleArchive}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Download className="w-3 h-3" />
              {product.download_count} downloads
            </span>
            {latestPDF && (
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <FileText className="w-3 h-3" />
                PDF: {latestPDF.template}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCopyLink}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                copied
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>

            {latestPDF?.pdf_url ? (
              <a
                href={latestPDF.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                           bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            ) : (
              <Link
                href={`/products/${product.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                           bg-stone-800 text-white hover:bg-stone-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate PDF
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
