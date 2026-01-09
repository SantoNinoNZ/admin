'use client'

import { useState } from 'react'
import { Github, Key, Smartphone, QrCode, Clock, ExternalLink } from 'lucide-react'
import { GitHubDeviceAuth } from '@/lib/github-device-auth'

interface GitHubDeviceAuthProps {
  onAuth: (token: string) => void;
}

type AuthStep = 'method' | 'device_setup' | 'polling' | 'manual_token';

export function GitHubDeviceAuthComponent({ onAuth }: GitHubDeviceAuthProps) {
  const [step, setStep] = useState<AuthStep>('method')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes
  const [manualToken, setManualToken] = useState('')

  // Device Flow Authentication
  const handleDeviceFlow = async () => {
    setLoading(true)
    setError('')

    try {
      // Note: This requires a GitHub App to be set up
      // For now, we'll show instructions for setting it up
      setError('Device Flow requires a GitHub App. Please use manual token for now.')
      setStep('manual_token')

      /* When GitHub App is set up:
      const response = await GitHubDeviceAuth.getDeviceCode()

      setDeviceCode(response.device_code)
      setUserCode(response.user_code)
      setVerificationUri(response.verification_uri_complete)
      setStep('device_setup')

      // Start polling for access token
      setTimeout(() => {
        setStep('polling')
        pollForToken(response.device_code, response.interval)
      }, 3000)
      */
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start device authentication')
    } finally {
      setLoading(false)
    }
  }

  const pollForToken = async (deviceCode: string, interval: number) => {
    try {
      const token = await GitHubDeviceAuth.pollForAccessToken(
        deviceCode,
        interval,
        (timeRemaining) => setTimeLeft(Math.floor(timeRemaining / 1000))
      )
      onAuth(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setStep('method')
    }
  }

  // Manual Token Authentication
  const handleManualToken = async () => {
    if (!manualToken.trim()) {
      setError('Please enter a GitHub token')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Test the token by making a request to GitHub API
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${manualToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        throw new Error('Invalid GitHub token')
      }

      onAuth(manualToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-xl">
        <div className="text-center mb-6">
          <Github className="w-12 h-12 mx-auto text-white mb-4" />
          <h2 className="text-2xl font-lora font-bold text-white mb-2">
            GitHub Authentication
          </h2>
          <p className="text-gray-300">
            Choose how you'd like to authenticate with GitHub
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Method Selection */}
        {step === 'method' && (
          <div className="space-y-4">
            <button
              onClick={handleDeviceFlow}
              disabled={loading}
              className="w-full flex items-center space-x-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
            >
              <Smartphone className="w-5 h-5" />
              <div className="text-left flex-1">
                <div>Quick Sign In</div>
                <div className="text-sm opacity-75">Use your phone or another device</div>
              </div>
            </button>

            <div className="text-center text-gray-400 text-sm">or</div>

            <button
              onClick={() => setStep('manual_token')}
              className="w-full flex items-center space-x-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
            >
              <Key className="w-5 h-5" />
              <div className="text-left flex-1">
                <div>Personal Access Token</div>
                <div className="text-sm opacity-75">For advanced users</div>
              </div>
            </button>
          </div>
        )}

        {/* Device Setup Instructions */}
        {step === 'device_setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-4">
                Complete authentication on your device
              </h3>

              <div className="bg-white p-4 rounded-lg mb-4">
                <img
                  src={GitHubDeviceAuth.generateQRCodeURL(verificationUri, userCode)}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>

              <div className="bg-black/20 rounded-lg p-4 mb-4">
                <div className="text-2xl font-mono text-white tracking-widest">
                  {userCode}
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  Enter this code at GitHub
                </div>
              </div>

              <a
                href={verificationUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-secondary hover:bg-secondary/90 text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open GitHub</span>
              </a>
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep('polling')}
                className="text-white underline text-sm"
              >
                I've entered the code
              </button>
            </div>
          </div>
        )}

        {/* Polling for Authorization */}
        {step === 'polling' && (
          <div className="text-center space-y-4">
            <Clock className="w-8 h-8 mx-auto text-white animate-pulse" />
            <h3 className="text-lg font-semibold text-white">
              Waiting for authorization...
            </h3>
            <p className="text-gray-300">
              Please complete the authorization on GitHub
            </p>
            <div className="text-lg font-mono text-secondary">
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setStep('method')}
              className="text-gray-400 underline text-sm"
            >
              Cancel and try again
            </button>
          </div>
        )}

        {/* Manual Token Entry */}
        {step === 'manual_token' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('method')}
              className="text-gray-400 underline text-sm mb-4"
            >
              ← Back to options
            </button>

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                Personal Access Token
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="token"
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualToken()}
                />
              </div>
            </div>

            <button
              onClick={handleManualToken}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>

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
        )}
      </div>
    </div>
  )
}