// Supabase Edge Function - שליחת טופס ל-webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_URL = Deno.env.get('MAKE_WEBHOOK_URL') || 'https://hook.eu2.make.com/0b02h3nkhi77eoxmx52eehfxi7i1keiw'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ===== New Request Received =====`)
  console.log(`[${timestamp}] Method: ${req.method}`)
  console.log(`[${timestamp}] URL: ${req.url}`)
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] CORS preflight request - returning OK`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // קבל את הנתונים מהבקשה
    console.log(`[${timestamp}] Parsing request body...`)
    const payload = await req.json()
    console.log(`[${timestamp}] Payload received:`, JSON.stringify(payload, null, 2))

    // בדיקת honeypot - אם השדה מולא, זה בוט
    if (payload.honeypot || payload.website) {
      console.log(`[${timestamp}] ⚠️ BOT DETECTED via honeypot!`)
      console.log(`[${timestamp}] Honeypot value:`, payload.honeypot || payload.website)
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // בדיקת rate limiting בסיסית - בדוק IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    console.log(`[${timestamp}] Client IP: ${clientIP}`)
    
    // שמירת נתונים ב-database (בלי לפגוע בתהליך הקיים)
    let submissionId = null
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const { data: submission, error: dbError } = await supabase
        .from('form_submissions')
        .insert({
          first_name: payload.firstName || null,
          last_name: payload.lastName || null,
          phone: payload.phone || null,
          email: payload.email || null,
          city: payload.city || null,
          ip_address: clientIP,
          user_agent: userAgent
        })
        .select('id')
        .single()
      
      if (!dbError && submission) {
        submissionId = submission.id
        console.log(`[${timestamp}] ✅ Form submission saved to database: ${submissionId}`)
      } else {
        console.log(`[${timestamp}] ⚠️ Could not save to database (non-critical):`, dbError?.message)
      }
    } catch (dbError) {
      // לא נכשל את הבקשה בגלל שגיאת database - זה רק לניתוח
      console.log(`[${timestamp}] ⚠️ Database error (non-critical):`, dbError)
    }
    
    // שליחה ל-webhook
    console.log(`[${timestamp}] 📤 Sending to webhook: ${WEBHOOK_URL}`)
    const webhookPayload = {
      ...payload,
      clientIP: clientIP,
      submittedAt: new Date().toISOString()
    }
    console.log(`[${timestamp}] Webhook payload:`, JSON.stringify(webhookPayload, null, 2))
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    console.log(`[${timestamp}] Webhook response status: ${webhookResponse.status}`)
    console.log(`[${timestamp}] Webhook response headers:`, Object.fromEntries(webhookResponse.headers.entries()))

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error(`[${timestamp}] ❌ Webhook error: ${webhookResponse.status} - ${errorText}`)
      throw new Error(`Webhook returned ${webhookResponse.status}: ${errorText}`)
    }

    const webhookData = await webhookResponse.text()
    console.log(`[${timestamp}] ✅ Webhook response:`, webhookData)
    console.log(`[${timestamp}] ===== Request Completed Successfully =====`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully',
        webhookResponse: webhookData,
        submissionId: submissionId // החזרת ID הרישום (אם נשמר)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error(`[${timestamp}] ❌ ERROR in submit-form function:`, error)
    console.error(`[${timestamp}] Error stack:`, error.stack)
    console.error(`[${timestamp}] ===== Request Failed =====`)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

