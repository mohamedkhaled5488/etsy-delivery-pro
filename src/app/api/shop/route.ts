import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { isSupabaseConfigured, getLocalShop, saveLocalShop } from '@/lib/local-db'
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      const shop = await getLocalShop()
      return NextResponse.json({ shop })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.from('shop_settings').select('*').limit(1).single()
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ shop: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const updates = {
      name: formData.get('name') as string,
      tagline: formData.get('tagline') as string,
      etsy_url: formData.get('etsy_url') as string,
      support_email: formData.get('support_email') as string,
      default_template: formData.get('default_template') as string,
      custom_thank_you_message: formData.get('custom_thank_you_message') as string,
    }
    const logoFile = formData.get('logo') as File | null

    if (!isSupabaseConfigured()) {
      const existing = await getLocalShop()
      let logoUrl = existing.logo_url ?? null

      if (logoFile && logoFile.size > 0) {
        const logoDir = join(process.cwd(), 'public', 'shop')
        await mkdir(logoDir, { recursive: true })
        const ext = logoFile.name.split('.').pop() || 'png'
        const logoPath = join(logoDir, `logo.${ext}`)
        await writeFile(logoPath, new Uint8Array(await logoFile.arrayBuffer()))
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        logoUrl = `${appUrl}/shop/logo.${ext}`
      }

      const shop = {
        ...existing,
        ...updates,
        logo_url: logoUrl,
        default_template: updates.default_template as import('@/types').PDFTemplate,
      }
      await saveLocalShop(shop)
      return NextResponse.json({ shop })
    }

    const supabase = createAdminClient()
    const dbUpdates: Record<string, unknown> = { ...updates }

    if (logoFile && logoFile.size > 0) {
      const ext = logoFile.name.split('.').pop() || 'png'
      const logoPath = `shop/logo.${ext}`
      await supabase.storage.from(STORAGE_BUCKET)
        .upload(logoPath, new Uint8Array(await logoFile.arrayBuffer()), {
          contentType: logoFile.type, upsert: true,
        })
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(logoPath)
      dbUpdates.logo_url = urlData.publicUrl
      dbUpdates.logo_storage_path = logoPath
    }

    const { data: existing } = await supabase.from('shop_settings').select('id').limit(1).single()
    let result
    if (existing) {
      const { data } = await supabase.from('shop_settings').update(dbUpdates).eq('id', existing.id).select().single()
      result = data
    } else {
      const { data } = await supabase.from('shop_settings').insert(dbUpdates).select().single()
      result = data
    }
    return NextResponse.json({ shop: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
