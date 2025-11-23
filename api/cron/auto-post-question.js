// Vercel Serverless Function - Cron Job לפרסום שאלות אוטומטיות
export default async function handler(req, res) {
  // וידוא שזה קריאה מ-Vercel Cron (אבטחה)
  // Vercel שולח header מיוחד בשם 'authorization' עם הערך 'Bearer <CRON_SECRET>'
  const authHeader = req.headers.authorization || req.headers['x-vercel-cron']
  
  // אם יש CRON_SECRET, נבדוק אותו. אם לא, נאפשר רק מ-Vercel Cron
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  } else {
    // אם אין CRON_SECRET, נאפשר רק קריאות מ-Vercel Cron (עם header מיוחד)
    // Vercel Cron שולח header 'x-vercel-cron' או 'authorization' עם הערך מהסביבה
    if (!req.headers['x-vercel-cron'] && !authHeader) {
      return res.status(401).json({ error: 'Unauthorized - Only Vercel Cron can call this' })
    }
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured' })
    }

    // קריאה ל-Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-post-question`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json({
      success: true,
      message: 'Question posted successfully',
      data: data
    })
  } catch (error) {
    console.error('Error in cron job:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}

