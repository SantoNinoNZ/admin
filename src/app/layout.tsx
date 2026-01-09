import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Santo Niño Admin',
  description: 'Content management system for santoninonz.github.io',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-roboto">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}