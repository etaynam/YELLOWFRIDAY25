# הגדרת Supabase

## שלב 1: התחברות לפרויקט Supabase

1. התקן את Supabase CLI (אם עדיין לא):
```bash
npm install -g supabase
```

2. התחבר ל-Supabase:
```bash
supabase login
```

3. **התנתק מפרויקט קיים (אם יש):**
```bash
supabase unlink
```

4. **קישור לפרויקט החדש שלך:**
```bash
supabase link --project-ref your-project-ref
```
(אתה יכול למצוא את ה-project-ref ב-dashboard של Supabase:
- לך ל-Supabase Dashboard
- בחר את הפרויקט שלך
- Settings → General → Reference ID)

## שלב 2: הגדרת משתני סביבה

צור קובץ `.env` בתיקיית הפרויקט עם התוכן הבא:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

אתה יכול למצוא את הערכים האלה ב-Supabase Dashboard:
- Settings → API → Project URL
- Settings → API → anon/public key

## שלב 3: הגדרת Webhook URL ב-Supabase Secrets

הגדר את ה-webhook URL כ-secret ב-Supabase:

```bash
supabase secrets set MAKE_WEBHOOK_URL=https://hook.eu2.make.com/0b02h3nkhi77eoxmx52eehfxi7i1keiw
```

## שלב 4: פריסת Edge Function

פרוס את ה-Edge Function:

```bash
supabase functions deploy submit-form
```

## שלב 5: בדיקה

לאחר הפריסה, ה-Edge Function יהיה זמין ב:
`https://your-project-ref.supabase.co/functions/v1/submit-form`

הטופס שלך כבר מוגדר לשלוח ל-URL הזה.

## הערות

- ה-Edge Function כולל הגנה מפני בוטים (honeypot)
- ה-webhook URL מוסתר בצד השרת
- כל הנתונים נשלחים דרך Supabase בצורה מאובטחת

