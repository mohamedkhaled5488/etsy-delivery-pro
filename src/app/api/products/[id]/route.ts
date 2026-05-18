import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getLocalProduct, updateLocalProduct } from '@/lib/local-db'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isSupabaseConfigured()) {
      const product = await getLocalProduct(params.id)
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      return NextResponse.json({ product })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, pdf_generations(id, template, pdf_url, pdf_storage_path, is_latest, file_size, custom_message, created_at)')
      .eq('id', params.id)
      .single()

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json({ product: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const allowed = ['title', 'description', 'status', 'preview_image_url']
    const updates: Record<string, unknown> = {}
    for (const f of allowed) if (f in body) updates[f] = body[f]

    if (!isSupabaseConfigured()) {
      const product = await updateLocalProduct(params.id, updates as never)
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      return NextResponse.json({ product })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products').update(updates).eq('id', params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
