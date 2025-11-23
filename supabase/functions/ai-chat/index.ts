// Supabase Edge Function - AI Chat עם ChatGPT Assistant
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const ASSISTANT_ID = Deno.env.get('ASSISTANT_ID') // ה-Assistant ID מ-OpenAI Dashboard
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Content Filter - בדיקת מילים אסורות
const FORBIDDEN_WORDS = [
  'קללה', 'מתחרה', 'סופר פארם', 'שופרסל', 'ויקטורי', 'איקאה', 'רמי לוי',
  // הוסף עוד מילים לפי הצורך
]

const COMPETITORS = [
  'סופר פארם', 'שופרסל', 'ויקטורי', 'איקאה', 'רמי לוי', 'מגה', 'אושר עד',
  // הוסף עוד מתחרים
]

async function containsForbiddenContent(text: string, supabase: any): Promise<boolean> {
  const lowerText = text.toLowerCase()
  
  // טעינת מילים אסורות מה-database
  const { data: forbiddenWordsFromDB } = await supabase
    .from('forbidden_words')
    .select('word')

  const allForbiddenWords = [
    ...FORBIDDEN_WORDS,
    ...(forbiddenWordsFromDB?.map((w: any) => w.word) || [])
  ]
  
  // בדיקת מילים אסורות - רק מילים שלמות (עם גבולות מילים)
  for (const word of allForbiddenWords) {
    const forbiddenWord = word.toLowerCase().trim()
    if (forbiddenWord.length < 3) continue // דילוג על מילים קצרות מדי
    
    // בדיקה אם המילה מופיעה כמילה שלמה (עם גבולות מילים)
    // זה מונע חסימה של מילים רגילות שמכילות את המילה האסורה כחלק ממילה אחרת
    const wordBoundaryRegex = new RegExp(`\\b${forbiddenWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (wordBoundaryRegex.test(lowerText)) {
      return true
    }
  }
  
  // בדיקת מתחרים - רק מילים שלמות
  for (const competitor of COMPETITORS) {
    const competitorLower = competitor.toLowerCase().trim()
    if (competitorLower.length < 3) continue
    
    // בדיקה אם המתחרה מופיע כמילה שלמה
    const wordBoundaryRegex = new RegExp(`\\b${competitorLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (wordBoundaryRegex.test(lowerText)) {
      return true
    }
  }
  
  return false
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Endpoint לקבלת מספר לקוחות מחוברים
  const url = new URL(req.url)
  if (url.pathname.endsWith('/connected-users') && req.method === 'GET') {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      
      // ספירת IP addresses ייחודיים מה-5 דקות האחרונות
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      
      const { data: recentMessages, error } = await supabase
        .from('chat_messages')
        .select('ip_address')
        .gte('created_at', fiveMinutesAgo)
        .not('ip_address', 'is', null)
        .neq('ip_address', 'system')
      
      if (error) {
        // במקרה של שגיאה, נחזיר מספר מינימלי
        return new Response(
          JSON.stringify({ count: 55 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // קבלת IP addresses ייחודיים
      const uniqueIPs = new Set(recentMessages?.map(msg => msg.ip_address).filter(Boolean) || [])
      const actualCount = uniqueIPs.size
      
      // הכפלה ב-55, אבל לפחות 55
      const multipliedCount = Math.max(actualCount * 55, 55)
      
      return new Response(
        JSON.stringify({ count: multipliedCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      // במקרה של שגיאה, נחזיר מספר מינימלי
      return new Response(
        JSON.stringify({ count: 55 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // קבלת IP של המשתמש - חובה לעשות זאת לפני כל דבר אחר
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('cf-connecting-ip') || // Cloudflare
                     'unknown'

    // בדיקת Rate Limiting - 60 שניות בין הודעות לפי IP
    // בדיקה זו חייבת להתבצע לפני כל עיבוד אחר, כולל לפני קריאת ה-JSON
    if (clientIP && clientIP !== 'unknown') {
      const { data: lastMessages, error: lastMsgError } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('ip_address', clientIP)
        .eq('is_ai', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (lastMessages && lastMessages.length > 0) {
        const lastMessage = lastMessages[0]
        const lastMessageTime = new Date(lastMessage.created_at)
        const now = new Date()
        const timeDiff = (now.getTime() - lastMessageTime.getTime()) / 1000 // בשניות

        if (timeDiff < 60) {
          const remainingSeconds = Math.ceil(60 - timeDiff)
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              response: `אנא המתן ${remainingSeconds} שניות לפני שליחת הודעה נוספת.`
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    const { question, messageId, userId, userName } = await req.json()

    if (!question || !question.trim()) {
      return new Response(
        JSON.stringify({ error: 'שאלה חייבת להיות מוגדרת' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // בדיקה אם ה-IP חסום
    const { data: blockedIP } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', clientIP)
      .single()

    if (blockedIP) {
      return new Response(
        JSON.stringify({ 
          error: 'כתובת ה-IP שלך חסומה',
          response: 'כתובת ה-IP שלך חסומה מהצאט. אתה יכול לצפות בהודעות אבל לא לכתוב.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // בדיקת תוכן אסור בשאלה
    if (await containsForbiddenContent(question, supabase)) {
      return new Response(
        JSON.stringify({ 
          error: 'השאלה מכילה תוכן לא מתאים',
          response: 'אני כאן לעזור רק עם שאלות על Yellow Friday ומחסני השוק. איך אוכל לעזור לך?'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'שירות AI לא זמין כרגע' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ASSISTANT_ID) {
      return new Response(
        JSON.stringify({ error: 'Assistant לא מוגדר' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // שמירת הודעת המשתמש מיד - לפני עיבוד ה-AI
    // כך שהיא תהיה זמינה למשתמשים אחרים מיד
    let savedUserMessageId = messageId
    try {
      const { data: savedUserMessage, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId,
          user_name: userName || 'משתמש',
          message_text: question,
          is_ai: false,
          ip_address: clientIP
        })
        .select('id')
        .single()

      if (userMsgError) {
        // אם יש שגיאה בשמירה, ננסה בלי ID (auto-generate)
        const { data: retryMessage, error: retryError } = await supabase
          .from('chat_messages')
          .insert({
            user_name: userName || 'משתמש',
            message_text: question,
            is_ai: false,
            ip_address: clientIP
          })
          .select('id')
          .single()
        
        if (!retryError && retryMessage) {
          savedUserMessageId = retryMessage.id
        }
      } else if (savedUserMessage) {
        savedUserMessageId = savedUserMessage.id
      }
    } catch (dbError) {
      // נמשיך גם אם יש שגיאה - ההודעה תישמר בסוף
    }

    // יצירת Thread חדש או שימוש ב-thread קיים
    // לכל משתמש נשתמש ב-thread נפרד (אפשר לשפר עם userId)
    const threadId = userId || 'anonymous'
    
    // שלב 1: יצירת Thread (אם לא קיים) או שימוש בקיים
    let thread = null
    try {
      // ננסה ליצור thread חדש לכל שאלה (פשוט יותר)
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      })

      if (!threadResponse.ok) {
        throw new Error('שגיאה ביצירת שיחה')
      }

      thread = await threadResponse.json()
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'שגיאה ביצירת שיחה עם AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // שלב 2: הוספת הודעה ל-Thread (רק השאלה, בלי הנחיות)
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: question
      })
    })

    if (!messageResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'שגיאה בשליחת הודעה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // שלב 3: הרצת Assistant עם additional_instructions
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        additional_instructions: `אתה עוזר AI של Yellow Friday במחסני השוק. 
        
הנחיות חשובות:
1. ענה בצורה שמחה, אנרגטית ומרגשת - השתמש באמוג'ים, ביטויים חיוביים וטון מלא התלהבות ושמחה. תמיד נשמע שמח ומתלהב!
2. תמיד נסה לנוע לפעולה - עודד את המשתמש להגיע למחסני השוק ביום שישי (29 בנובמבר 2025)
3. הזכר את היתרונות של להגיע ביום שישי - המבצעים המדהימים, האווירה המיוחדת, ההזדמנות שלא חוזרת
4. שמור על טון ידידותי, מקצועי אבל גם מרגש ומזמין
5. אם רלוונטי, הזכר את קבוצת הוואטסאפ הסודית לקבלת גישה מוקדמת
6. חשוב מאוד: כתוב תשובה קצרה - עד פסקה אחת בלבד, לא הודעה ארוכה
7. אל תכתוב שם פרטי של המשתמש - פנה אליו בצורה כללית (אתה/את, חבר/ה, וכו')
8. אל תגיד "היי חבר" על כל דבר - השתמש בגיוון בברכות ובתשובות
9. תמיד קשור את התשובה ל-Yellow Friday ומחסני השוק
10. חשוב מאוד: אל תפחיד או תזכיר תורים ארוכים, המתנות או בעיות - תמיד התמקד בחיובי ובהתלהבות
11. תמיד הלל את היום הזה - Yellow Friday הוא יום מיוחד, מדהים, יוצא דופן, הזדמנות שלא חוזרת!
12. תמיד צור ציפייה - השתמש בביטויים כמו "חבל לפספס", "הזדמנות שלא חוזרת", "יום שלא תרצו לפספס", "יום שווה במיוחד"
13. האדר את היום הזה - תמיד הדגש כמה Yellow Friday שווה, כמה הוא מיוחד, כמה המבצעים מדהימים, כמה זה יום שלא כדאי לפספס`
      })
    })

    if (!runResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'שגיאה בהרצת Assistant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const run = await runResponse.json()

    // שלב 4: המתן עד שהתשובה מוכנה (polling)
    let runStatus = run.status
    let attempts = 0
    const maxAttempts = 30 // מקסימום 30 ניסיונות (30 שניות)

    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        return new Response(
          JSON.stringify({ error: 'תשובה לוקחת יותר מדי זמן' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await new Promise(resolve => setTimeout(resolve, 1000)) // המתן שנייה

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) {
        break
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.status
      attempts++
    }

    if (runStatus !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'שגיאה בקבלת תשובה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // שלב 5: קבלת התשובה
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'שגיאה בקבלת תשובה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const messagesData = await messagesResponse.json()
    const assistantMessage = messagesData.data
      .filter((msg: any) => msg.role === 'assistant')
      .sort((a: any, b: any) => b.created_at - a.created_at)[0]

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'לא התקבלה תשובה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let aiResponse = assistantMessage.content[0]?.text?.value || 'מצטער, לא הצלחתי לענות על השאלה.'

    // קיצור תשובה ארוכה מדי - עד 300 תווים (פסקה אחת)
    if (aiResponse.length > 300) {
      // חתוך אחרי המשפט הראשון או 300 תווים
      const firstSentence = aiResponse.split(/[.!?]\s/)[0]
      if (firstSentence && firstSentence.length <= 300) {
        aiResponse = firstSentence + '.'
      } else {
        aiResponse = aiResponse.substring(0, 297) + '...'
      }
    }

    // הסרת שמות פרטיים מהתשובה (אם יש)
    // הסר מילים שנראות כמו שמות (מילה אחת, אות ראשונה גדולה, אחרי "היי" או "שלום")
    aiResponse = aiResponse.replace(/\b(היי|שלום|תודה)\s+[א-ת]+(?=\s|,|!|\.)/g, (match, greeting) => {
      return greeting + ' חבר/ה'
    })

    // בדיקת תוכן אסור בתשובה
    if (await containsForbiddenContent(aiResponse, supabase)) {
      return new Response(
        JSON.stringify({
          response: 'אני כאן לעזור רק עם שאלות על Yellow Friday ומחסני השוק. איך אוכל לעזור לך?'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // בדיקה שהתשובה לא חושפת מבצעים ספציפיים
    const specificDealPatterns = [
      /\d+%/g, // אחוזים ספציפיים
      /מבצע.*\d+/g, // מבצע עם מספר
    ]
    
    let filteredResponse = aiResponse
    for (const pattern of specificDealPatterns) {
      if (pattern.test(aiResponse)) {
        // אם יש אחוזים ספציפיים, החלף במסר כללי
        filteredResponse = 'יש לנו מבצעים מדהימים על כל הקטגוריות! המבצעים המדויקים ייחשפו ב-Yellow Friday. הצטרפו לקבוצת הוואטסאפ הסודית לקבלת גישה מוקדמת!'
        break
      }
    }

    // שמירת תשובת ה-AI ב-database
    // הודעת המשתמש כבר נשמרה בתחילת הפונקציה
    try {
      await supabase
        .from('chat_messages')
        .insert({
          user_name: 'שוקי הבוט',
          message_text: filteredResponse,
          is_ai: true,
          reply_to: savedUserMessageId || null,
          ip_address: 'system'
        })
    } catch (dbError) {
      // לא נכשל את הבקשה בגלל שגיאת database
    }

    return new Response(
      JSON.stringify({
        response: filteredResponse,
        messageId: messageId,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'שגיאה פנימית' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

