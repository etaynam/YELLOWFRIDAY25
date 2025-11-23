# הגדרת מערכת האדמין

## שלב 1: יצירת טבלאות ב-Supabase

1. לך ל-Supabase Dashboard: https://supabase.com/dashboard/project/kzznwndtlkbgiavgqjgp/editor
2. לחץ על "SQL Editor"
3. העתק את התוכן מ-`supabase/migrations/20250101000000_create_admin_tables.sql`
4. הדבק ב-SQL Editor והרץ (Run)

או הרץ דרך CLI:
```bash
supabase db push
```

## שלב 2: פריסת Edge Functions

```bash
supabase functions deploy admin-api
supabase functions deploy ai-chat
```

## שלב 3: גישה למערכת האדמין

1. לך ל: `http://localhost:5173/admin` (בפיתוח)
2. התחבר עם:
   - **שם משתמש:** `admin`
   - **סיסמה:** `admin123`

**חשוב:** שנה את הסיסמה אחרי ההתקנה!

## תכונות מערכת האדמין:

### 1. ניהול הודעות
- צפייה בכל ההודעות
- מחיקת הודעות (soft delete)
- צפייה ב-IP של כל משתמש

### 2. חסימת IPs
- הוספת IP לחסימה
- הסרת חסימה
- משתמשים חסומים יכולים לצפות אבל לא לכתוב

### 3. ניהול מילים אסורות
- הוספת מילים אסורות
- הסרת מילים
- המילים נטענות אוטומטית מה-database

### 4. הודעות מודגשות
- יצירת הודעות עם תמונה, טקסט וקישור
- הודעות מוצגות בראש הצ'אט
- אפשרות למחוק הודעות

## הערות אבטחה:

- כרגע ההתחברות פשוטה (username:password)
- בסביבת ייצור כדאי להשתמש ב-JWT אמיתי
- כל הפעולות דורשות authentication

