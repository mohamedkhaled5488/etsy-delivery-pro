# EtsyDelivery Pro — Digital Download PDF Generator

Generate professional PDF delivery files for your Etsy digital products.  
Buyers click a button in the PDF → instantly download their files. No login required.

---

## How It Works

```
You upload a folder
       ↓
Files stored in Supabase (cloud storage)
       ↓
Secure permanent public download link generated
       ↓
You generate a beautiful PDF (5 templates)
       ↓
Upload PDF to Etsy as your "digital file"
       ↓
Buyer purchases → opens PDF → clicks button → downloads files
```

---

## Features

- **5 PDF Templates**: Minimal, Luxury, Botanical, Modern, Neutral (Etsy aesthetic)
- **Clickable buttons** in PDF that open the download page or ZIP directly
- **QR code** embedded in PDF for mobile buyers
- **Public download landing page** — beautiful, no-login buyer experience
- **ZIP archive** auto-created from all uploaded files
- **Shop branding** — logo, name, tagline, support email
- **Download tracking** — see how many times buyers downloaded
- **Individual file downloads** on landing page

---

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- A free [Supabase](https://supabase.com) account

---

### 2. Clone and Install

```bash
git clone <your-repo>
cd etsy-delivery-pro
npm install
```

---

### 3. Set Up Supabase

#### A. Create a new Supabase project
Go to [supabase.com](https://supabase.com) → New Project.

#### B. Create the database tables
In your Supabase project → **SQL Editor** → paste and run the contents of `database/schema.sql`.

#### C. Create the storage bucket
1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it exactly: `digital-products`
4. Check **Public bucket** ✓
5. Set file size limit: `524288000` (500 MB)
6. Click **Save**

#### D. Set storage policies (Supabase SQL Editor)
```sql
-- Allow anyone to upload files
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'digital-products');

-- Allow anyone to read/download files
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'digital-products');
```

#### E. Get your API keys
Go to **Project Settings** → **API**:
- Copy your **Project URL**
- Copy your **anon public** key
- Copy your **service_role** key (keep this secret!)

---

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## User Guide

### Step 1: Configure Your Shop
Go to **Settings** and enter:
- Shop name (appears in PDF header)
- Shop logo (uploaded to Supabase)
- Etsy shop URL
- Support email
- Default thank-you message
- Default PDF template

### Step 2: Upload a Product
1. Click **New Upload** in the sidebar
2. Enter the product title (e.g. "Wildflower Botanical Wall Art Set")
3. Drag your folder onto the drop zone, or click **Select Folder**
4. Click **Upload & Continue**

What happens:
- Files are uploaded directly to Supabase Storage
- A ZIP archive is auto-created from all files
- A permanent public download URL is generated

### Step 3: Generate the PDF
1. You're taken to the product page automatically
2. Choose a **template** (5 options)
3. Optionally write a custom thank-you message
4. Click **Generate PDF**
5. The PDF downloads automatically

### Step 4: Upload to Etsy
1. Download the generated PDF
2. In your Etsy listing → Digital file → Upload the PDF
3. Done! Buyers will receive this PDF when they purchase

### Step 5: Buyer Experience
When a buyer purchases:
1. They open the PDF from Etsy
2. They see a beautiful branded thank-you page
3. They click **"Download All Files"**
4. Their browser opens the download landing page: `your-domain.com/download/{id}`
5. They click to download the ZIP or individual files

---

## PDF Templates

| Template | Description |
|----------|-------------|
| **Minimal** | Clean white, dark typography — timeless |
| **Luxury** | Dark background, gold accents — premium feel |
| **Botanical** | Soft cream and forest green — nature-inspired |
| **Modern** | Light gray with bold purple — contemporary |
| **Neutral** | Warm beige/cream — classic Etsy aesthetic |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Dashboard
│   ├── upload/page.tsx           # Upload flow
│   ├── products/[id]/page.tsx    # Product detail + PDF generator
│   ├── settings/page.tsx         # Shop settings
│   ├── download/[productId]/     # Public buyer download page (no login)
│   └── api/
│       ├── upload/init/          # Create signed upload URLs
│       ├── upload/complete/      # Finalize upload in DB
│       ├── products/             # CRUD products
│       ├── generate-pdf/[id]/    # Generate PDF
│       ├── shop/                 # Shop settings CRUD
│       └── track/[id]/           # Track downloads
├── components/
│   ├── layout/                   # Sidebar, AppLayout
│   ├── dashboard/                # ProductCard
│   ├── upload/                   # DropZone
│   └── pdf/                      # TemplateSelector
└── lib/
    ├── pdf-generator.ts          # Core PDF generation (pdf-lib)
    ├── qr-generator.ts           # QR codes (qrcode)
    ├── supabase.ts               # Supabase clients
    └── utils.ts                  # Helpers
```

---

## Architecture

```
Browser
  ├── Supabase JS client (direct uploads — no size limits)
  │     └── Uploads files + ZIP directly to Supabase Storage
  └── Fetch → Next.js API routes
        ├── /api/upload/init      → creates signed URLs
        ├── /api/upload/complete  → saves metadata to Postgres
        ├── /api/generate-pdf     → generates PDF server-side
        └── /api/shop             → reads/writes shop settings

Supabase
  ├── PostgreSQL (products, pdf_generations, shop_settings, download_events)
  └── Storage bucket "digital-products"
        ├── products/{id}/files/  (individual files)
        ├── products/{id}/archive.zip
        ├── pdfs/{id}/           (generated PDFs)
        └── shop/logo.*          (shop logo)
```

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → your Vercel domain (e.g. `https://etsy-delivery.vercel.app`)
4. Deploy

> **Important**: After deployment, update `NEXT_PUBLIC_APP_URL` to your actual production domain so download links in PDFs point to the right place. Then regenerate any existing PDFs.

### Deploy to Railway / Render

Same environment variables. Build command: `npm run build`. Start command: `npm start`.

---

## FAQ

**Q: Do buyers need an account to download?**  
No. The download page is fully public. Buyers just open the PDF and click.

**Q: Are the download links permanent?**  
Yes. Files are stored in Supabase Storage with no expiration by default.

**Q: What's the file size limit?**  
Supabase Storage supports files up to 50GB on paid plans. For the free tier, up to 50MB per file, 1GB total. Upgrade to Pro ($25/mo) for more.

**Q: Can I use this for multiple Etsy products?**  
Yes! Each upload creates a separate product. You can have unlimited products.

**Q: Will the PDF buttons work in all PDF readers?**  
Yes. The buttons use standard PDF link annotations (URI actions), which work in Adobe Reader, Preview (Mac), Foxit, Chrome PDF viewer, and all major PDF readers.

**Q: How do I update the download files?**  
Re-upload the folder, then regenerate the PDF. The old PDF will still point to old files.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| PDF Generation | pdf-lib + @pdf-lib/fontkit |
| QR Codes | qrcode |
| ZIP Creation | JSZip (browser-side) |
| Notifications | sonner |
| Icons | lucide-react |

---

## License

MIT — use freely for your own Etsy shop.
