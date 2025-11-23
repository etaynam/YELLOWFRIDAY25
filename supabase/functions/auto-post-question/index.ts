// Supabase Edge Function - פרסום שאלות אוטומטיות
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const ASSISTANT_ID = Deno.env.get('ASSISTANT_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔔 auto-post-question function called`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // בחירת שאלה אקראית שלא נשלחה
    console.log(`[${timestamp}] 🔍 Looking for unsent questions...`)
    const { data: unsentQuestions, error: questionsError } = await supabase
      .from('auto_questions')
      .select('*')
      .eq('is_sent', false)
      .limit(100)
    
    console.log(`[${timestamp}] 📊 Found ${unsentQuestions?.length || 0} unsent questions`)

    if (questionsError || !unsentQuestions || unsentQuestions.length === 0) {
      console.log(`[${timestamp}] ⚠️ No unsent questions found. Error:`, questionsError)
      return new Response(
        JSON.stringify({ message: 'אין שאלות חדשות לפרסום', allSent: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // בחירת שאלה אקראית
    const randomIndex = Math.floor(Math.random() * unsentQuestions.length)
    const selectedQuestion = unsentQuestions[randomIndex]
    console.log(`[${timestamp}] ✅ Selected question: "${selectedQuestion.question_text}" by ${selectedQuestion.user_name}`)

    // יצירת ID ייחודי להודעה
    const messageId = crypto.randomUUID()
    const question = selectedQuestion.question_text
    const userName = selectedQuestion.user_name

    // שמירת הודעת המשתמש
    console.log(`[${timestamp}] 💾 Saving user message...`)
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        id: messageId,
        user_name: userName,
        message_text: question,
        is_ai: false,
        ip_address: 'auto-bot'
      })

    if (userMsgError) {
      console.log(`[${timestamp}] ❌ Error saving user message:`, userMsgError)
      return new Response(
        JSON.stringify({ error: 'שגיאה בשמירת הודעת המשתמש', details: userMsgError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`[${timestamp}] ✅ User message saved successfully`)

    // שליחה ל-AI לקבלת תשובה
    if (!OPENAI_API_KEY || !ASSISTANT_ID) {
      // אם אין AI, נסמן את השאלה כנשלחת ונחזור
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

      return new Response(
        JSON.stringify({ 
          message: 'שאלה פורסמה אבל AI לא מוגדר',
          question: question,
          userName: userName
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // יצירת Thread חדש
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
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

      return new Response(
        JSON.stringify({ error: 'שגיאה ביצירת שיחה עם AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const thread = await threadResponse.json()

    // הוספת הודעה ל-Thread
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
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

      return new Response(
        JSON.stringify({ error: 'שגיאה בשליחת הודעה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // הפעלת Assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        additional_instructions: 'ענה בקצרה ובצורה קלילה ומעודדת. תמיד עודד את המשתמש להגיע ביום שישי. אל תגלה פרטים ספציפיים על מבצעים.'
      })
    })

    if (!runResponse.ok) {
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

      return new Response(
        JSON.stringify({ error: 'שגיאה בהפעלת AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const run = await runResponse.json()

    // המתנה עד שהתשובה מוכנה
    let runStatus = run.status
    let attempts = 0
    const maxAttempts = 30

    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        await supabase
          .from('auto_questions')
          .update({ is_sent: true, sent_at: new Date().toISOString() })
          .eq('id', selectedQuestion.id)

        return new Response(
          JSON.stringify({ error: 'תשובה לוקחת יותר מדי זמן' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++

      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) break

      const statusData = await statusResponse.json()
      runStatus = statusData.status
    }

    if (runStatus !== 'completed') {
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

      return new Response(
        JSON.stringify({ error: 'שגיאה בקבלת תשובה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // קבלת התשובה
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

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
      await supabase
        .from('auto_questions')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', selectedQuestion.id)

      return new Response(
        JSON.stringify({ error: 'לא התקבלה תשובה' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = assistantMessage.content[0]?.text?.value || 'מצטער, לא הצלחתי לענות על השאלה.'

    // שמירת תשובת ה-AI
    console.log(`[${timestamp}] 💾 Saving AI response...`)
    const { error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        user_name: 'שוקי הבוט',
        message_text: aiResponse,
        is_ai: true,
        reply_to: messageId,
        ip_address: 'system'
      })
    
    if (aiMsgError) {
      console.log(`[${timestamp}] ❌ Error saving AI message:`, aiMsgError)
    } else {
      console.log(`[${timestamp}] ✅ AI message saved successfully`)
    }

    // סימון השאלה כנשלחה
    console.log(`[${timestamp}] ✅ Marking question as sent...`)
    await supabase
      .from('auto_questions')
      .update({ is_sent: true, sent_at: new Date().toISOString() })
      .eq('id', selectedQuestion.id)

    console.log(`[${timestamp}] ✅ Process completed successfully!`)
    return new Response(
      JSON.stringify({
        success: true,
        question: question,
        userName: userName,
        response: aiResponse
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

