import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const body = await request.json()
    const { download_type = 'zip', file_name } = body

    const supabase = createAdminClient()
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
    const ua = request.headers.get('user-agent')

    await supabase.from('download_events').insert({
      product_id: params.productId,
      ip_address: ip,
      user_agent: ua,
      download_type,
      file_name: file_name || null,
    })

    // Increment download count
    await supabase.rpc('increment_download_count', { product_id: params.productId })

    return NextResponse.json({ success: true })
  } catch (err) {
    // Non-critical — don't fail on tracking errors
    console.error('Track error:', err)
    return NextResponse.json({ success: false })
  }
}
