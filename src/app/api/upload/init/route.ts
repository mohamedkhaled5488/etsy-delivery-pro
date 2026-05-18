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

    // Generate signed upload URLs for each file
    const signedUrls: Record<string, { signedUrl: string; token: string; path: string }> = {}

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
      const path = `products/${productId}/files/${safeName}`

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(path)

      if (error) {
        console.error('Failed to create signed URL for', file.name, error)
        return NextResponse.json(
          { error: `Failed to create upload URL for ${file.name}: ${error.message}` },
          { status: 500 }
        )
      }

      signedUrls[file.name] = {
        signedUrl: data.signedUrl,
        token: data.token,
        path,
      }
    }

    // Signed URL for ZIP
    const zipPath = `products/${productId}/archive.zip`
    const { data: zipSignedData, error: zipError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(zipPath)

    if (zipError) {
      return NextResponse.json(
        { error: `Failed to create ZIP upload URL: ${zipError.message}` },
        { status: 500 }
      )
    }

    // Create placeholder product record (status: uploading)
    const { error: dbError } = await supabase.from('products').insert({
      id: productId,
      title,
      folder_name: folderName || title,
      files: [],
      storage_path: `products/${productId}`,
      download_url: zipSignedData.signedUrl, // Will be updated after upload
      status: 'uploading',
      file_count: files.length,
      total_size: files.reduce((sum, f) => sum + f.size, 0),
    })

    if (dbError) {
      console.error('DB insert error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      productId,
      signedUrls,
      zipSignedUrl: {
        signedUrl: zipSignedData.signedUrl,
        token: zipSignedData.token,
        path: zipPath,
      },
    })
  } catch (err) {
    console.error('Upload init error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
