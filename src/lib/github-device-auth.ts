// GitHub Device Flow Authentication
// https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface DeviceAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export class GitHubDeviceAuth {
  private static readonly CLIENT_ID = ''; // Will be set from GitHub App
  private static readonly DEVICE_CODE_URL = 'https://github.com/login/device/code';
  private static readonly ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

  static async getDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch(GitHubDeviceAuth.DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GitHubDeviceAuth.CLIENT_ID,
        scope: 'repo' // Repository access scope
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get device code: ${response.status}`);
    }

    return response.json();
  }

  static async pollForAccessToken(
    deviceCode: string,
    interval: number,
    onProgress?: (timeLeft: number) => void
  ): Promise<string> {
    const startTime = Date.now();
    const timeout = 15 * 60 * 1000; // 15 minutes

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(GitHubDeviceAuth.ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: GitHubDeviceAuth.CLIENT_ID,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });

        const data = await response.json();

        if (response.ok && (data as AccessTokenResponse).access_token) {
          return (data as AccessTokenResponse).access_token;
        }

        const error = data as DeviceAuthError;

        if (error.error === 'authorization_pending') {
          // User hasn't completed authorization yet
          if (onProgress) {
            const timeLeft = timeout - (Date.now() - startTime);
            onProgress(timeLeft);
          }
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
          continue;
        } else if (error.error === 'slow_down') {
          // Increase polling interval
          interval += 5;
          await new Promise(resolve => setTimeout(resolve, interval * 1000));
          continue;
        } else if (error.error === 'expired_token') {
          throw new Error('Device code has expired. Please try again.');
        } else if (error.error === 'access_denied') {
          throw new Error('Authorization was denied.');
        } else {
          throw new Error(`Authentication failed: ${error.error_description || error.error}`);
        }
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error('Network error during authentication');
      }
    }

    throw new Error('Authentication timed out. Please try again.');
  }

  static generateQRCodeURL(verificationURI: string, userCode: string): string {
    const url = `${verificationURI}?user_code=${userCode}`;
    // Generate QR code URL using a service like qr-server.com
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  static setClientId(clientId: string): void {
    // In a real implementation, this would be set from environment or config
    // For now, we'll use a public client ID (when we create the GitHub App)
    (GitHubDeviceAuth as any).CLIENT_ID = clientId;
  }
}