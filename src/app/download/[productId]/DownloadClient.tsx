'use client'

import { useState } from 'react'
import Image from 'next/image'
import JSZip from 'jszip'
import { Download, CheckCircle, ExternalLink, Loader2 } from 'lucide-react'
import { formatBytes, getFileIcon } from '@/lib/utils'
import type { Product, ShopSettings } from '@/types'

interface Props {
  product: Product
  shop: ShopSettings
  productId: string
}

export default function DownloadClient({ product, shop, productId }: Props) {
  const [downloaded, setDownloaded] = useState(false)
  const [zipping, setZipping] = useState(false)

  async function trackAndDownload(url: string, type: 'zip' | 'file', fileName?: string) {
    fetch(`/api/track/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download_type: type, file_name: fileName }),
    }).catch(() => {})

    const a = document.createElement('a')
    a.href = url
    a.download = fileName ?? `${product.title}.zip`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()

    if (type === 'zip') setDownloaded(true)
  }

  async function downloadAllAsZip() {
    setZipping(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        product.files.map(async (file) => {
          const url = file.url || file.path
          const res = await fetch(url)
          const blob = await res.blob()
          zip.file(file.name, blob)
        })
      )
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } })
      const objectUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${product.title}.zip`
      a.click()
      URL.revokeObjectURL(objectUrl)
      setDownloaded(true)

      fetch(`/api/track/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_type: 'zip' }),
      }).catch(() => {})
    } catch (err) {
      console.error('ZIP creation failed:', err)
      alert('Could not create ZIP. Please download files individually below.')
    } finally {
      setZipping(false)
    }
  }

  const hasStoredZip = !!(product.zip_url || product.zip_storage_path)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar with shop branding */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          {shop.logo_url ? (
            <div className="w-9 h-9 relative rounded-lg overflow-hidden flex-shrink-0">
              <Image src={shop.logo_url} alt={shop.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {shop.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-stone-800">{shop.name}</p>
            {shop.etsy_url && (
              <a
                href={shop.etsy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-stone-400 hover:text-brand-600 flex items-center gap-1"
              >
                Visit our Etsy shop <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Thank you card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Product image */}
          {product.preview_image_url && (
            <div className="w-full h-48 relative bg-stone-100">
              <Image
                src={product.preview_image_url}
                alt={product.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="p-6">
            {/* Status badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-4">
              <CheckCircle className="w-3.5 h-3.5" />
              Your download is ready
            </div>

            <h1 className="text-xl font-bold text-stone-800 mb-1">{product.title}</h1>
            <p className="text-sm text-stone-500 mb-5">
              {product.file_count} file{product.file_count !== 1 ? 's' : ''} ·{' '}
              {formatBytes(product.total_size)}
            </p>

            {/* Thank you message */}
            <div className="bg-stone-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-stone-600 leading-relaxed">
                {shop.custom_thank_you_message ||
                  'Thank you so much for your purchase! Your files are ready to download below. Please reach out if you have any questions.'}
              </p>
            </div>

            {/* Primary download button */}
            {hasStoredZip ? (
              <button
                onClick={() => trackAndDownload(product.zip_url || product.zip_storage_path!, 'zip')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl
                           bg-stone-800 text-white font-semibold text-base hover:bg-stone-700
                           active:scale-[0.99] transition-all shadow-lg shadow-stone-200 mb-3"
              >
                <Download className="w-5 h-5" />
                {downloaded ? 'Download Again' : 'Download All Files'}
              </button>
            ) : (
              <button
                onClick={downloadAllAsZip}
                disabled={zipping}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl
                           bg-stone-800 text-white font-semibold text-base hover:bg-stone-700
                           active:scale-[0.99] transition-all shadow-lg shadow-stone-200 mb-3
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {zipping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating ZIP…
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {downloaded ? 'Download Again' : 'Download All Files'}
                  </>
                )}
              </button>
            )}

            {downloaded && !zipping && (
              <div className="flex items-center gap-2 justify-center text-emerald-600 text-sm py-2">
                <CheckCircle className="w-4 h-4" />
                Download started — check your Downloads folder!
              </div>
            )}
          </div>
        </div>

        {/* Individual files */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-700">Individual Files</h2>
            <p className="text-xs text-stone-400 mt-0.5">Click any file to download it separately</p>
          </div>
          <div className="divide-y divide-stone-100">
            {product.files.map((file, i) => (
              <button
                key={i}
                onClick={() => trackAndDownload(file.url || file.path, 'file', file.name)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors text-left group"
              >
                <span className="text-xl">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{file.name}</p>
                  <p className="text-xs text-stone-400">{formatBytes(file.size)}</p>
                </div>
                <Download className="w-4 h-4 text-stone-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">How to Use Your Files</h3>
          <ol className="space-y-2 text-sm text-stone-600">
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">1</span>
              Click "Download All Files" to get the ZIP archive.
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">2</span>
              Unzip the downloaded file to access all your files.
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">3</span>
              Print at your local print shop or at home on your printer.
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">4</span>
              This link is permanent — you can return any time to re-download.
            </li>
          </ol>
        </div>

        {/* Support footer */}
        {shop.support_email && (
          <div className="text-center py-4">
            <p className="text-sm text-stone-400">
              Questions?{' '}
              <a
                href={`mailto:${shop.support_email}`}
                className="text-brand-600 hover:underline font-medium"
              >
                Contact us
              </a>
              {' '}— we're happy to help!
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
