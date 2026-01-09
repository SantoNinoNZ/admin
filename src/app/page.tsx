'use client'

import { useState, useEffect } from 'react'
import { GitHubDeviceAuthComponent } from '@/components/GitHubDeviceAuth'
import { Dashboard } from '@/components/Dashboard'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('github_token')
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuth = (accessToken: string) => {
    localStorage.setItem('github_token', accessToken)
    setToken(accessToken)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('github_token')
    setToken(null)
    setIsAuthenticated(false)
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-lora font-bold text-white mb-2">
            Santo Niño Admin
          </h1>
          <p className="text-gray-300">
            Content Management System for santoninonz.github.io
          </p>
        </header>

        {!isAuthenticated ? (
          <GitHubDeviceAuthComponent onAuth={handleAuth} />
        ) : (
          <Dashboard token={token!} onLogout={handleLogout} />
        )}
      </div>
    </main>
  )
}