import {
  PDFDocument,
  PDFPage,
  PDFArray,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  degrees,
} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { generateQRCodePNG } from './qr-generator'
import { formatBytes, generatePublicDownloadUrl } from './utils'
import type { PDFGenerationOptions, TemplateConfig, PDFTemplate } from '@/types'

// ============================================================
// PAGE DIMENSIONS (A4)
// ============================================================
const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

// ============================================================
// TEMPLATE CONFIGURATIONS
// ============================================================
export const TEMPLATE_CONFIGS: Record<PDFTemplate, TemplateConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean white with dark accents',
    preview: '#ffffff',
    backgroundColor: [1, 1, 1],
    primaryColor: [0.08, 0.08, 0.08],
    secondaryColor: [0.35, 0.35, 0.35],
    accentColor: [0.15, 0.15, 0.15],
    buttonColor: [0.1, 0.1, 0.1],
    buttonTextColor: [1, 1, 1],
    textColor: [0.12, 0.12, 0.12],
    mutedTextColor: [0.5, 0.5, 0.5],
    borderColor: [0.88, 0.88, 0.88],
    dividerColor: [0.9, 0.9, 0.9],
    headerBg: [0.97, 0.97, 0.97],
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury',
    description: 'Dark background with gold accents',
    preview: '#141210',
    backgroundColor: [0.08, 0.07, 0.05],
    primaryColor: [1, 1, 1],
    secondaryColor: [0.75, 0.7, 0.65],
    accentColor: [0.83, 0.72, 0.48],
    buttonColor: [0.83, 0.72, 0.48],
    buttonTextColor: [0.08, 0.07, 0.05],
    textColor: [0.95, 0.93, 0.9],
    mutedTextColor: [0.6, 0.55, 0.5],
    borderColor: [0.25, 0.22, 0.18],
    dividerColor: [0.83, 0.72, 0.48],
    headerBg: [0.1, 0.09, 0.07],
  },
  botanical: {
    id: 'botanical',
    name: 'Botanical',
    description: 'Soft green with natural tones',
    preview: '#f4f7f0',
    backgroundColor: [0.955, 0.97, 0.94],
    primaryColor: [0.13, 0.22, 0.14],
    secondaryColor: [0.32, 0.45, 0.33],
    accentColor: [0.28, 0.48, 0.3],
    buttonColor: [0.28, 0.48, 0.3],
    buttonTextColor: [1, 1, 1],
    textColor: [0.15, 0.24, 0.16],
    mutedTextColor: [0.42, 0.52, 0.43],
    borderColor: [0.78, 0.87, 0.78],
    dividerColor: [0.55, 0.72, 0.55],
    headerBg: [0.88, 0.93, 0.87],
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Bold purple with geometric style',
    preview: '#f3f2f8',
    backgroundColor: [0.95, 0.94, 0.98],
    primaryColor: [0.1, 0.08, 0.2],
    secondaryColor: [0.38, 0.32, 0.58],
    accentColor: [0.42, 0.22, 0.88],
    buttonColor: [0.42, 0.22, 0.88],
    buttonTextColor: [1, 1, 1],
    textColor: [0.12, 0.1, 0.22],
    mutedTextColor: [0.5, 0.45, 0.65],
    borderColor: [0.82, 0.8, 0.9],
    dividerColor: [0.42, 0.22, 0.88],
    headerBg: [0.88, 0.85, 0.97],
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    description: 'Warm cream — classic Etsy aesthetic',
    preview: '#faf7f2',
    backgroundColor: [0.98, 0.96, 0.93],
    primaryColor: [0.22, 0.18, 0.13],
    secondaryColor: [0.48, 0.42, 0.35],
    accentColor: [0.72, 0.57, 0.42],
    buttonColor: [0.72, 0.57, 0.42],
    buttonTextColor: [1, 1, 1],
    textColor: [0.24, 0.2, 0.15],
    mutedTextColor: [0.55, 0.48, 0.4],
    borderColor: [0.87, 0.82, 0.75],
    dividerColor: [0.72, 0.62, 0.5],
    headerBg: [0.93, 0.88, 0.82],
  },
}

