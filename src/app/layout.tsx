import type { Metadata } from 'next'
import { ConfigProvider, theme } from 'antd';
import AntdRegistry from '@/components/AntdRegistry';
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Santo Niño Admin',
  description: 'Content management system for santoninonz.github.io',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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