'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/AdminLayout'
import { GoogleAuthComponent } from '@/components/GoogleAuth'
import { supabase } from '@/lib/supabase'
import { supabaseAPI } from '@/lib/supabase-api'
import type { Session } from '@supabase/supabase-js'
import { Spin, App, Result, Button } from 'antd'
import { LockOutlined } from '@ant-design/icons'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
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

  // Check authorization when session changes
  useEffect(() => {
    if (session) {
      checkAuthorization()
    } else {
      setIsAuthorized(false)
    }
  }, [session])

  const checkAuthorization = async () => {
    try {
      setCheckingAuth(true)
      const authorized = await supabaseAPI.isAuthorizedAdmin()
      setIsAuthorized(authorized)
    } catch (error) {
      console.error('Authorization check failed:', error)
      setIsAuthorized(false)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setIsAuthorized(false)
    router.push('/')
  }

  if (loading || checkingAuth) {
    return (
      <App>
        <div className="flex items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      </App>
    )
  }

  if (!session) {
    return (
      <App>
        <GoogleAuthComponent />
      </App>
    )
  }

  if (session && !isAuthorized) {
    return (
      <App>
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#f0f2f5' }}>
          <Result
            status="403"
            title="Access Denied"
            subTitle="You don't have permission to access the admin panel. Please contact an existing admin for an invite."
            icon={<LockOutlined style={{ color: '#ff4d4f' }} />}
            extra={
              <Button type="primary" onClick={handleLogout}>
                Sign Out
              </Button>
            }
          />
        </div>
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
