import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Singleton client for browser/server components (anon key)
let _client: SupabaseClient | null = null
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

// Named export for convenience in client components
export const supabase = {
  get storage() { return getSupabaseClient().storage },
  get from() { return getSupabaseClient().from.bind(getSupabaseClient()) },
  get auth() { return getSupabaseClient().auth },
  get rpc() { return getSupabaseClient().rpc.bind(getSupabaseClient()) },
  uploadToSignedUrl(path: string, token: string, file: File | Blob, options?: Record<string, unknown>) {
    return getSupabaseClient().storage.from(STORAGE_BUCKET).uploadToSignedUrl(path, token, file, options)
  },
} as unknown as SupabaseClient

// Server-side admin client (uses service role key — NEVER expose to browser)
export function createAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured. Add it to .env.local')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const STORAGE_BUCKET = 'digital-products'

export function getPublicUrl(path: string): string {
  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
