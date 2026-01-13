'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin, App } from 'antd'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // basePath '/admin' is automatically prepended by Next.js
    router.replace('/posts')
  }, [router])

  return (
    <App>
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    </App>
  )
}
