import type { Metadata } from 'next'
import { ConfigProvider, theme } from 'antd';
import AntdRegistry from '@/components/AntdRegistry';
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Santo Niño New Zealand - Administration Portal',
  description: 'Content management system for Santo Niño New Zealand website',
  manifest: '/admin/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SNNZ Admin',
  },
  icons: {
    icon: [
      { url: '/admin/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/admin/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/admin/santonino.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/admin/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563EB',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-roboto">
        <AntdRegistry>
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#2563EB',
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}