// ============================================================
// HELPER — add a clickable URI annotation over a rect
// ============================================================
function addLinkAnnotation(
  page: PDFPage,
  pdfDoc: PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  url: string
) {
  const ref = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      C: [],
      A: { S: 'URI', URI: PDFString.of(url) },
    })
  )

  const existingAnnots = page.node.get(PDFName.of('Annots'))
  if (existingAnnots instanceof PDFArray) {
    existingAnnots.push(ref)
  } else {
    page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([ref]))
  }
}

// ============================================================
// HELPER — draw a filled rounded rectangle (simulated)
// pdf-lib doesn't support true border-radius; we fake it with
// thin corner fills.
// ============================================================
function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
  radius = 6
) {
  const c = rgb(color[0], color[1], color[2])
  // Main body
  page.drawRectangle({ x: x + radius, y, width: width - radius * 2, height, color: c })
  page.drawRectangle({ x, y: y + radius, width, height: height - radius * 2, color: c })
  // Corners
  page.drawCircle({ x: x + radius, y: y + radius, size: radius, color: c })
  page.drawCircle({ x: x + width - radius, y: y + radius, size: radius, color: c })
  page.drawCircle({ x: x + radius, y: y + height - radius, size: radius, color: c })
  page.drawCircle({ x: x + width - radius, y: y + height - radius, size: radius, color: c })
}

// ============================================================
// HELPER — center text on x axis
// ============================================================
function centerX(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  areaX: number,
  areaWidth: number
): number {
  const textWidth = font.widthOfTextAtSize(text, size)
  return areaX + (areaWidth - textWidth) / 2
}

// ============================================================
// HELPER — draw a thin horizontal rule
// ============================================================
function drawDivider(
  page: PDFPage,
  y: number,
  color: [number, number, number],
  opacity = 0.5
) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.75,
    color: rgb(color[0], color[1], color[2]),
    opacity,
  })
}

// ============================================================
// HELPER — truncate text to fit within maxWidth
// ============================================================
function truncateText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  maxWidth: number
): string {
  let truncated = text
  while (
    truncated.length > 0 &&
    font.widthOfTextAtSize(truncated, size) > maxWidth
  ) {
    truncated = truncated.slice(0, -1)
  }
  if (truncated !== text) truncated = truncated.slice(0, -3) + '...'
  return truncated
}

// ============================================================
// HELPER — wrap text into multiple lines
// ============================================================
function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

