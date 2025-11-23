-- טבלת שאלות אוטומטיות
CREATE TABLE IF NOT EXISTS auto_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  user_name TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקס לביצועים
CREATE INDEX IF NOT EXISTS idx_auto_questions_is_sent ON auto_questions(is_sent);
CREATE INDEX IF NOT EXISTS idx_auto_questions_created_at ON auto_questions(created_at);

