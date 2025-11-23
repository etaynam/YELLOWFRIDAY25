// Vercel Serverless Function - Cron Job לפרסום שאלות אוטומטיות
export default async function handler(req, res) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔔 Cron job triggered`)
  console.log(`[${timestamp}] Headers:`, JSON.stringify(req.headers, null, 2))
  
  // וידוא שזה קריאה מ-Vercel Cron (אבטחה)
  // Vercel שולח header מיוחד בשם 'authorization' עם הערך 'Bearer <CRON_SECRET>'
  const authHeader = req.headers.authorization || req.headers['x-vercel-cron']
  
  // אם יש CRON_SECRET, נבדוק אותו. אם לא, נאפשר רק מ-Vercel Cron
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log(`[${timestamp}] ❌ Unauthorized - CRON_SECRET mismatch`)
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else {
    // אם אין CRON_SECRET, נאפשר רק קריאות מ-Vercel Cron (עם header מיוחד)
    // Vercel Cron שולח header 'x-vercel-cron' או 'authorization' עם הערך מהסביבה
    if (!req.headers['x-vercel-cron'] && !authHeader) {
      console.log(`[${timestamp}] ❌ Unauthorized - No Vercel Cron header`)
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

