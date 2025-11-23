# הגדרת AI Chat עם ChatGPT Assistant

## שלב 1: יצירת OpenAI Assistant

1. לך ל: https://platform.openai.com/assistants
2. צור Assistant חדש או בחר Assistant קיים
3. העתק את ה-Assistant ID (נראה כמו: `asst_xxxxx`)

## שלב 2: יצירת OpenAI API Key (אם אין)

1. לך ל: https://platform.openai.com/api-keys
2. צור API Key חדש
3. העתק את ה-Key

## שלב 3: הגדרת Secrets ב-Supabase

הגדר את ה-OpenAI API Key ו-Assistant ID:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here
supabase secrets set ASSISTANT_ID=asst_your-assistant-id-here
```

## שלב 3: פריסת Edge Function

פרוס את ה-Edge Function:

```bash
supabase functions deploy ai-chat
```

## שלב 4: עדכון הקוד ב-Frontend

הקוד ב-`AIChat.jsx` צריך לשלוח בקשות ל-Edge Function:

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({
    question: inputValue,
    messageId: newMessageId,
    userId: 'anonymous' // או ID משתמש אם יש
  })
})
```

## הגנות מובנות:

✅ **Content Filtering** - מסנן קללות ומילים לא יפות
✅ **Competitor Blocking** - חוסם איזכור מתחרים
✅ **Deal Protection** - לא חושף מבצעים ספציפיים
✅ **Rate Limiting** - מוגבל דרך Supabase
✅ **System Prompt** - הנחיות ברורות ל-AI

## עלויות:

- **gpt-4o-mini**: ~$0.15 לכל מיליון tokens (זול מאוד)
- **gpt-4o**: ~$2.50 לכל מיליון tokens (יותר חזק)

מומלץ להתחיל עם `gpt-4o-mini` - מהיר, זול ומספיק טוב.

## הערות:

- ה-Edge Function יכול לטפל במאות בקשות בו-זמנית
- Supabase מטפל ב-rate limiting אוטומטית
- כל תשובה נבדקת לפני שליחה למשתמש
- System prompt מונע תשובות לא רלוונטיות

