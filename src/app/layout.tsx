import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'EtsyDelivery Pro — Digital Download PDF Generator',
  description:
    'Generate professional PDF delivery files for your Etsy digital products with clickable download buttons, QR codes, and beautiful templates.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e7e5e4',
              borderRadius: '10px',
            },
          }}
        />
      </body>
    </html>
  )
}
