/*
# Storage setup and policies for student-photos bucket

1. Security
- Public read (bucket is already public).
- Anon + authenticated can upload and update.
- Anon + authenticated can delete.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "anon_read_student_photos" ON storage.objects;
CREATE POLICY "anon_read_student_photos" ON storage.objects FOR SELECT
TO anon, authenticated USING (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "anon_insert_student_photos" ON storage.objects;
CREATE POLICY "anon_insert_student_photos" ON storage.objects FOR INSERT
TO anon, authenticated WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "anon_update_student_photos" ON storage.objects;
CREATE POLICY "anon_update_student_photos" ON storage.objects FOR UPDATE
TO anon, authenticated USING (bucket_id = 'student-photos') WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "anon_delete_student_photos" ON storage.objects;
CREATE POLICY "anon_delete_student_photos" ON storage.objects FOR DELETE
TO anon, authenticated USING (bucket_id = 'student-photos');
