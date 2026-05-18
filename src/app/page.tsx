'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package,
  FileText,
  Download,
  Plus,
  AlertCircle,
  Loader2,
  Eye,
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import ProductCard from '@/components/dashboard/ProductCard'
import TemplatePreviewBar from '@/components/dashboard/TemplatePreviewBar'
import type { Product } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products?status=active')
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  function handleArchive(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const stats = {
    total: products.length,
    withPDF: products.filter((p) => p.pdf_generations?.some((g) => g.is_latest)).length,
    downloads: products.reduce((sum, p) => sum + p.download_count, 0),
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage your digital product delivery PDFs
          </p>
        </div>
        <Link href="/upload" className="btn-accent gap-2">
          <Plus className="w-4 h-4" />
          New Upload
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone-500">Total Products</p>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800">{stats.total}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone-500">PDFs Generated</p>
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-brand-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800">{stats.withPDF}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone-500">Total Downloads</p>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Download className="w-4.5 h-4.5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-800">{stats.downloads}</p>
        </div>
      </div>

      {/* Template preview bar — works without Supabase */}
      <TemplatePreviewBar />

      {/* Products list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-700">Your Products</h2>
          {products.length > 0 && (
            <span className="text-xs text-stone-400">{products.length} active</span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="card p-6 flex items-center gap-3 text-red-700 bg-red-50 border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="card p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-base font-semibold text-stone-700 mb-1">No products yet</h3>
            <p className="text-sm text-stone-400 mb-6 max-w-sm">
              Upload your first digital product folder and generate a professional PDF delivery
              file for your Etsy buyers.
            </p>
            <Link href="/upload" className="btn-accent">
              <Plus className="w-4 h-4" />
              Upload Your First Product
            </Link>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="space-y-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                appUrl={APP_URL}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
