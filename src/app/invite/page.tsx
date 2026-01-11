'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { supabaseAPI } from '@/lib/supabase-api'
import { Button, Card, Spin, Alert, Typography, Space, Result } from 'antd'
import { GoogleAuthComponent } from '@/components/GoogleAuth'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { Session } from '@supabase/supabase-js'

const { Title, Paragraph } = Typography

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [inviteValid, setInviteValid] = useState(false)
  const [inviteEmail, setInviteEmail] = useState<string>('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

  useEffect(() => {
    // Validate invite token
    if (token) {
      validateInvite()
    } else {
      setError('No invite token provided')
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // If user is signed in and invite is valid, consume it
    if (session && inviteValid && token && !success) {
      consumeInvite()
    }
  }, [session, inviteValid, token])

  const validateInvite = async () => {
    if (!token) return

    try {
      setValidating(true)
      const result = await supabaseAPI.validateInvite(token)

      if (result.valid) {
        setInviteValid(true)
        setInviteEmail(result.email || '')
      } else {
        setError('This invite link is invalid or has expired')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invite')
    } finally {
      setValidating(false)
    }
  }

  const consumeInvite = async () => {
    if (!token) return

    try {
      setValidating(true)
      const consumed = await supabaseAPI.consumeInvite(token)

      if (consumed) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError('Failed to activate your admin account')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate invite')
    } finally {
      setValidating(false)
    }
  }

  if (loading || validating) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card style={{ maxWidth: 500, width: '100%', margin: 16 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>
              {loading ? 'Loading...' : 'Validating invite...'}
            </Paragraph>
          </div>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card style={{ maxWidth: 500, width: '100%', margin: 16 }}>
          <Result
            status="success"
            title="Welcome to Santo Niño Admin!"
            subTitle="Your admin account has been activated successfully. Redirecting..."
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card style={{ maxWidth: 500, width: '100%', margin: 16 }}>
          <Result
            status="error"
            title="Invalid Invite"
            subTitle={error}
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            extra={
              <Button type="primary" onClick={() => router.push('/')}>
                Go to Home
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  if (!session && inviteValid) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card style={{ maxWidth: 500, width: '100%', margin: 16 }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Title level={3}>Admin Invite</Title>
              <Paragraph>
                You've been invited to become an admin for Santo Niño NZ.
              </Paragraph>
              {inviteEmail && (
                <Alert
                  message={`Invited as: ${inviteEmail}`}
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}
              <Paragraph type="secondary">
                Sign in with Google to activate your admin account.
              </Paragraph>
            </div>

            <GoogleAuthComponent />
          </Space>
        </Card>
      </div>
    )
  }

  return null
}
