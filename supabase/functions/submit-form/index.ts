import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Verify Cloudflare Turnstile token server-side
async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not set')
    return false
  }

  const formData = new FormData()
  formData.append('secret', secretKey)
  formData.append('response', token)
  if (remoteip) formData.append('remoteip', remoteip)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()
  console.log('Turnstile verification result:', JSON.stringify(result))
  return result.success === true
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { formType, turnstileToken, honeypot, submittedAt, ...formData } = body

    // 1. Honeypot check — bots fill hidden fields, humans don't
    if (honeypot && honeypot.trim() !== '') {
      console.warn('Honeypot triggered — likely a bot')
      // Return a fake success so bots think they succeeded
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Time-based check — bots submit too fast (under 3 seconds)
    if (submittedAt) {
      const elapsed = Date.now() - submittedAt
      if (elapsed < 3000) {
        console.warn(`Form submitted too fast (${elapsed}ms) — likely a bot`)
        return new Response(JSON.stringify({ error: 'Submission rejected. Please try again.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 3. Turnstile CAPTCHA verification
    if (!turnstileToken) {
      return new Response(JSON.stringify({ error: 'CAPTCHA verification required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const remoteIp = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || undefined
    const isHuman = await verifyTurnstileToken(turnstileToken, remoteIp)

    if (!isHuman) {
      return new Response(JSON.stringify({ error: 'CAPTCHA verification failed. Please try again.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. All checks passed — create a Supabase client with service role key to insert
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let insertError = null

    if (formType === 'contact') {
      const { name, email, subject, message } = formData
      if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await supabase.from('contact_messages').insert({
        name,
        email,
        subject: subject || null,
        message,
      })
      insertError = error
    } else if (formType === 'prayer') {
      const { name, email, contact, prayer_request } = formData
      if (!name || !prayer_request) {
        return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await supabase.from('prayer_requests').insert({
        name,
        email: email || null,
        contact: contact || null,
        prayer_request,
      })
      insertError = error
    } else if (formType === 'home-visit') {
      const { name, email, contact, address, requested_datetime } = formData
      if (!name || !requested_datetime) {
        return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error } = await supabase.from('home_visit_requests').insert({
        name,
        email: email || null,
        contact: contact || null,
        address: address || null,
        requested_datetime,
      })
      insertError = error
    } else {
      return new Response(JSON.stringify({ error: 'Unknown form type.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (insertError) {
      console.error('DB insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save your submission. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Email Notification Logic
    try {
      // Fetch all admin users from Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        console.error('Failed to fetch admin users:', authError)
      } else if (authData && authData.users) {
        // Extract emails from all registered users
        const adminEmails = authData.users.map((u) => u.email).filter(Boolean) as string[]
        
        if (adminEmails.length > 0) {
          // It's best practice to use Deno.env.get for secrets, but we've included a fallback to your requested key
          const resendApiKey = Deno.env.get('RESEND_API_KEY') || 're_hfax7kiw_QLCGG82UhkV3i5om2xQP92t1'
          
          let subject = `New ${formType} submission`
          let html = `<p>A new <strong>${formType}</strong> request has been submitted on the portal.</p>`
          html += `<ul>`
          for (const [key, value] of Object.entries(formData)) {
             html += `<li><strong>${key}:</strong> ${value}</li>`
          }
          html += `</ul>`

          // Send the email via Resend API
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Santo Niño Portal <noreply@santonino-nz.org>',
              to: adminEmails,
              subject: subject,
              html: html,
            }),
          })

          if (!resendResponse.ok) {
            const resendError = await resendResponse.text()
            console.error('Failed to send email via Resend:', resendError)
          } else {
            console.log('Email notification sent successfully to admins.')
          }
        } else {
          console.log('No admin emails found to notify.')
        }
      }
    } catch (emailErr) {
      console.error('Unexpected error while sending email:', emailErr)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
