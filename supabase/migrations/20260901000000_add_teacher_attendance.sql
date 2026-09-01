ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE attendance
  ALTER COLUMN enrollment_id DROP NOT NULL;

DROP INDEX IF EXISTS idx_attendance_teacher_date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_teacher_date
  ON attendance (teacher_id, date)
  WHERE teacher_id IS NOT NULL;

ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_enrollment_id_date_key;

ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_enrollment_or_teacher_check;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_enrollment_or_teacher_check
  CHECK (
    (enrollment_id IS NOT NULL AND teacher_id IS NULL)
    OR (enrollment_id IS NULL AND teacher_id IS NOT NULL)
    OR (enrollment_id IS NULL AND teacher_id IS NULL)
  );
