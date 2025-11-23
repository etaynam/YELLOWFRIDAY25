-- טבלה לשמירת רישומים דרך הטופס
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  ip_address TEXT,
  user_agent TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלה לשמירת קליקים על כפתור הווטסאפ
CREATE TABLE IF NOT EXISTS whatsapp_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקסים לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_clicked_at ON whatsapp_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_created_at ON whatsapp_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_form_submission_id ON whatsapp_clicks(form_submission_id);

-- RLS Policies - רק אדמינים יכולים לקרוא
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_clicks ENABLE ROW LEVEL SECURITY;

-- Policy לאדמינים - קריאה בלבד
CREATE POLICY "Admins can read form_submissions" ON form_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Admins can read whatsapp_clicks" ON whatsapp_clicks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Policy לכתיבה - כל אחד יכול לכתוב (מ-Edge Function)
CREATE POLICY "Anyone can insert form_submissions" ON form_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert whatsapp_clicks" ON whatsapp_clicks
  FOR INSERT
  WITH CHECK (true);

