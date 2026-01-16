import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')
const REBUILD_SECRET = Deno.env.get('REBUILD_SECRET') // Optional shared secret for verification
const GITHUB_OWNER = 'SantoNinoNZ'
const GITHUB_REPO = 'SantoNinoNZ.github.io'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-rebuild-secret',
      },
    })
  }

  try {
    // Optional: Verify shared secret if configured
    if (REBUILD_SECRET) {
      const providedSecret = req.headers.get('x-rebuild-secret')
      if (providedSecret !== REBUILD_SECRET) {
        // Also check body for secret (for database triggers)
        const body = await req.clone().json().catch(() => ({}))
        if (body.secret !== REBUILD_SECRET) {
          throw new Error('Invalid rebuild secret')
        }
      }
    }

    // Verify GitHub token exists
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured')
    }

    // Trigger GitHub workflow
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function',
        },
        body: JSON.stringify({
          event_type: 'rebuild-site',
          client_payload: {
            timestamp: new Date().toISOString(),
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
    }

    console.log('Successfully triggered rebuild')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rebuild triggered successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error triggering rebuild:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
