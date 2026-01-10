'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/admin')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to admin...</p>
    </div>
  )
}
