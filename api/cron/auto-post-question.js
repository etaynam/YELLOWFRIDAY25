// Vercel Serverless Function - Cron Job לפרסום שאלות אוטומטיות
export default async function handler(req, res) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔔 Cron job triggered`)
  console.log(`[${timestamp}] Method: ${req.method}`)
  console.log(`[${timestamp}] Headers:`, JSON.stringify(req.headers, null, 2))
  
  // Vercel Cron Jobs שולחים user-agent: "vercel-cron/1.0"
  // או 'authorization' עם 'Bearer <CRON_SECRET>' אם מוגדר
  const userAgent = req.headers['user-agent'] || ''
  const isVercelCron = userAgent === 'vercel-cron/1.0'
  const authHeader = req.headers.authorization
  
  console.log(`[${timestamp}] User-Agent:`, userAgent)
  console.log(`[${timestamp}] Is Vercel Cron:`, isVercelCron)
  
  // אם יש CRON_SECRET, נבדוק אותו
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !isVercelCron) {
      console.log(`[${timestamp}] ❌ Unauthorized - CRON_SECRET mismatch and not Vercel Cron`)
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else {
    // אם אין CRON_SECRET, נאפשר רק מ-Vercel Cron
    if (!isVercelCron) {
      console.log(`[${timestamp}] ❌ Unauthorized - Not a Vercel Cron request`)
      console.log(`[${timestamp}] User-Agent:`, userAgent)
      return res.status(401).json({ error: 'Unauthorized - Only Vercel Cron can call this' })
    }
  }

  console.log(`[${timestamp}] ✅ Authorization passed, calling Supabase Edge Function...`)

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured' })
    }

    // קריאה ל-Supabase Edge Function
    console.log(`[${timestamp}] 📞 Calling Supabase Edge Function: ${supabaseUrl}/functions/v1/auto-post-question`)
    
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-post-question`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    console.log(`[${timestamp}] 📥 Response status: ${response.status}`)
    console.log(`[${timestamp}] 📥 Response data:`, JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.log(`[${timestamp}] ❌ Error from Supabase Edge Function`)
      return res.status(response.status).json(data)
    }

    console.log(`[${timestamp}] ✅ Question posted successfully!`)
    return res.status(200).json({
      success: true,
      message: 'Question posted successfully',
      data: data
    })
  } catch (error) {
    console.error(`[${timestamp}] ❌ Error in cron job:`, error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}