// ============================================================
// MAIN PDF GENERATOR
// ============================================================
export async function generateDeliveryPDF(
  options: PDFGenerationOptions
): Promise<Uint8Array> {
  const { product, shop, template, customMessage, appUrl } = options
  const cfg = TEMPLATE_CONFIGS[template]

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // Embed built-in fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  // ── Background ─────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(cfg.backgroundColor[0], cfg.backgroundColor[1], cfg.backgroundColor[2]),
  })

  // ── Outer border frame ─────────────────────────────────────
  page.drawRectangle({
    x: 20,
    y: 20,
    width: PAGE_WIDTH - 40,
    height: PAGE_HEIGHT - 40,
    borderColor: rgb(cfg.borderColor[0], cfg.borderColor[1], cfg.borderColor[2]),
    borderWidth: 1,
    opacity: 0,
    borderOpacity: 0.6,
  })

  // ── Running Y cursor (from top, we convert to PDF coords) ──
  let cursorFromTop = 48

  // ============================================================
  // HEADER BAND
  // ============================================================
  const headerH = 90
  page.drawRectangle({
    x: 20,
    y: PAGE_HEIGHT - 20 - headerH,
    width: PAGE_WIDTH - 40,
    height: headerH,
    color: rgb(cfg.headerBg[0], cfg.headerBg[1], cfg.headerBg[2]),
  })

  // Logo placeholder / shop logo
  const logoSize = 48
  const logoX = MARGIN
  const logoY = PAGE_HEIGHT - cursorFromTop - logoSize

  let hasLogo = false
  if (shop.logo_url) {
    try {
      const logoRes = await fetch(shop.logo_url)
      const logoBytes = await logoRes.arrayBuffer()
      const isJpeg =
        shop.logo_url.toLowerCase().includes('.jpg') ||
        shop.logo_url.toLowerCase().includes('.jpeg')

      const logoImg = isJpeg
        ? await pdfDoc.embedJpg(new Uint8Array(logoBytes))
        : await pdfDoc.embedPng(new Uint8Array(logoBytes))

      const logoDims = logoImg.scaleToFit(logoSize, logoSize)
      page.drawImage(logoImg, {
        x: logoX,
        y: logoY + (logoSize - logoDims.height) / 2,
        width: logoDims.width,
        height: logoDims.height,
      })
      hasLogo = true
    } catch {
      // Logo load failed — draw placeholder circle
    }
  }

  if (!hasLogo) {
    // Draw shop initial in a colored circle
    const initial = shop.name.charAt(0).toUpperCase()
    page.drawCircle({
      x: logoX + logoSize / 2,
      y: logoY + logoSize / 2,
      size: logoSize / 2,
      color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
    })
    const initSize = 22
    const initW = fontBold.widthOfTextAtSize(initial, initSize)
    page.drawText(initial, {
      x: logoX + logoSize / 2 - initW / 2,
      y: logoY + logoSize / 2 - initSize * 0.35,
      size: initSize,
      font: fontBold,
      color: rgb(cfg.buttonTextColor[0], cfg.buttonTextColor[1], cfg.buttonTextColor[2]),
    })
  }

  // Shop name
  const shopNameSize = 16
  const shopNameX = hasLogo ? logoX + logoSize + 12 : logoX
  const shopNameY = logoY + logoSize / 2 + 4
  const shopName = truncateText(
    shop.name,
    fontBold,
    shopNameSize,
    PAGE_WIDTH - shopNameX - MARGIN - 20
  )
  page.drawText(shopName, {
    x: shopNameX,
    y: shopNameY,
    size: shopNameSize,
    font: fontBold,
    color: rgb(cfg.primaryColor[0], cfg.primaryColor[1], cfg.primaryColor[2]),
  })

  // Shop tagline
  const taglineSize = 9
  page.drawText(shop.tagline || 'Digital Downloads', {
    x: shopNameX,
    y: shopNameY - shopNameSize - 3,
    size: taglineSize,
    font: fontItalic,
    color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
  })

  cursorFromTop += headerH + 28

  // ============================================================
  // MAIN HEADLINE
  // ============================================================
  const headlineText = 'Your Digital Download Is Ready'
  const headlineSize = 22
  const headlineX = centerX(headlineText, fontBold, headlineSize, MARGIN, CONTENT_WIDTH)
  page.drawText(headlineText, {
    x: headlineX,
    y: PAGE_HEIGHT - cursorFromTop,
    size: headlineSize,
    font: fontBold,
    color: rgb(cfg.primaryColor[0], cfg.primaryColor[1], cfg.primaryColor[2]),
  })
  cursorFromTop += headlineSize + 10

  // Accent divider under headline
  const divW = 60
  page.drawLine({
    start: { x: PAGE_WIDTH / 2 - divW / 2, y: PAGE_HEIGHT - cursorFromTop },
    end: { x: PAGE_WIDTH / 2 + divW / 2, y: PAGE_HEIGHT - cursorFromTop },
    thickness: 2.5,
    color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
  })
  cursorFromTop += 18

  // ============================================================
  // THANK YOU MESSAGE
  // ============================================================
  const messageText = customMessage || shop.custom_thank_you_message
  const messageSize = 9.5
  const messageLines = wrapText(messageText, fontRegular, messageSize, CONTENT_WIDTH - 40)

  for (const line of messageLines) {
    const lineX = centerX(line, fontRegular, messageSize, MARGIN, CONTENT_WIDTH)
    page.drawText(line, {
      x: lineX,
      y: PAGE_HEIGHT - cursorFromTop,
      size: messageSize,
      font: fontRegular,
      color: rgb(cfg.secondaryColor[0], cfg.secondaryColor[1], cfg.secondaryColor[2]),
    })
    cursorFromTop += messageSize + 4
  }
  cursorFromTop += 12

  // ============================================================
  // PRODUCT PREVIEW IMAGE (if available)
  // ============================================================
  const downloadPageUrl = generatePublicDownloadUrl(product.id, appUrl)
  let previewImgHeight = 0
  const maxPreviewH = 140
  const maxPreviewW = 180

  if (product.preview_image_url) {
    try {
      const imgRes = await fetch(product.preview_image_url)
      const imgBytes = await imgRes.arrayBuffer()
      const isJpeg =
        product.preview_image_url.toLowerCase().includes('.jpg') ||
        product.preview_image_url.toLowerCase().includes('.jpeg')

      const img = isJpeg
        ? await pdfDoc.embedJpg(new Uint8Array(imgBytes))
        : await pdfDoc.embedPng(new Uint8Array(imgBytes))

      const scaled = img.scaleToFit(maxPreviewW, maxPreviewH)
      const imgX = MARGIN
      const imgY = PAGE_HEIGHT - cursorFromTop - scaled.height

      // Shadow / border
      page.drawRectangle({
        x: imgX - 1,
        y: imgY - 1,
        width: scaled.width + 2,
        height: scaled.height + 2,
        color: rgb(cfg.borderColor[0], cfg.borderColor[1], cfg.borderColor[2]),
        opacity: 0.5,
      })

      page.drawImage(img, { x: imgX, y: imgY, width: scaled.width, height: scaled.height })
      previewImgHeight = scaled.height

      // Product title next to image
      const titleBlockX = imgX + scaled.width + 20
      const titleBlockW = CONTENT_WIDTH - scaled.width - 20
      let titleY = PAGE_HEIGHT - cursorFromTop

      // Product label
      const labelText = 'PRODUCT'
      page.drawText(labelText, {
        x: titleBlockX,
        y: titleY,
        size: 7,
        font: fontBold,
        color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
      })
      titleY -= 13

      // Product title
      const productTitleLines = wrapText(product.title, fontBold, 13, titleBlockW)
      for (const line of productTitleLines) {
        page.drawText(line, {
          x: titleBlockX,
          y: titleY,
          size: 13,
          font: fontBold,
          color: rgb(cfg.primaryColor[0], cfg.primaryColor[1], cfg.primaryColor[2]),
        })
        titleY -= 17
      }
      titleY -= 8

      // File stats
      const statsItems = [
        `${product.file_count} file${product.file_count !== 1 ? 's' : ''} included`,
        `Total size: ${formatBytes(product.total_size)}`,
        `Format: ${getFileTypes(product.files)}`,
      ]
      for (const stat of statsItems) {
        page.drawText(stat, {
          x: titleBlockX,
          y: titleY,
          size: 8,
          font: fontRegular,
          color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
        })
        titleY -= 12
      }

      cursorFromTop += Math.max(previewImgHeight, PAGE_HEIGHT - cursorFromTop - titleY) + 16
    } catch {
      // Image failed — show product title block centered instead
      previewImgHeight = 0
      drawProductTitleBlock(
        page,
        fontBold,
        fontRegular,
        fontItalic,
        cfg,
        product,
        PAGE_HEIGHT - cursorFromTop
      )
      cursorFromTop += 70
    }
  } else {
    // No image — centered product title
    drawProductTitleBlock(
      page,
      fontBold,
      fontRegular,
      fontItalic,
      cfg,
      product,
      PAGE_HEIGHT - cursorFromTop
    )
    cursorFromTop += 70
  }

  // ============================================================
  // DIVIDER
  // ============================================================
  drawDivider(page, PAGE_HEIGHT - cursorFromTop, cfg.dividerColor)
  cursorFromTop += 18

  // ============================================================
  // FILES INCLUDED LIST (up to 6 files)
  // ============================================================
  const filesLabel = 'FILES INCLUDED'
  page.drawText(filesLabel, {
    x: MARGIN,
    y: PAGE_HEIGHT - cursorFromTop,
    size: 7.5,
    font: fontBold,
    color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
  })
  cursorFromTop += 13

  const displayFiles = product.files.slice(0, 6)
  const fileCol1X = MARGIN
  const fileCol2X = MARGIN + CONTENT_WIDTH / 2 + 10
  const fileRows = Math.ceil(displayFiles.length / 2)

  for (let row = 0; row < fileRows; row++) {
    const f1 = displayFiles[row * 2]
    const f2 = displayFiles[row * 2 + 1]
    const rowY = PAGE_HEIGHT - cursorFromTop

    if (f1) {
      const icon = getFileTypeLabel(f1.name)
      const label = truncateText(
        `${icon}  ${f1.name}`,
        fontRegular,
        8,
        CONTENT_WIDTH / 2 - 20
      )
      page.drawText(label, {
        x: fileCol1X,
        y: rowY,
        size: 8,
        font: fontRegular,
        color: rgb(cfg.textColor[0], cfg.textColor[1], cfg.textColor[2]),
      })
    }
    if (f2) {
      const icon = getFileTypeLabel(f2.name)
      const label = truncateText(
        `${icon}  ${f2.name}`,
        fontRegular,
        8,
        CONTENT_WIDTH / 2 - 20
      )
      page.drawText(label, {
        x: fileCol2X,
        y: rowY,
        size: 8,
        font: fontRegular,
        color: rgb(cfg.textColor[0], cfg.textColor[1], cfg.textColor[2]),
      })
    }
    cursorFromTop += 14
  }

  if (product.file_count > 6) {
    const moreText = `+ ${product.file_count - 6} more files available on download page`
    page.drawText(moreText, {
      x: MARGIN,
      y: PAGE_HEIGHT - cursorFromTop,
      size: 7.5,
      font: fontItalic,
      color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
    })
    cursorFromTop += 13
  }

  cursorFromTop += 10
  drawDivider(page, PAGE_HEIGHT - cursorFromTop, cfg.dividerColor)
  cursorFromTop += 22

  // ============================================================
  // DOWNLOAD BUTTONS (the main interactive elements)
  // ============================================================
  const btnH = 36
  const btnRadius = 6
  const btnGap = 10
  const primaryBtnW = CONTENT_WIDTH * 0.55
  const secondaryBtnW = CONTENT_WIDTH * 0.4
  const primaryBtnX = MARGIN
  const secondaryBtnX = primaryBtnX + primaryBtnW + btnGap
  const buttonsY = PAGE_HEIGHT - cursorFromTop - btnH

  // ── Primary button: Download All Files ────────────────────
  drawRoundedRect(
    page,
    primaryBtnX,
    buttonsY,
    primaryBtnW,
    btnH,
    cfg.buttonColor,
    btnRadius
  )

  const primaryBtnLabel = options.zipAttachment
    ? 'Files Embedded — Open Attachments Panel'
    : 'Download All Files'
  const primaryLabelSize = 11
  const primaryLabelX = centerX(
    primaryBtnLabel,
    fontBold,
    primaryLabelSize,
    primaryBtnX,
    primaryBtnW
  )
  page.drawText(primaryBtnLabel, {
    x: primaryLabelX,
    y: buttonsY + btnH / 2 - primaryLabelSize * 0.36,
    size: primaryLabelSize,
    font: fontBold,
    color: rgb(
      cfg.buttonTextColor[0],
      cfg.buttonTextColor[1],
      cfg.buttonTextColor[2]
    ),
  })

  // Make the primary button clickable (goes to download landing page)
  const primaryUrl = product.zip_url || downloadPageUrl
  addLinkAnnotation(page, pdfDoc, primaryBtnX, buttonsY, primaryBtnW, btnH, primaryUrl)

  // ── Secondary button: View Download Page ──────────────────
  page.drawRectangle({
    x: secondaryBtnX,
    y: buttonsY,
    width: secondaryBtnW,
    height: btnH,
    borderColor: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
    borderWidth: 1.5,
    opacity: 0,
  })

  const secondaryBtnLabel = 'View Files Online'
  const secondaryLabelSize = 10
  const secondaryLabelX = centerX(
    secondaryBtnLabel,
    fontRegular,
    secondaryLabelSize,
    secondaryBtnX,
    secondaryBtnW
  )
  page.drawText(secondaryBtnLabel, {
    x: secondaryLabelX,
    y: buttonsY + btnH / 2 - secondaryLabelSize * 0.36,
    size: secondaryLabelSize,
    font: fontRegular,
    color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
  })
  addLinkAnnotation(
    page,
    pdfDoc,
    secondaryBtnX,
    buttonsY,
    secondaryBtnW,
    btnH,
    downloadPageUrl
  )

  cursorFromTop += btnH + 10

  // ── ZIP Direct link text ──────────────────────────────────
  if (product.zip_url) {
    const linkText = 'Direct ZIP: ' + product.zip_url
    const linkLabel = truncateText(linkText, fontRegular, 7, CONTENT_WIDTH)
    page.drawText(linkLabel, {
      x: MARGIN,
      y: PAGE_HEIGHT - cursorFromTop,
      size: 7,
      font: fontRegular,
      color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
      opacity: 0.85,
    })
    addLinkAnnotation(
      page,
      pdfDoc,
      MARGIN,
      PAGE_HEIGHT - cursorFromTop - 2,
      CONTENT_WIDTH,
      10,
      product.zip_url
    )
    cursorFromTop += 13
  }

  cursorFromTop += 14
  drawDivider(page, PAGE_HEIGHT - cursorFromTop, cfg.dividerColor)
  cursorFromTop += 18

  // ============================================================
  // QR CODE + INSTRUCTIONS (side by side)
  // ============================================================
  const qrSize = 90
  const qrY = PAGE_HEIGHT - cursorFromTop - qrSize

  // Generate QR code image pointing to the public download page
  const qrPng = await generateQRCodePNG(downloadPageUrl, {
    size: 200,
    darkColor:
      template === 'luxury'
        ? '#D4B87A'
        : `#${Math.round(cfg.primaryColor[0] * 255)
            .toString(16)
            .padStart(2, '0')}${Math.round(cfg.primaryColor[1] * 255)
            .toString(16)
            .padStart(2, '0')}${Math.round(cfg.primaryColor[2] * 255)
            .toString(16)
            .padStart(2, '0')}`,
    lightColor:
      template === 'luxury'
        ? '#141210'
        : `#${Math.round(cfg.backgroundColor[0] * 255)
            .toString(16)
            .padStart(2, '0')}${Math.round(cfg.backgroundColor[1] * 255)
            .toString(16)
            .padStart(2, '0')}${Math.round(cfg.backgroundColor[2] * 255)
            .toString(16)
            .padStart(2, '0')}`,
  })

  const qrImg = await pdfDoc.embedPng(qrPng)
  const qrScaled = qrImg.scaleToFit(qrSize, qrSize)

  // QR border box
  page.drawRectangle({
    x: MARGIN - 4,
    y: qrY - 4,
    width: qrSize + 8,
    height: qrSize + 8,
    borderColor: rgb(cfg.borderColor[0], cfg.borderColor[1], cfg.borderColor[2]),
    borderWidth: 1,
    opacity: 0,
    borderOpacity: 0.7,
  })

  page.drawImage(qrImg, { x: MARGIN, y: qrY, width: qrScaled.width, height: qrScaled.height })

  // QR label
  const scanText = 'Scan to Download'
  page.drawText(scanText, {
    x: centerX(scanText, fontRegular, 7.5, MARGIN, qrSize),
    y: qrY - 14,
    size: 7.5,
    font: fontItalic,
    color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
  })

  // Make QR code area clickable
  addLinkAnnotation(page, pdfDoc, MARGIN, qrY, qrSize, qrSize, downloadPageUrl)

  // Instructions panel (right of QR)
  const instrX = MARGIN + qrSize + 24
  const instrW = CONTENT_WIDTH - qrSize - 24
  let instrY = PAGE_HEIGHT - cursorFromTop

  page.drawText('HOW TO DOWNLOAD', {
    x: instrX,
    y: instrY,
    size: 7.5,
    font: fontBold,
    color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
  })
  instrY -= 13

  const steps = options.zipAttachment
    ? [
        '1.  Open the Attachments panel in your PDF reader.',
        '     Adobe Reader: View -> Navigation Panels -> Attachments',
        '     Preview (Mac): View -> Attachments',
        '2.  Double-click the .zip file to download it.',
        '3.  Unzip the folder to access all your files.',
        '4.  Tip: Use Adobe Reader for best results.',
      ]
    : [
        '1.  Click the "Download All Files" button above.',
        '2.  Or scan the QR code with your phone.',
        '3.  Your browser will download the ZIP file.',
        '4.  Unzip the folder to access your files.',
        '5.  Files are yours to use per the license terms.',
      ]

  for (const step of steps) {
    const stepLines = wrapText(step, fontRegular, 8, instrW)
    for (const line of stepLines) {
      page.drawText(line, {
        x: instrX,
        y: instrY,
        size: 8,
        font: fontRegular,
        color: rgb(cfg.textColor[0], cfg.textColor[1], cfg.textColor[2]),
      })
      instrY -= 12
    }
  }

  cursorFromTop += qrSize + 28

  // ============================================================
  // FOOTER
  // ============================================================
  const footerH = 52
  const footerY = 20

  page.drawRectangle({
    x: 20,
    y: footerY,
    width: PAGE_WIDTH - 40,
    height: footerH,
    color: rgb(cfg.headerBg[0], cfg.headerBg[1], cfg.headerBg[2]),
  })

  // Footer content
  let footerTextY = footerY + footerH - 16

  // Support line
  const supportParts = [
    'Need help? Contact us: ',
    shop.support_email || 'via your Etsy order',
  ]
  let supportX = MARGIN + 4
  page.drawText(supportParts[0], {
    x: supportX,
    y: footerTextY,
    size: 7.5,
    font: fontRegular,
    color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
  })
  supportX += fontRegular.widthOfTextAtSize(supportParts[0], 7.5)
  page.drawText(supportParts[1], {
    x: supportX,
    y: footerTextY,
    size: 7.5,
    font: fontBold,
    color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
  })

  if (shop.support_email) {
    addLinkAnnotation(
      page,
      pdfDoc,
      MARGIN + 4,
      footerTextY - 2,
      CONTENT_WIDTH,
      10,
      `mailto:${shop.support_email}`
    )
  }

  footerTextY -= 14

  // Etsy shop URL
  if (shop.etsy_url) {
    const etsyLine = `Visit our shop: ${shop.etsy_url}`
    page.drawText(etsyLine, {
      x: MARGIN + 4,
      y: footerTextY,
      size: 7.5,
      font: fontRegular,
      color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
    })
    addLinkAnnotation(
      page,
      pdfDoc,
      MARGIN + 4,
      footerTextY - 2,
      CONTENT_WIDTH / 2,
      10,
      shop.etsy_url
    )
  }

  // Right-aligned copyright
  const copyrightText = `© ${new Date().getFullYear()} ${shop.name}`
  const copyrightX =
    PAGE_WIDTH - MARGIN - fontRegular.widthOfTextAtSize(copyrightText, 7) - 4
  page.drawText(copyrightText, {
    x: copyrightX,
    y: footerY + footerH / 2 - 3,
    size: 7,
    font: fontRegular,
    color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
    opacity: 0.7,
  })

  // ============================================================
  // LUXURY TEMPLATE EXTRA DECORATIONS
  // ============================================================
  if (template === 'luxury') {
    // Gold corner ornaments
    const ornamentSize = 14
    const ornamentColor = rgb(0.83, 0.72, 0.48)

    for (const [cx, cy] of [
      [26, PAGE_HEIGHT - 26],
      [PAGE_WIDTH - 26, PAGE_HEIGHT - 26],
      [26, 26],
      [PAGE_WIDTH - 26, 26],
    ] as [number, number][]) {
      page.drawLine({ start: { x: cx - ornamentSize, y: cy }, end: { x: cx + ornamentSize, y: cy }, thickness: 1, color: ornamentColor })
      page.drawLine({ start: { x: cx, y: cy - ornamentSize }, end: { x: cx, y: cy + ornamentSize }, thickness: 1, color: ornamentColor })
    }
  }

  // ============================================================
  // BOTANICAL TEMPLATE EXTRA DECORATIONS
  // ============================================================
  if (template === 'botanical') {
    // Subtle leaf-like dots on left margin
    const dotColor = rgb(0.55, 0.72, 0.55)
    for (let i = 0; i < 5; i++) {
      page.drawCircle({
        x: 14,
        y: 200 + i * 90,
        size: 3 + (i % 2),
        color: dotColor,
        opacity: 0.4,
      })
    }
  }

  // ============================================================
  // MODERN TEMPLATE EXTRA DECORATIONS
  // ============================================================
  if (template === 'modern') {
    // Geometric accent bar on the right
    page.drawRectangle({
      x: PAGE_WIDTH - 16,
      y: 200,
      width: 6,
      height: 200,
      color: rgb(0.42, 0.22, 0.88),
      opacity: 0.15,
    })
  }

  // Embed the ZIP as a PDF attachment so clients can extract it offline
  if (options.zipAttachment) {
    await pdfDoc.attach(
      options.zipAttachment.data,
      options.zipAttachment.filename,
      {
        mimeType: 'application/zip',
        description: `Your digital product files: ${product.title}`,
        creationDate: new Date(),
        modificationDate: new Date(),
      }
    )
  }

  return pdfDoc.save()
}

