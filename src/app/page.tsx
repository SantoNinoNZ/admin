'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/AdminLayout'
import { GoogleAuthComponent } from '@/components/GoogleAuth'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Spin, App } from 'antd'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!session) {
    return (
      <App>
        <GoogleAuthComponent />
      </App>
    )
  }

  return (
    <App>
      <main className="min-h-screen">
        <AdminLayout session={session} onLogout={handleLogout} />
      </main>
    </App>
  )
}
