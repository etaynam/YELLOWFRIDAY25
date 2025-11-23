# הגדרת Cron Job ב-Vercel

## ⚠️ הערה חשובה
**Vercel Cron Jobs זמינים ב-Hobby plan (חינמי) עם מגבלות:**
- עד 2 cron jobs לפרויקט
- עד 1000 קריאות/חודש

אם אתה צריך יותר, שדרג ל-Pro plan או השתמש ב-[cron-job.org](https://cron-job.org) (ראה "אפשרות חלופית" למטה).

## מה זה?
Cron job שירוץ אוטומטית כל 3 דקות ויפרסם שאלה אחת בצ'אט.

## שלב 1: הגדרת משתני סביבה ב-Vercel

1. לך ל-Vercel Dashboard → הפרויקט שלך → Settings → Environment Variables
2. הוסף את המשתנים הבאים (לכל הסביבות - Production, Preview, Development):
   - `VITE_SUPABASE_URL` - ה-URL של Supabase (למשל: `https://xxxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` - ה-Anon Key של Supabase
   - `CRON_SECRET` (אופציונלי) - סיסמה אקראית לאבטחה נוספת (למשל: `your-random-secret-123`)
     - אם לא תגדיר, ה-cron יעבוד רק דרך Vercel Cron (מומלץ)

## שלב 2: הגדרת Cron ב-Vercel Dashboard

**אפשרות 1: דרך Vercel Dashboard (מומלץ)**
1. לך ל-Vercel Dashboard → הפרויקט שלך → Settings → Cron Jobs
2. לחץ על "Create Cron Job"
3. מלא את הפרטים:
   - **Path**: `/api/cron/auto-post-question`
   - **Schedule**: `*/3 * * * *` (כל 3 דקות)
   - **Timezone**: `Asia/Jerusalem` (או לפי הצורך)

**אפשרות 2: דרך `vercel.json` (אוטומטי)**
הקובץ `vercel.json` כבר מוגדר לרוץ כל 3 דקות (`*/3 * * * *`).

**אפשרויות לוח זמנים:**
- `*/3 * * * *` - כל 3 דקות
- `*/5 * * * *` - כל 5 דקות
- `*/10 * * * *` - כל 10 דקות
- `0 * * * *` - כל שעה
- `0 */2 * * *` - כל שעתיים

**פורמט Cron:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └── יום בשבוע (0-7, 0 או 7 = ראשון)
│ │ │ └──── חודש (1-12)
│ │ └────── יום בחודש (1-31)
│ └──────── שעה (0-23)
└────────── דקה (0-59)
```

## שלב 3: פריסה

פשוט push ל-GitHub (אם יש לך CI/CD) או deploy ידנית:

```bash
vercel --prod
```

## שלב 4: בדיקה

לאחר הפריסה, Vercel יריץ את ה-cron job אוטומטית.

**לבדיקה ידנית:**
```bash
curl -X POST https://your-project.vercel.app/api/cron/auto-post-question \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## איך זה עובד?

1. Vercel Cron מפעיל את ה-API route כל 3 דקות
2. ה-API route בודק את ה-`CRON_SECRET` לאבטחה
3. קורא ל-Supabase Edge Function `auto-post-question`
4. ה-Edge Function בוחר שאלה אקראית, שולח ל-AI, ושומר את התשובה

## הערות חשובות

- **אבטחה**: ה-`CRON_SECRET` מונע מאנשים זרים להפעיל את ה-cron job
- **לוגים**: תוכל לראות את הלוגים ב-Vercel Dashboard → Functions → Logs
- **עלויות**: 
  - Hobby plan: עד 2 cron jobs, עד 1000 קריאות/חודש (חינמי)
  - Pro plan: ללא מגבלות ($20/חודש)

## פתרון בעיות

**אם ה-cron לא רץ:**
1. בדוק את ה-Environment Variables ב-Vercel
2. בדוק את ה-Logs ב-Vercel Dashboard
3. ודא שה-`vercel.json` נכון
4. ודא שהפרויקט מוגדר כ-Production

**לשינוי תדירות:**
ערוך את `vercel.json` ושנה את ה-`schedule`, ואז deploy מחדש.

---

## אפשרות חלופית: cron-job.org (חינמי)

אם אתה צריך יותר מ-2 cron jobs או יותר מ-1000 קריאות/חודש, השתמש ב-cron-job.org:

1. הירשם ל-https://cron-job.org (חינמי)
2. צור job חדש:
   - **Title**: Yellow Friday Auto Questions
   - **Address (URL)**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-post-question`
   - **Request Method**: POST
   - **Request Headers**: 
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **Schedule**: כל 3 דקות (`*/3 * * * *`)
   - **Timezone**: Asia/Jerusalem

3. שמור והפעל

**יתרונות:**
- ✅ חינמי לחלוטין
- ✅ עובד מצוין
- ✅ לוגים מפורטים
- ✅ התראות במייל אם יש שגיאות

**חסרונות:**
- ❌ שירות חיצוני (אבל אמין מאוד)

