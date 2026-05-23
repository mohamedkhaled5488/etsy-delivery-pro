import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { createAdminClient, STORAGE_BUCKET } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import type { UploadInitPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: UploadInitPayload = await request.json()
    const { title, folderName, files } = body

    if (!title || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const productId = uuidv4()

    // Generate signed upload URLs for all files in parallel + insert DB record simultaneously
    const urlResults = await Promise.all(
      files.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
        const path = `products/${productId}/files/${safeName}`
        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path)
        if (error) throw new Error(`Failed to create upload URL for ${file.name}: ${error.message}`)
        return { fileName: file.name, signedUrl: data.signedUrl, token: data.token, path }
      })
    )

    const signedUrls: Record<string, { signedUrl: string; token: string; path: string }> = {}
    for (const r of urlResults) {
      signedUrls[r.fileName] = { signedUrl: r.signedUrl, token: r.token, path: r.path }
    }

    // Create placeholder product record (status: uploading)
    const { error: dbError } = await supabase.from('products').insert({
      id: productId,
      title,
      folder_name: folderName || title,
      files: [],
      storage_path: `products/${productId}`,
      download_url: '',
      status: 'uploading',
      file_count: files.length,
      total_size: files.reduce((sum, f) => sum + f.size, 0),
    })

    if (dbError) {
      console.error('DB insert error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ productId, signedUrls })
  } catch (err) {
    console.error('Upload init error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
