import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { isSupabaseConfigured, getLocalProduct } from '@/lib/local-db'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const { searchParams } = new URL(request.url)
  const template = searchParams.get('template') ?? 'neutral'

  if (!isSupabaseConfigured()) {
    const product = await getLocalProduct(params.productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const filename = `${template}-delivery.pdf`
    const filePath = join(process.cwd(), 'public', 'pdfs', params.productId, filename)

    try {
      const pdfBytes = await readFile(filePath)
      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      })
    } catch {
      return NextResponse.json({ error: 'PDF not found — generate it first' }, { status: 404 })
    }
  }

  // Supabase mode: redirect to the stored pdf_url
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('pdf_generations')
    .select('pdf_url')
    .eq('product_id', params.productId)
    .eq('is_latest', true)
    .single()

  if (!data?.pdf_url) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
  }

  return NextResponse.redirect(data.pdf_url)
}
