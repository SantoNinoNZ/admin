import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  console.log('Get Users Function Called', { method: req.method, origin: req.headers.get('origin') });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role (needed to access auth.users)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !currentUser) {
      throw new Error('Unauthorized')
    }

    // Check if current user is admin
    const { data: currentUserData, error: checkError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', currentUser.id)
      .maybeSingle()

    // If users table doesn't exist yet or user not found, log warning but allow
    if (checkError) {
      console.warn('Users table check failed:', checkError.message)
      console.warn('This is expected if migration 006 has not been run yet')
      // Don't throw - allow function to continue for initial setup
    } else if (currentUserData && !currentUserData.is_admin) {
      // If user exists but is not admin, block access
      throw new Error('Forbidden: Admin access required')
    }

    // Get all users from auth.users
    const { data: { users: authUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

    if (usersError) {
      throw usersError
    }

    // Get additional user data from users table
    const { data: usersData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')

    if (dbError) {
      console.error('Error fetching users table data:', dbError)
    }

    // Merge auth users with users table data
    const usersMap = new Map(usersData?.map(u => [u.id, u]) || [])

    const users = authUsers.map(authUser => ({
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      user_metadata: authUser.user_metadata,
      is_admin: usersMap.get(authUser.id)?.is_admin || false,
      invited_by: usersMap.get(authUser.id)?.invited_by || null,
    }))

    console.log(`Retrieved ${users.length} users`)

    return new Response(
      JSON.stringify({ users }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden: Admin access required' ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
