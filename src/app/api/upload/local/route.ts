import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import JSZip from 'jszip'
import { v4 as uuidv4 } from 'uuid'
import { saveLocalProduct } from '@/lib/local-db'
import { isImageFile } from '@/lib/utils'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const title = (formData.get('title') as string)?.trim()
    const folderName = (formData.get('folderName') as string)?.trim() || title
    const rawFiles = formData.getAll('files') as File[]

    if (!title || rawFiles.length === 0) {
      return NextResponse.json({ error: 'Missing title or files' }, { status: 400 })
    }

    const productId = uuidv4()
    const origin = new URL(request.url).origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin

    // Directories
    const filesDir = join(process.cwd(), 'public', 'uploads', productId, 'files')
    await mkdir(filesDir, { recursive: true })

    const fileMetadata: Product['files'] = []
    let previewImageUrl: string | null = null

    // Save individual files + build ZIP
    const zip = new JSZip()

    for (const file of rawFiles) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const safeName = file.name.replace(/[^\w.\-\s]/g, '_').trim()
      await writeFile(join(filesDir, safeName), bytes)
      zip.file(file.name, bytes)

      const publicPath = `/uploads/${productId}/files/${safeName}`
      const publicUrl = `${appUrl}${publicPath}`

      fileMetadata.push({ name: file.name, size: file.size, type: file.type, path: publicPath, url: publicUrl })

      if (!previewImageUrl && isImageFile(file.name)) {
        previewImageUrl = publicUrl
      }
    }

    // Write ZIP
    const zipBytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    await writeFile(join(process.cwd(), 'public', 'uploads', productId, 'archive.zip'), zipBytes)
    const zipUrl = `${appUrl}/uploads/${productId}/archive.zip`

    const product: Product = {
      id: productId,
      title,
      description: '',
      folder_name: folderName,
      files: fileMetadata,
      storage_path: `/uploads/${productId}`,
      download_url: zipUrl,
      zip_url: zipUrl,
      zip_storage_path: `/uploads/${productId}/archive.zip`,
      total_size: rawFiles.reduce((s, f) => s + f.size, 0),
      file_count: rawFiles.length,
      preview_image_url: previewImageUrl,
      preview_image_storage_path: null,
      status: 'active',
      download_count: 0,
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pdf_generations: [],
    }

    await saveLocalProduct(product)
    return NextResponse.json({ product })
  } catch (err) {
    console.error('Local upload error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
