import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getLocalProducts, updateLocalProduct } from '@/lib/local-db'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    if (!isSupabaseConfigured()) {
      const all = await getLocalProducts()
      const products = status === 'all' ? all : all.filter((p) => p.status === status)
      return NextResponse.json({ products })
    }

    const supabase = createAdminClient()
    const query = supabase
      .from('products')
      .select('*, pdf_generations(id, template, pdf_url, is_latest, created_at)')
      .order('created_at', { ascending: false })

    if (status !== 'all') query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data })
  } catch (err) {
    console.error('Products GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    if (!isSupabaseConfigured()) {
      await updateLocalProduct(id, { status: 'archived' })
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('products').update({ status: 'archived' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
