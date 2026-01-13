'use client'

import { useState, useEffect } from 'react'
import { Alert, message } from 'antd'
import { WifiOutlined, DisconnectOutlined } from '@ant-design/icons'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(true)
      message.success('Back online - Your changes will now sync.')
      // Hide banner after 5 seconds when back online
      setTimeout(() => setShowBanner(false), 5000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
      message.warning('You are currently offline. Viewing cached content.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner && isOnline) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        {!isOnline ? (
          <Alert
            message="Offline Mode"
            description="You are currently offline. You can still browse cached content, but changes won't be saved until you reconnect."
            type="warning"
            showIcon
            icon={<WifiOutlined />}
            banner
            closable={false}
          />
        ) : showBanner ? (
          <Alert
            message="Back Online"
            description="Connection restored. Fresh data will be fetched as you navigate."
            type="success"
            showIcon
            banner
            closable
            onClose={() => setShowBanner(false)}
          />
        ) : null}
      </div>
    </div>
  )
}
