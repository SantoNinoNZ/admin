'use client'

import { useState } from 'react'
import { Card, Button, Typography, Space } from 'antd'
import { GoogleOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
import { notification } from 'antd'

const { Title, Text } = Typography

interface GoogleAuthProps {
  onAuth?: () => void
}

export function GoogleAuthComponent({ onAuth }: GoogleAuthProps) {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        notification.error({
          message: 'Authentication Error',
          description: error.message
        })
        setLoading(false)
      }
      // Redirect will happen automatically
    } catch (err) {
      notification.error({
        message: 'Authentication Failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred'
      })
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <GoogleOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={2} style={{ margin: 0 }}>Santo Niño Admin</Title>
          </div>

          <div>
            <Title level={4} style={{ marginBottom: 8 }}>Sign in</Title>
            <Text type="secondary">
              Sign in with your Google account to access the content management system
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            onClick={handleGoogleSignIn}
            loading={loading}
            block
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          <Text type="secondary" style={{ fontSize: 12 }}>
            By clicking sign in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </Space>
      </Card>
    </div>
  )
}
