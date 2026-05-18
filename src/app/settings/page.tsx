'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, Save, Upload, Store, Palette } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import TemplateSelector from '@/components/pdf/TemplateSelector'
import type { ShopSettings, PDFTemplate } from '@/types'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shop, setShop] = useState<Partial<ShopSettings>>({
    name: '',
    tagline: '',
    etsy_url: '',
    support_email: '',
    default_template: 'neutral',
    custom_thank_you_message: '',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchShop()
  }, [])

  async function fetchShop() {
    try {
      const res = await fetch('/api/shop')
      const data = await res.json()
      if (data.shop) {
        setShop(data.shop)
        setLogoPreview(data.shop.logo_url || null)
      }
    } catch {
      toast.error('Failed to load shop settings')
    } finally {
      setLoading(false)
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData()
      formData.append('name', shop.name || '')
      formData.append('tagline', shop.tagline || '')
      formData.append('etsy_url', shop.etsy_url || '')
      formData.append('support_email', shop.support_email || '')
      formData.append('default_template', shop.default_template || 'neutral')
      formData.append('custom_thank_you_message', shop.custom_thank_you_message || '')
      if (logoFile) formData.append('logo', logoFile)

      const res = await fetch('/api/shop', { method: 'PUT', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }

      const data = await res.json()
      setShop(data.shop)
      setLogoPreview(data.shop.logo_url || null)
      setLogoFile(null)
      toast.success('Shop settings saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Shop Settings</h1>
          <p className="text-sm text-stone-500 mt-1">
            Your shop branding will appear on all generated delivery PDFs.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Shop Branding */}
          <div className="card p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-stone-800">Shop Branding</h2>
            </div>

            {/* Logo */}
            <div>
              <label className="label">Shop Logo</label>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-stone-300 overflow-hidden
                             flex items-center justify-center bg-stone-50 cursor-pointer hover:border-brand-400 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-stone-300" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="btn-secondary text-xs py-2"
                  >
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <p className="text-xs text-stone-400 mt-1">PNG or JPG recommended · Square works best</p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            {/* Shop name */}
            <div>
              <label className="label">Shop Name</label>
              <input
                type="text"
                className="input"
                placeholder="Your Etsy shop name"
                value={shop.name || ''}
                onChange={(e) => setShop({ ...shop, name: e.target.value })}
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="label">Tagline / Subtitle</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Handcrafted digital art & printables"
                value={shop.tagline || ''}
                onChange={(e) => setShop({ ...shop, tagline: e.target.value })}
              />
            </div>

            {/* Etsy URL */}
            <div>
              <label className="label">Etsy Shop URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://www.etsy.com/shop/YourShop"
                value={shop.etsy_url || ''}
                onChange={(e) => setShop({ ...shop, etsy_url: e.target.value })}
              />
            </div>

            {/* Support email */}
            <div>
              <label className="label">Support Email</label>
              <input
                type="email"
                className="input"
                placeholder="hello@yourshop.com"
                value={shop.support_email || ''}
                onChange={(e) => setShop({ ...shop, support_email: e.target.value })}
              />
            </div>
          </div>

          {/* Default template */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-stone-800">Default PDF Template</h2>
            </div>
            <TemplateSelector
              selected={shop.default_template as PDFTemplate || 'neutral'}
              onChange={(t) => setShop({ ...shop, default_template: t })}
            />
          </div>

          {/* Thank you message */}
          <div className="card p-5">
            <label className="label">Default Thank You Message</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="This message appears in every PDF you generate…"
              value={shop.custom_thank_you_message || ''}
              onChange={(e) => setShop({ ...shop, custom_thank_you_message: e.target.value })}
            />
            <p className="text-xs text-stone-400 mt-1.5">
              You can override this per-product when generating the PDF.
            </p>
          </div>

          {/* Save */}
          <button type="submit" disabled={saving} className="btn-accent w-full py-3">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
