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
    <div className="max-w-md mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 mb-6 shadow-lg">
            <Github className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-lora font-bold text-white mb-3">
            Welcome Back
          </h2>
          <p className="text-gray-300 leading-relaxed">
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
          <div className="space-y-6">
            <button
              onClick={handleDeviceFlow}
              disabled={loading}
              className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/30">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-semibold text-white">Quick Sign In</div>
                  <div className="text-sm text-blue-100">Use your phone or another device</div>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10 bg-white"></div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 py-1 bg-gradient-to-r from-red-900/90 to-orange-900/90 text-white rounded-full">or</span>
              </div>
            </div>

            <button
              onClick={() => setStep('manual_token')}
              className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:from-gray-800 hover:to-gray-900"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600/30">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-semibold text-white">Personal Access Token</div>
                  <div className="text-sm text-gray-300">For advanced users</div>
                </div>
              </div>
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-10 bg-white"></div>
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
          <div className="space-y-6">
            <button
              onClick={() => setStep('method')}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200 text-sm group"
            >
              <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
              <span>Back to options</span>
            </button>

            <div className="space-y-4">
              <label htmlFor="token" className="block text-lg font-semibold text-white mb-3">
                Personal Access Token
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="token"
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleManualToken()}
                />
              </div>
            </div>

            <button
              onClick={handleManualToken}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Authenticate'
              )}
            </button>

            <div className="mt-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-200 text-sm font-semibold mb-3">
                How to get a GitHub token:
              </p>
              <ol className="text-blue-200/90 text-sm space-y-2 leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-semibold min-w-[1.25rem]">1.</span>
                  <span>Go to GitHub → Settings → Developer settings</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-semibold min-w-[1.25rem]">2.</span>
                  <span>Click "Personal access tokens" → "Tokens (classic)"</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-semibold min-w-[1.25rem]">3.</span>
                  <span>Generate new token with "repo" scope</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 font-semibold min-w-[1.25rem]">4.</span>
                  <span>Copy and paste the token here</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}