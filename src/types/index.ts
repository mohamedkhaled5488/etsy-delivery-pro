export interface FileMetadata {
  name: string
  size: number
  type: string
  url: string
  path: string
}

export interface Product {
  id: string
  title: string
  description: string
  folder_name: string
  files: FileMetadata[]
  storage_path: string
  download_url: string
  zip_url: string | null
  zip_storage_path: string | null
  total_size: number
  file_count: number
  preview_image_url: string | null
  preview_image_storage_path: string | null
  status: 'uploading' | 'active' | 'expired' | 'archived'
  download_count: number
  expires_at: string | null
  created_at: string
  updated_at: string
  pdf_generations?: PDFGeneration[]
}

export interface PDFGeneration {
  id: string
  product_id: string
  template: PDFTemplate
  pdf_url: string | null
  pdf_storage_path: string | null
  custom_message: string | null
  is_latest: boolean
  file_size: number
  created_at: string
}

export interface ShopSettings {
  id: string
  name: string
  tagline: string
  etsy_url: string
  support_email: string
  logo_url: string | null
  logo_storage_path: string | null
  default_template: PDFTemplate
  custom_thank_you_message: string
  created_at: string
  updated_at: string
}

export interface DownloadEvent {
  id: string
  product_id: string
  ip_address: string | null
  user_agent: string | null
  download_type: 'zip' | 'file' | 'page_view'
  file_name: string | null
  created_at: string
}

export type PDFTemplate = 'minimal' | 'luxury' | 'botanical' | 'modern' | 'neutral'

export interface PDFGenerationOptions {
  product: Product
  shop: ShopSettings
  template: PDFTemplate
  customMessage?: string
  appUrl: string
  zipAttachment?: { data: Uint8Array; filename: string } | null
}

export interface TemplateConfig {
  id: PDFTemplate
  name: string
  description: string
  preview: string
  backgroundColor: [number, number, number]
  primaryColor: [number, number, number]
  secondaryColor: [number, number, number]
  accentColor: [number, number, number]
  buttonColor: [number, number, number]
  buttonTextColor: [number, number, number]
  textColor: [number, number, number]
  mutedTextColor: [number, number, number]
  borderColor: [number, number, number]
  dividerColor: [number, number, number]
  headerBg: [number, number, number]
}

export interface UploadInitPayload {
  title: string
  folderName: string
  files: { name: string; type: string; size: number }[]
}

export interface UploadCompletePayload {
  productId: string
  files: FileMetadata[]
  zipPath: string
  previewImagePath: string | null
}

export interface DashboardStats {
  totalProducts: number
  totalDownloads: number
  totalPDFs: number
  activeProducts: number
}