// ============================================================
// HELPER — draw product title block when no image
// ============================================================
function drawProductTitleBlock(
  page: PDFPage,
  fontBold: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontRegular: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontItalic: Awaited<ReturnType<PDFDocument['embedFont']>>,
  cfg: TemplateConfig,
  product: { title: string; file_count: number; total_size: number; files: { name: string }[] },
  topY: number
) {
  let y = topY

  const labelText = 'PRODUCT'
  page.drawText(labelText, {
    x: MARGIN,
    y,
    size: 7,
    font: fontBold,
    color: rgb(cfg.accentColor[0], cfg.accentColor[1], cfg.accentColor[2]),
  })
  y -= 16

  const titleLines = wrapText(product.title, fontBold, 16, CONTENT_WIDTH)
  for (const line of titleLines) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 16,
      font: fontBold,
      color: rgb(cfg.primaryColor[0], cfg.primaryColor[1], cfg.primaryColor[2]),
    })
    y -= 20
  }
  y -= 6

  const statsText = `${product.file_count} file${product.file_count !== 1 ? 's' : ''} · ${formatBytes(product.total_size)} · ${getFileTypes(product.files)}`
  page.drawText(statsText, {
    x: MARGIN,
    y,
    size: 8.5,
    font: fontRegular,
    color: rgb(cfg.mutedTextColor[0], cfg.mutedTextColor[1], cfg.mutedTextColor[2]),
  })
}

// ============================================================
// HELPERS — file type formatting
// ============================================================
function getFileTypes(files: { name: string }[]): string {
  const exts = [...new Set(files.map(f => f.name.split('.').pop()?.toUpperCase() ?? ''))]
  return exts.slice(0, 4).join(', ')
}

// NOTE: pdf-lib StandardFonts use WinAnsi encoding — emoji and
// Unicode above U+00FF cannot be used. Use ASCII labels only.
function getFileTypeLabel(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'FILE'
  const maxLen = 4
  return `[${ext.slice(0, maxLen)}]`
}
