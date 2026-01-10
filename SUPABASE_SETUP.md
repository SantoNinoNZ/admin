# Supabase Setup Guide

## Prerequisites
You mentioned you've already created GitHub OAuth in Supabase. Great!

## Configuration Steps

### 1. Create `.env.local` file

Create a `.env.local` file in the root of your project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Get your Supabase credentials

1. Go to your Supabase project dashboard
2. Click on "Project Settings" (gear icon)
3. Go to "API" section
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure GitHub OAuth

1. In Supabase dashboard, go to "Authentication" → "Providers"
2. Enable GitHub provider
3. Add your GitHub OAuth credentials:
   - **Client ID**: From your GitHub OAuth App
   - **Client Secret**: From your GitHub OAuth App
4. **IMPORTANT**: Scroll down and enable "Save provider access tokens"
   - This is CRITICAL - without this, the GitHub API token won't be saved
   - Look for a checkbox or toggle that says something like "Save provider access tokens" or "Store provider tokens"
5. Add the callback URL to your GitHub OAuth App:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```

### 4. GitHub OAuth App Setup

If you haven't created a GitHub OAuth App yet:

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Santo Niño Admin
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Copy the Client ID and generate a Client Secret
6. Add these to Supabase (step 3 above)

### 5. Required Scopes

The GitHub OAuth will need the `repo` scope to access and modify your repository content. This is automatically requested through Supabase.

## Testing

1. Start your dev server: `npm run dev`
2. Click "Sign in with GitHub"
3. Authorize the app
4. You should be redirected back to your dashboard

## Troubleshooting

### "No GitHub token found in session"
1. **Check Supabase Provider Settings**:
   - Go to Supabase dashboard → Authentication → Providers → GitHub
   - Make sure "Save provider access tokens" is enabled
   - Without this, the provider_token won't be available in your session

2. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Look for console logs during sign-in
   - You should see messages like "✓ Stored GitHub provider token"
   - Check localStorage: `localStorage.getItem('github_provider_token')`

3. **Verify OAuth Scopes**:
   - The app requests `repo` scope which gives access to private and public repositories
   - Make sure your GitHub OAuth App has the right scopes configured

### Can't access repository
- Ensure the GitHub account you're signing in with has write access to the repository
- Check the repository owner and name in `src/lib/github-api.ts` (line 5-6):
  ```typescript
  const REPO_OWNER = 'SantoNinoNZ';
  const REPO_NAME = 'santoninonz.github.io';
  ```

### Still seeing 404 or errors
1. Clear browser cache and localStorage
2. Sign out completely
3. Check that your `.env.local` file has the correct Supabase credentials
4. Try signing in again and watch the browser console for errors
