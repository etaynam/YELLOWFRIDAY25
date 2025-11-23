# הגדרת שאלות אוטומטיות

## מה זה?
מערכת שתפרסם שאלות אוטומטיות בצ'אט כל כמה דקות, תחת שמות ישראליים שונים, כדי ליצור תחושה שהצ'אט פעיל ומלא.

## שלב 1: הרצת Migrations

הרץ את ה-migrations הבאים:
```bash
supabase db push
```

זה ייצור:
- טבלת `auto_questions` עם כל השאלות
- כל השאלות עם שמות ישראליים מגוונים

## שלב 2: הפעלת הפונקציה

הפונקציה `auto-post-question` יכולה להיקרא ידנית או דרך cron job חיצוני.

### אפשרות 1: קריאה ידנית (לבדיקה)
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-post-question \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### אפשרות 2: Cron Job חיצוני (מומלץ)

השתמש בשירות כמו:
- **cron-job.org** (חינמי)
- **EasyCron** (חינמי)
- **GitHub Actions** (אם יש לך repo)

**דוגמה ל-cron-job.org:**
1. הירשם ל-https://cron-job.org
2. צור job חדש:
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/auto-post-question`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer YOUR_ANON_KEY`
   - **Schedule**: כל 3-5 דקות (למשל: `*/3 * * * *`)

### אפשרות 3: דרך Supabase Database Webhooks (מתקדם)

אפשר להגדיר webhook שירוץ כל כמה דקות דרך Supabase Dashboard.

## איך זה עובד?

1. הפונקציה בוחרת שאלה אקראית שלא נשלחה
2. שומרת את השאלה כהודעת משתמש (עם שם ישראלי)
3. שולחת את השאלה ל-AI לקבלת תשובה
4. שומרת את תשובת ה-AI
5. מסמנת את השאלה כ"נשלחה"

## הוספת שאלות חדשות

כשנגמרות השאלות, תוכל להוסיף עוד:

```sql
INSERT INTO auto_questions (question_text, user_name) VALUES
('השאלה החדשה שלך?', 'שם ישראלי'),
('עוד שאלה?', 'עוד שם');
```

ואז לאפס את כל השאלות (אם רוצה לפרסם אותן שוב):

```sql
UPDATE auto_questions SET is_sent = false, sent_at = NULL;
```

## בדיקת סטטוס

כדי לראות כמה שאלות נשארו:
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_sent = false) as unsent_count,
  COUNT(*) FILTER (WHERE is_sent = true) as sent_count,
  COUNT(*) as total_count
FROM auto_questions;
```

## הערות

- הפונקציה תפרסם שאלה אחת בכל קריאה
- אם אין שאלות חדשות, הפונקציה תחזיר `allSent: true`
- כל שאלה תפורסם פעם אחת בלבד (עד שתאפס את הטבלה)
- השאלות מתפרסמות עם שמות ישראליים אקראיים

