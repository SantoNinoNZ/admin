'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Establishing session...')

        // Supabase automatically handles the OAuth callback
        // Just wait a moment for it to process
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Get the session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          setStatus(`Error: ${error.message}`)
          setTimeout(() => router.push('/'), 2000)
          return
        }

        if (data.session) {
          console.log('✓ Session established:', data.session.user.email)
          setStatus('Success! Redirecting to dashboard...')
          setTimeout(() => router.push('/'), 500)
        } else {
          console.log('⚠ No session found, redirecting to login')
          setStatus('No session found, redirecting...')
          setTimeout(() => router.push('/'), 1000)
        }
      } catch (err) {
        console.error('Callback error:', err)
        setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setTimeout(() => router.push('/'), 2000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <h2 className="text-xl font-semibold">{status}</h2>
        <p className="text-sm text-muted-foreground">
          Please wait while we complete the authentication process.
        </p>
      </div>
    </div>
  )
}
