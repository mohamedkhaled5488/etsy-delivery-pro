import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { createAdminClient, getPublicUrl, STORAGE_BUCKET } from '@/lib/supabase'
import { isImageFile } from '@/lib/utils'
import type { UploadCompletePayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: UploadCompletePayload = await request.json()
    const { productId, files, zipPath, previewImagePath } = body

    if (!productId || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Build file metadata with public URLs
    const fileMetadata = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      path: f.path,
      url: getPublicUrl(f.path),
    }))

    // Determine preview image
    let previewImageUrl: string | null = null
    let previewStoragePath: string | null = null

    if (previewImagePath) {
      previewStoragePath = previewImagePath
      previewImageUrl = getPublicUrl(previewImagePath)
    } else {
      // Auto-pick first image file
      const imageFile = fileMetadata.find((f) =>
        isImageFile(f.name)
      )
      if (imageFile) {
        previewStoragePath = imageFile.path
        previewImageUrl = imageFile.url
      }
    }

    // ZIP public URL (null if ZIP upload was skipped due to size limits)
    const zipUrl = zipPath ? getPublicUrl(zipPath) : null

    // Update product record
    const { data: product, error: dbError } = await supabase
      .from('products')
      .update({
        files: fileMetadata,
        download_url: zipUrl ?? fileMetadata[0]?.url ?? '',
        zip_url: zipUrl,
        zip_storage_path: zipPath ?? null,
        preview_image_url: previewImageUrl,
        preview_image_storage_path: previewStoragePath,
        status: 'active',
        total_size: fileMetadata.reduce((sum, f) => sum + f.size, 0),
        file_count: fileMetadata.length,
      })
      .eq('id', productId)
      .select()
      .single()

    if (dbError) {
      console.error('DB update error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ product })
  } catch (err) {
    console.error('Upload complete error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
