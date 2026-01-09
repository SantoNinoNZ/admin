'use client'

import { useState } from 'react'
import { Github, Key } from 'lucide-react'

interface GitHubAuthProps {
  onAuth: (token: string) => void;
}

export function GitHubAuth({ onAuth }: GitHubAuthProps) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTokenAuth = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Test the token by making a request to GitHub API
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        throw new Error('Invalid GitHub token')
      }

      onAuth(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-xl">
        <div className="text-center mb-6">
          <Github className="w-12 h-12 mx-auto text-white mb-4" />
          <h2 className="text-2xl font-lora font-bold text-white mb-2">
            GitHub Authentication
          </h2>
          <p className="text-gray-300">
            Enter your GitHub Personal Access Token to manage posts
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
              Personal Access Token
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleTokenAuth()}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleTokenAuth}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <p className="text-blue-200 text-sm mb-2">
            <strong>How to get a GitHub token:</strong>
          </p>
          <ol className="text-blue-200 text-xs space-y-1">
            <li>1. Go to GitHub → Settings → Developer settings</li>
            <li>2. Click "Personal access tokens" → "Tokens (classic)"</li>
            <li>3. Generate new token with "repo" scope</li>
            <li>4. Copy and paste the token here</li>
          </ol>
        </div>
      </div>
    </div>
  )
}