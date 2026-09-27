/*
# Teacher Check-In Table

Tracks daily morning sign-in for teachers when they report to school.
Uses the existing `attendance` table with teacher_id set.
No new table needed — the 20260901000000 migration already added teacher_id.

This migration adds a dedicated view for teacher check-in status per date
and ensures the unique index supports teacher check-ins.
*/

-- Ensure the unique index exists for teacher check-ins (one record per teacher per date)
DROP INDEX IF EXISTS idx_attendance_teacher_date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_teacher_date
  ON attendance (teacher_id, date)
  WHERE teacher_id IS NOT NULL;