-- ============================================================
-- EtsyDelivery Pro — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SHOP SETTINGS
-- Stores seller's shop branding and preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Etsy Shop',
  tagline TEXT DEFAULT 'Thank you for your purchase!',
  etsy_url TEXT DEFAULT '',
  support_email TEXT DEFAULT '',
  logo_url TEXT,
  logo_storage_path TEXT,
  default_template TEXT DEFAULT 'neutral',
  custom_thank_you_message TEXT DEFAULT 'Thank you so much for your purchase! Your files are ready to download below. Please don''t hesitate to reach out if you have any questions.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shop settings
INSERT INTO shop_settings (name) VALUES ('My Etsy Shop')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRODUCTS
-- Represents an uploaded folder / file collection
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  folder_name TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]',
  storage_path TEXT NOT NULL,
  download_url TEXT NOT NULL,
  zip_url TEXT,
  zip_storage_path TEXT,
  total_size BIGINT DEFAULT 0,
  file_count INT DEFAULT 0,
  preview_image_url TEXT,
  preview_image_storage_path TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('uploading', 'active', 'expired', 'archived')),
  download_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PDF GENERATIONS
-- Each generated PDF delivery file
-- ============================================================
CREATE TABLE IF NOT EXISTS pdf_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  template TEXT NOT NULL DEFAULT 'neutral' CHECK (template IN ('minimal', 'luxury', 'botanical', 'modern', 'neutral')),
  pdf_url TEXT,
  pdf_storage_path TEXT,
  custom_message TEXT,
  is_latest BOOLEAN DEFAULT TRUE,
  file_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOWNLOAD EVENTS
-- Track buyer download activity
-- ============================================================
CREATE TABLE IF NOT EXISTS download_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  download_type TEXT DEFAULT 'zip' CHECK (download_type IN ('zip', 'file', 'page_view')),
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_generations_product_id ON pdf_generations(product_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generations_is_latest ON pdf_generations(product_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_download_events_product_id ON download_events(product_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_settings_updated_at
  BEFORE UPDATE ON shop_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION increment_download_count(product_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET download_count = download_count + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STORAGE BUCKETS
-- Run these via Supabase Dashboard > Storage or via API
-- ============================================================

-- NOTE: Create the following bucket in Supabase Dashboard:
-- Bucket name: "digital-products"
-- Public: TRUE (so download URLs work without auth)
-- File size limit: 500MB (or higher as needed)
-- Allowed MIME types: leave blank (allow all)

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Products table: allow all operations (single-user app)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pdf_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on pdf_generations" ON pdf_generations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on shop_settings" ON shop_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on download_events" ON download_events FOR ALL USING (true) WITH CHECK (true);

-- Storage policies (digital-products bucket)
-- Run these after creating the bucket:
-- INSERT: allow anyone to upload
-- SELECT: allow anyone to view/download (public bucket handles this)
