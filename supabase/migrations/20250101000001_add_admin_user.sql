-- הוספת משתמש אדמין חדש
-- אם המשתמש כבר קיים, זה לא יעשה כלום (ON CONFLICT)
INSERT INTO admins (id, username, password_hash) 
VALUES (
  '92b6db6d-3ce9-461b-a84a-e1f3d76bc105',
  'admin_user_92b6db6d',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq'
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash;

