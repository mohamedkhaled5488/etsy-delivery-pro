import { NextRequest, NextResponse } from 'next/server'
import { generateDeliveryPDF, TEMPLATE_CONFIGS } from '@/lib/pdf-generator'
import type { PDFTemplate, Product, ShopSettings } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEMO_PRODUCT: Product = {
  id: 'demo-product',
  title: 'Wildflower Botanical Wall Art Set',
  description: 'A beautiful set of botanical prints for your home.',
  folder_name: 'Wildflower Botanical Set',
  files: [
    { name: 'Wildflower_Print_01.jpg', size: 12_500_000, type: 'image/jpeg', url: '', path: '' },
    { name: 'Wildflower_Print_02.jpg', size: 11_200_000, type: 'image/jpeg', url: '', path: '' },
    { name: 'Wildflower_Print_03.png', size: 14_800_000, type: 'image/png',  url: '', path: '' },
    { name: 'Wildflower_Print_04.png', size: 13_100_000, type: 'image/png',  url: '', path: '' },
    { name: 'PrintingGuide.pdf',       size:    420_000, type: 'application/pdf', url: '', path: '' },
    { name: 'AllFiles.zip',            size: 62_000_000, type: 'application/zip', url: '', path: '' },
  ],
  storage_path: 'products/demo',
  download_url: 'https://example.com/download/demo',
  zip_url: 'https://example.com/download/demo/archive.zip',
  zip_storage_path: 'products/demo/archive.zip',
  total_size: 64_020_000,
  file_count: 6,
  preview_image_url: null,
  preview_image_storage_path: null,
  status: 'active',
  download_count: 42,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const DEMO_SHOP: ShopSettings = {
  id: 'demo-shop',
  name: 'Botanical Prints Co.',
  tagline: 'Handcrafted Digital Art & Printables',
  etsy_url: 'https://www.etsy.com/shop/BotanicalPrintsCo',
  support_email: 'hello@botanicalprints.co',
  logo_url: null,
  logo_storage_path: null,
  default_template: 'neutral',
  custom_thank_you_message:
    'Thank you so much for your purchase! Your botanical art files are ready to download. ' +
    'Print at home or at your local print shop at any size. Enjoy!',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const template = (searchParams.get('template') ?? 'neutral') as PDFTemplate

  if (!Object.keys(TEMPLATE_CONFIGS).includes(template)) {
    return NextResponse.json({ error: 'Invalid template' }, { status: 400 })
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const pdfBytes = await generateDeliveryPDF({
      product: DEMO_PRODUCT,
      shop: DEMO_SHOP,
      template,
      appUrl,
    })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="demo-delivery-${template}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Demo PDF error:', err)
    const message = err instanceof Error ? err.message : 'PDF generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
