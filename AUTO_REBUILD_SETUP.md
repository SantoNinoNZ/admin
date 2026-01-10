# Auto-Rebuild Setup Guide

This guide will help you set up automatic rebuilding of your main website whenever you publish or unpublish a post in the admin.

## Overview

When you publish/unpublish a post:
1. A Supabase database trigger detects the change
2. It calls a Supabase Edge Function
3. The Edge Function triggers your GitHub Actions workflow
4. Your site rebuilds and deploys automatically

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub: https://github.com/settings/tokens/new
2. Fill in the form:
   - **Note**: "Supabase Auto Rebuild"
   - **Expiration**: 90 days (or longer if you prefer)
   - **Select scopes**: Check **only** `public_repo` (under repo section)
3. Click **Generate token**
4. **IMPORTANT**: Copy the token immediately (starts with `ghp_`)! You won't be able to see it again.

## Step 2: Add GitHub Token to Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/uvxrdmwmscevovbbrnky
2. Click on **Edge Functions** in the left sidebar
3. Click on **Settings** (gear icon in the top right)
4. Scroll down to **Secrets**
5. Click **Add secret**:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: Paste the token you copied in Step 1
6. Click **Save**

## Step 3: Deploy the Edge Function

Run this command in PowerShell from the admin project directory:

```powershell
cd C:\Projects\santoninonz-admin
npx supabase functions deploy trigger-rebuild --no-verify-jwt
```

## Step 4: Deploy the Database Trigger

Run this command to create the database trigger:

```powershell
cd C:\Projects\santoninonz-admin
npx supabase db push
```

## Step 5: Add Supabase Secrets to GitHub

The edge function needs these values. Add them to your GitHub repository secrets:

1. Go to: https://github.com/SantoNinoNZ/SantoNinoNZ.github.io/settings/secrets/actions
2. Click **New repository secret** for each:

### Secret 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://uvxrdmwmscevovbbrnky.supabase.co`

### Secret 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2eHJkbXdtc2Nldm92YmJybmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MjU4MjEsImV4cCI6MjA4MzUwMTgyMX0.KrS5XFRnHdBr6OJo1ssbgMrOA4rLhybmlsGTnw49-tA`

## Step 6: Commit and Push Changes

Commit the updated workflow file to GitHub:

```powershell
cd C:\Projects\santoninonz-web
git add .github/workflows/nextjs.yml
git commit -m "Add auto-rebuild on post publish"
git push
```

## Testing

1. Go to your admin site
2. Publish or unpublish a post
3. Go to: https://github.com/SantoNinoNZ/SantoNinoNZ.github.io/actions
4. You should see a new workflow run starting within a few seconds
5. Wait for it to complete (~2-3 minutes)
6. Refresh your main site - the post should appear/disappear!

## Troubleshooting

### Edge Function logs
Check logs at: https://supabase.com/dashboard/project/uvxrdmwmscevovbbrnky/functions/trigger-rebuild/logs

### GitHub Actions
Check workflow runs at: https://github.com/SantoNinoNZ/SantoNinoNZ.github.io/actions

### Common Issues

**"GitHub API error: 401"**
- Your GitHub token expired or is invalid
- Create a new token and update it in Supabase secrets

**"GITHUB_TOKEN not configured"**
- You forgot to add the secret in Supabase
- Go back to Step 2

**Workflow doesn't trigger**
- Check database trigger with: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_rebuild_on_publish';`
- Check edge function logs for errors
