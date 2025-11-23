-- יצירת bucket לאחסון תמונות של הודעות מודגשות
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- מדיניות גישה ציבורית - כל אחד יכול לקרוא
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public Access Announcements'
  ) THEN
    CREATE POLICY "Public Access Announcements"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'announcement-images');
  END IF;
END $$;

-- מדיניות העלאה - רק משתמשים מאומתים (אדמינים) יכולים להעלות
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload announcements'
  ) THEN
    CREATE POLICY "Authenticated users can upload announcements"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'announcement-images' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- מדיניות מחיקה - רק משתמשים מאומתים יכולים למחוק
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete announcements'
  ) THEN
    CREATE POLICY "Authenticated users can delete announcements"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'announcement-images' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

