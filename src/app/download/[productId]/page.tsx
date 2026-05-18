export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isSupabaseConfigured, getLocalProduct, getLocalShop } from '@/lib/local-db'
import { createAdminClient } from '@/lib/supabase'
import DownloadClient from './DownloadClient'
import type { Product, ShopSettings } from '@/types'

interface Props { params: { productId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let title = 'Download Your Files'
  try {
    if (!isSupabaseConfigured()) {
      const p = await getLocalProduct(params.productId)
      if (p) title = `Download: ${p.title}`
    } else {
      const supabase = createAdminClient()
      const { data } = await supabase.from('products').select('title').eq('id', params.productId).single()
      if (data) title = `Download: ${data.title}`
    }
  } catch {}
  return { title, description: 'Click below to download your digital product files.', robots: { index: false } }
}

export default async function DownloadPage({ params }: Props) {
  let product: Product | null = null
  let shop: Partial<ShopSettings> = {}

  if (!isSupabaseConfigured()) {
    product = await getLocalProduct(params.productId)
    shop = await getLocalShop()
  } else {
    const supabase = createAdminClient()
    const { data: p } = await supabase.from('products').select('*')
      .eq('id', params.productId).eq('status', 'active').single()
    product = p ?? null

    const { data: shopRows } = await supabase.from('shop_settings').select('*').limit(1)
    shop = shopRows?.[0] ?? {}

    if (product) {
      supabase.from('download_events').insert({
        product_id: params.productId, download_type: 'page_view',
      }).then(() => {})
    }
  }

  if (!product || product.status === 'archived') notFound()

  return <DownloadClient product={product} shop={shop as ShopSettings} productId={params.productId} />
}
