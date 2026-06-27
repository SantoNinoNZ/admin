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

function generateEmailHtml(formType: string, formData: any) {
  const titleMap: Record<string, string> = {
    'contact': 'New Contact Message',
    'prayer': 'New Prayer Request',
    'home-visit': 'New Home Visit Request',
  }
  const title = titleMap[formType] || 'New Submission'
  
  let fieldsHtml = ''
  for (const [key, value] of Object.entries(formData)) {
    if (value === undefined || value === null || value === '') continue;
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const displayValue = typeof value === 'string' ? value.replace(/\n/g, '<br/>') : value;
    
    fieldsHtml += `
      <tr>
        <td style="padding: 12px 16px 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #4b5563; width: 30%; vertical-align: top;">
          ${label}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; vertical-align: top;">
          ${displayValue}
        </td>
      </tr>
    `
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 600px; width: 100%; text-align: left;">
          <tr>
            <td style="background-color: #861D1D; padding: 30px 40px; text-align: center;">
              <h1 style="color: #F4B34C; margin: 0; font-size: 24px; font-weight: 700;">Santo Niño Portal</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin-top: 0; color: #18181b; font-size: 20px;">${title}</h2>
              <p style="color: #52525b; line-height: 1.6; margin-bottom: 24px;">
                A new submission has been received from the website. Here are the details:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${fieldsHtml}
              </table>
              <p style="color: #71717a; font-size: 14px; margin-top: 30px; line-height: 1.5;">
                Please log in to the <a href="https://admin.santonino-nz.org" style="color: #861D1D; font-weight: 600; text-decoration: none;">Admin Portal</a> to take action on this request.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated message from the Santo Niño NZ Web Portal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
          const resendApiKey = Deno.env.get('RESEND_API_KEY')
          
          if (!resendApiKey) {
            console.error('RESEND_API_KEY not set. Skipping email notification.')
          } else {
            let subject = formType === 'contact' ? 'New Contact Message' : formType === 'prayer' ? 'New Prayer Request' : 'New Home Visit Request'
            let html = generateEmailHtml(formType, formData)

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
