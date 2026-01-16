import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')
const GITHUB_OWNER = 'SantoNinoNZ'
const GITHUB_REPO = 'SantoNinoNZ.github.io'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN not configured')
    }

    // Fetch the latest workflow runs for the deploy workflow
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Edge-Function',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const runs = data.workflow_runs || []

    // Find the latest run
    const latestRun = runs[0]

    // Find the latest successful run
    const lastSuccessfulRun = runs.find((run: any) =>
      run.conclusion === 'success' && run.status === 'completed'
    )

    return new Response(
      JSON.stringify({
        success: true,
        current: latestRun ? {
          id: latestRun.id,
          status: latestRun.status, // queued, in_progress, completed
          conclusion: latestRun.conclusion, // success, failure, cancelled, null (if in progress)
          created_at: latestRun.created_at,
          updated_at: latestRun.updated_at,
          html_url: latestRun.html_url,
          event: latestRun.event, // push, repository_dispatch, workflow_dispatch
        } : null,
        lastSuccessful: lastSuccessfulRun ? {
          id: lastSuccessfulRun.id,
          completed_at: lastSuccessfulRun.updated_at,
          html_url: lastSuccessfulRun.html_url,
        } : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error fetching build status:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
