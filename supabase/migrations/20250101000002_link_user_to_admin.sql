-- קישור משתמש קיים ב-auth.users לאדמין
-- עדכון טבלת admins כך שה-id יהיה קשור ל-auth.users
UPDATE admins 
SET id = '92b6db6d-3ce9-461b-a84a-e1f3d76bc105'
WHERE username = 'admin_user_92b6db6d'
AND id != '92b6db6d-3ce9-461b-a84a-e1f3d76bc105';

-- אם המשתמש לא קיים בטבלת admins, הוסף אותו
INSERT INTO admins (id, username, password_hash) 
VALUES (
  '92b6db6d-3ce9-461b-a84a-e1f3d76bc105',
  'admin_' || SUBSTRING('92b6db6d-3ce9-461b-a84a-e1f3d76bc105'::text, 1, 8),
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'
)
ON CONFLICT (id) DO NOTHING;

