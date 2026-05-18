import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { generateDeliveryPDF } from '@/lib/pdf-generator'
import {
  isSupabaseConfigured,
  getLocalProduct,
  getLocalShop,
  addLocalPDFGeneration,
} from '@/lib/local-db'
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase'
import type { PDFTemplate, PDFGeneration } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function rewriteLocalUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return url ?? null
  try {
    const u = new URL(url)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      const o = new URL(origin)
      u.host = o.host
      u.protocol = o.protocol
      return u.toString()
    }
  } catch {}
  return url
}

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const body = await request.json()
    const { template = 'neutral', customMessage } = body as {
      template: PDFTemplate
      customMessage?: string
    }

    const origin = new URL(request.url).origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin

    // ── LOCAL MODE (no Supabase) ─────────────────────────────
    if (!isSupabaseConfigured()) {
      const rawProduct = await getLocalProduct(params.productId)
      if (!rawProduct) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      // Rewrite any stored localhost URLs to the actual request origin so
      // that links embedded in the PDF point to the correct port.
      const product = {
        ...rawProduct,
        zip_url: rewriteLocalUrl(rawProduct.zip_url, origin),
        download_url: rewriteLocalUrl(rawProduct.download_url, origin),
        preview_image_url: rewriteLocalUrl(rawProduct.preview_image_url, origin),
        files: rawProduct.files.map((f) => ({ ...f, url: rewriteLocalUrl(f.url, origin)! })),
      }

      const shop = await getLocalShop()

      // Read the ZIP file and embed it in the PDF (max 200 MB)
      const MAX_ATTACHMENT_BYTES = 200 * 1024 * 1024
      let zipAttachment: { data: Uint8Array; filename: string } | null = null
      const zipPath = rawProduct.zip_storage_path
      if (zipPath) {
        try {
          const absPath = join(process.cwd(), 'public', zipPath.replace(/^\//, ''))
          const info = await stat(absPath)
          if (info.size <= MAX_ATTACHMENT_BYTES) {
            const zipData = await readFile(absPath)
            zipAttachment = { data: new Uint8Array(zipData), filename: `${rawProduct.title}.zip` }
          }
        } catch {
          // ZIP not found — generate without attachment
        }
      }

      const pdfBytes = await generateDeliveryPDF({
        product,
        shop: shop as Parameters<typeof generateDeliveryPDF>[0]['shop'],
        template,
        customMessage,
        appUrl,
        zipAttachment,
      })

      // Save PDF to public/pdfs/
      const pdfDir = join(process.cwd(), 'public', 'pdfs', params.productId)
      await mkdir(pdfDir, { recursive: true })
      const filename = `${template}-delivery.pdf`
      await writeFile(join(pdfDir, filename), pdfBytes)

      const pdfUrl = `${origin}/api/pdf/${params.productId}?template=${template}`
      const pdfGenId = uuidv4()

      const pdfGeneration: PDFGeneration = {
        id: pdfGenId,
        product_id: params.productId,
        template,
        pdf_url: pdfUrl,
        pdf_storage_path: `pdfs/${params.productId}/${filename}`,
        custom_message: customMessage ?? null,
        is_latest: true,
        file_size: pdfBytes.length,
        created_at: new Date().toISOString(),
      }

      await addLocalPDFGeneration(params.productId, pdfGeneration)

      return NextResponse.json({ pdfGeneration, pdfUrl })
    }

    // ── SUPABASE MODE ────────────────────────────────────────
    const supabase = createAdminClient()

    const { data: product, error: productError } = await supabase
      .from('products').select('*').eq('id', params.productId).single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: shopRows } = await supabase.from('shop_settings').select('*').limit(1)
    const shop = shopRows?.[0] ?? {
      name: 'My Etsy Shop', tagline: 'Digital Downloads',
      etsy_url: '', support_email: '', logo_url: null,
      default_template: 'neutral',
      custom_thank_you_message: 'Thank you for your purchase!',
    }

    const pdfBytes = await generateDeliveryPDF({ product, shop, template, customMessage, appUrl })

    await supabase.from('pdf_generations')
      .update({ is_latest: false }).eq('product_id', params.productId)

    const timestamp = Date.now()
    const pdfPath = `pdfs/${params.productId}/${timestamp}-${template}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(pdfPath)

    const { data: pdfGen } = await supabase.from('pdf_generations').insert({
      product_id: params.productId, template,
      pdf_url: urlData.publicUrl, pdf_storage_path: pdfPath,
      custom_message: customMessage ?? null,
      is_latest: true, file_size: pdfBytes.length,
    }).select().single()

    return NextResponse.json({ pdfGeneration: pdfGen, pdfUrl: urlData.publicUrl })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
