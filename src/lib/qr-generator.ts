import QRCode from 'qrcode'

export interface QRCodeOptions {
  size?: number
  margin?: number
  darkColor?: string
  lightColor?: string
}

export async function generateQRCodePNG(
  url: string,
  options: QRCodeOptions = {}
): Promise<Uint8Array> {
  const {
    size = 200,
    margin = 1,
    darkColor = '#000000',
    lightColor = '#FFFFFF',
  } = options

  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  })

  const base64 = dataUrl.split(',')[1]
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

export async function generateQRCodeSVG(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
  })
}
