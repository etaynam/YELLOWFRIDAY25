# צפייה בלוגים של Edge Function

## דרך 1: דרך הטרמינל (מומלץ)

הרץ את הפקודה הבאה כדי לראות את הלוגים בזמן אמת:

```bash
supabase functions logs submit-form --follow
```

זה יציג את כל הלוגים בזמן אמת, כולל:
- ✅ כל בקשה שמגיעה
- 📤 שליחה ל-webhook
- ❌ שגיאות (אם יש)
- 🔍 כל הנתונים שנשלחים

## דרך 2: דרך Supabase Dashboard

1. לך ל: https://supabase.com/dashboard/project/kzznwndtlkbgiavgqjgp/functions
2. לחץ על `submit-form`
3. לחץ על הכרטיסייה `Logs`

## מה תראה בלוגים:

```
[2024-11-23T12:00:00.000Z] ===== New Request Received =====
[2024-11-23T12:00:00.000Z] Method: POST
[2024-11-23T12:00:00.000Z] Payload received: {...}
[2024-11-23T12:00:00.000Z] Client IP: xxx.xxx.xxx.xxx
[2024-11-23T12:00:00.000Z] 📤 Sending to webhook: https://hook.eu2.make.com/...
[2024-11-23T12:00:00.000Z] ✅ Webhook response: ...
[2024-11-23T12:00:00.000Z] ===== Request Completed Successfully =====
```

## בדיקת ניסיון

1. פתח טרמינל נוסף והרץ: `supabase functions logs submit-form --follow`
2. במקביל, מלא את הטופס באתר
3. תראה את כל הלוגים בזמן אמת!

