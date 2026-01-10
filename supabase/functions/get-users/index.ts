import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log('--- Get Users Function Called (Debug Mode) ---');
  console.log('Request Method:', req.method);
  console.log('Request URL:', req.url);
  console.log('--- Headers ---');
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value}`);
  }
  console.log('--- End Headers ---');

  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({ message: 'This is a test response.' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
