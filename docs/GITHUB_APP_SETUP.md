# GitHub App Setup for Device Flow Authentication

## Overview

To enable the improved "Login with GitHub" experience using Device Flow authentication, you need to create a GitHub App. This replaces the manual Personal Access Token requirement with a one-click authentication flow.

## Why GitHub App vs OAuth App?

**GitHub App Benefits:**
- ✅ More secure and granular permissions
- ✅ Better rate limiting (5000/hour per installation vs 5000/hour per user)
- ✅ Organization-level installation
- ✅ Future-proof for GitHub's roadmap

**Device Flow Benefits:**
- ✅ No backend server required (perfect for GitHub Pages)
- ✅ Works on mobile and desktop
- ✅ One-click authentication experience
- ✅ QR code support for cross-device auth

## Step 1: Create GitHub App

### 1.1 Navigate to GitHub App Settings
1. Go to your organization: https://github.com/SantoNinoNZ
2. Click **Settings** → **Developer settings** → **GitHub Apps**
3. Click **New GitHub App**

### 1.2 Configure Basic Information
```
GitHub App name: Santo Niño Admin
Homepage URL: https://santoninonz.github.io/admin/
Callback URL: (leave empty - not needed for device flow)
Setup URL: (optional)
Webhook URL: (leave empty)
Webhook secret: (leave empty)
```

### 1.3 Configure Permissions
Set these **Repository permissions**:
- **Contents**: Read and write (to manage markdown files)
- **Metadata**: Read (to access repository information)
- **Pull requests**: Read (optional - for future features)

Set these **Organization permissions**:
- **Members**: Read (to verify organization access)

### 1.4 Configure Device Flow
✅ **Enable Device Flow** - This is crucial for the authentication to work

### 1.5 Installation Options
- **Any account** (allows installation by organization members)

### 1.6 Create the App
Click **Create GitHub App**

## Step 2: Install the GitHub App

### 2.1 Install to Organization
1. After creating, click **Install App** in the sidebar
2. Select **SantoNinoNZ** organization
3. Choose **Selected repositories**
4. Select **santoninonz.github.io** repository
5. Click **Install**

### 2.2 Note the Client ID
After installation, go to **General** settings and copy the **Client ID**

## Step 3: Update Admin Interface

### 3.1 Set Client ID
Update the `github-device-auth.ts` file:

```typescript
// Replace this line:
private static readonly CLIENT_ID = '';

// With your actual Client ID:
private static readonly CLIENT_ID = 'Iv1.your_client_id_here';
```

### 3.2 Enable Device Flow in Component
Update `GitHubDeviceAuth.tsx` to remove the error and enable the actual flow:

```typescript
// Remove this block:
setError('Device Flow requires a GitHub App. Please use manual token for now.')
setStep('manual_token')

// And uncomment the device flow implementation
```

## Step 4: Test Authentication Flow

### 4.1 Test Device Flow
1. Deploy the updated admin interface
2. Visit https://santoninonz.github.io/admin/
3. Click **Quick Sign In**
4. Follow the device authentication flow

### 4.2 Fallback to Manual Token
The interface still supports manual PAT entry for:
- Advanced users who prefer it
- Troubleshooting scenarios
- Development environments

## Configuration File

Create a configuration file to manage the client ID:

```typescript
// src/config/auth.ts
export const AUTH_CONFIG = {
  GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'Iv1.your_client_id_here',
  ENABLE_DEVICE_FLOW: process.env.NEXT_PUBLIC_ENABLE_DEVICE_FLOW !== 'false'
};
```

Then update the auth component to use this config.

## Security Considerations

### Client ID Security
- **Public Information**: Client IDs are safe to expose in client-side code
- **No Secret Required**: Device flow doesn't use client secrets
- **Rate Limiting**: GitHub handles rate limiting per app installation

### App Permissions
- **Minimal Scope**: Only request necessary repository permissions
- **Organization Level**: Install only to required repositories
- **Regular Review**: Audit permissions periodically

### Token Management
- **Short-lived**: Device flow tokens have configurable expiration
- **Revocable**: Users can revoke access in GitHub settings
- **Scoped**: Tokens only work for installed repositories

## Troubleshooting

### Common Issues

#### 1. "Device Flow not enabled"
**Solution**: Ensure "Enable Device Flow" is checked in GitHub App settings

#### 2. "Client ID not found"
**Solution**: Verify client ID is correctly set in the code

#### 3. "Insufficient permissions"
**Solution**: Check app has "Contents: Read and write" permission

#### 4. "Repository not accessible"
**Solution**: Ensure app is installed to the correct repository

### Testing Device Flow Locally

For local development:

```bash
# Set client ID as environment variable
export NEXT_PUBLIC_GITHUB_CLIENT_ID="Iv1.your_client_id_here"

# Start development server
npm run dev
```

### Monitoring Usage

GitHub provides analytics for your app:
1. Go to GitHub App settings
2. Click **Advanced** tab
3. View installation and usage metrics

## Migration from PAT

### Advantages of Device Flow
- **Better UX**: One-click vs manual token creation
- **More Secure**: App-level permissions vs user-level
- **Easier Management**: Centralized in organization settings

### Backward Compatibility
The admin interface supports both methods:
- **Device Flow**: Primary authentication method
- **Manual PAT**: Fallback for edge cases

### User Communication
Inform users about the improved authentication:
- Send notification about easier login process
- Update documentation and help guides
- Provide support for transition period

## Future Enhancements

### Possible Improvements
- **Team Permissions**: Role-based access within the app
- **Audit Logging**: Track who makes what changes
- **Webhook Integration**: Real-time updates
- **Multiple Repository Support**: Expand to other repos

### App Evolution
- **OAuth Scopes**: Fine-tune permissions as needs grow
- **Installation Targeting**: Install to specific repositories
- **Organization Policies**: Enforce organization-wide settings

This setup provides a much better user experience while maintaining security and leveraging GitHub's native infrastructure.