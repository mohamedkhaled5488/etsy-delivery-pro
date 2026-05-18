/**
 * Simple file-system "database" for local-mode operation (no Supabase needed).
 * Data lives in data/ at the project root.
 * PDFs and uploads are served from public/ by Next.js.
 */
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import type { Product, ShopSettings, PDFGeneration } from '@/types'

const DATA_DIR = join(process.cwd(), 'data')
const PRODUCTS_FILE = join(DATA_DIR, 'products.json')
const SHOP_FILE = join(DATA_DIR, 'shop.json')

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

// ── Products ────────────────────────────────────────────────

export async function getLocalProducts(): Promise<Product[]> {
  try {
    const content = await readFile(PRODUCTS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

export async function getLocalProduct(id: string): Promise<Product | null> {
  const products = await getLocalProducts()
  return products.find((p) => p.id === id) ?? null
}

export async function saveLocalProduct(product: Product): Promise<void> {
  await ensureDataDir()
  const products = await getLocalProducts()
  const idx = products.findIndex((p) => p.id === product.id)
  if (idx >= 0) products[idx] = product
  else products.unshift(product)
  await writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2))
}

export async function updateLocalProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  await ensureDataDir()
  const products = await getLocalProducts()
  const idx = products.findIndex((p) => p.id === id)
  if (idx < 0) return null
  products[idx] = { ...products[idx], ...updates, updated_at: new Date().toISOString() }
  await writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2))
  return products[idx]
}

export async function addLocalPDFGeneration(
  productId: string,
  pdfGen: PDFGeneration
): Promise<void> {
  const products = await getLocalProducts()
  const idx = products.findIndex((p) => p.id === productId)
  if (idx < 0) return

  // Mark previous as not latest
  const prev = (products[idx].pdf_generations ?? []).map((g) => ({ ...g, is_latest: false }))
  products[idx].pdf_generations = [...prev, pdfGen]
  await writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2))
}

// ── Shop ────────────────────────────────────────────────────

const DEFAULT_SHOP: Partial<ShopSettings> = {
  id: 'local-shop',
  name: 'My Etsy Shop',
  tagline: 'Digital Downloads',
  etsy_url: '',
  support_email: '',
  logo_url: null,
  logo_storage_path: null,
  default_template: 'neutral',
  custom_thank_you_message:
    'Thank you so much for your purchase! Your files are ready to download below.',
}

export async function getLocalShop(): Promise<Partial<ShopSettings>> {
  try {
    const content = await readFile(SHOP_FILE, 'utf-8')
    return { ...DEFAULT_SHOP, ...JSON.parse(content) }
  } catch {
    return DEFAULT_SHOP
  }
}

export async function saveLocalShop(shop: Partial<ShopSettings>): Promise<void> {
  await ensureDataDir()
  await writeFile(SHOP_FILE, JSON.stringify(shop, null, 2))
}

// ── Mode detection ──────────────────────────────────────────

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
