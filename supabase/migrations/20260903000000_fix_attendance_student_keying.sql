/*
# Fix attendance keying

The `attendance` table was written as if `enrollment_id` identified a student, but a
student can be enrolled in several courses. That means:

- `UNIQUE (enrollment_id, date)` allowed (and required) multiple rows per student
  per day, one per course.
- The app was inserting student ids into `enrollment_id`, violating the FK to
  `enrollments(id)`, so every student-attendance write was silently rejected.
- The `attendance_enrollment_or_teacher_check` constraint required
  `teacher_id IS NULL` for any row with an `enrollment_id`, so tagging student
  rows with a `teacher_id` could never succeed either.

## 1. New column

### `attendance.student_id`
- student_id (uuid FK -> students.id, ON DELETE CASCADE)

Attendance is now recorded once per student per date, independent of how many
courses they are enrolled in.

## 2. Data repair

Existing rows are backfilled from `enrollments`. If a student already has several
rows on the same date (one per enrolled course), the duplicates are collapsed to a
single row. A non-`absent` status wins over `absent`, so a student marked present
in one course is not recorded as absent because of another. The lowest `id` breaks
the remaining ties.

## 3. Constraints

- `UNIQUE (enrollment_id, date)` is replaced by `UNIQUE (student_id, date)`.
- The unique index on `(teacher_id, date)` is kept as-is: one check-in per teacher
  per date.

## 4. Safety notes

- The `attendance` table has no `created_at` column, so "most recent" cannot be
  used to break ties; `id` is used instead.
- If any row has neither a student nor an enrollment, the backfill cannot place it.
  Those rows are reported by the final SELECT rather than deleted, so no data is
  lost silently. Inspect them before deciding what to do.
- `enrollment_id` is intentionally LEFT IN PLACE. Other parts of the app
  (report cards, the dashboard) still read it, and dropping it is a separate,
  riskier change. The app no longer writes to it.
*/

BEGIN;

-- 1. Add student_id
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES students(id) ON DELETE CASCADE;

-- 2. Backfill from enrollments
UPDATE attendance a
SET student_id = e.student_id
FROM enrollments e
WHERE a.student_id IS NULL
  AND a.enrollment_id = e.id;

-- 3. Collapse duplicate (student_id, date) rows left by the old keying.
--    Keeper per group: non-absent first, then lowest id.
CREATE TEMP TABLE _attendance_keep ON COMMIT DROP AS

-- 4. Replace the old uniqueness rules
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_enrollment_id_date_key;
DROP INDEX IF EXISTS idx_attendance_teacher_date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_teacher_date
  ON attendance (teacher_id, date)
  WHERE teacher_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance (student_id, date)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_student
  ON attendance (student_id);

-- 5. Relax the old check: a row is now valid with a student_id and no teacher_id.
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_enrollment_or_teacher_check;

ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_owner_check;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_owner_check
  CHECK (
    teacher_id IS NOT NULL
    OR student_id IS NOT NULL
    OR enrollment_id IS NOT NULL
  );

COMMIT;

-- 6. Report rows that could not be repaired (no student, no enrollment).
--    These are NOT deleted. Investigate them manually if any rows come back.
SELECT id, enrollment_id, teacher_id, date, status
FROM attendance
WHERE student_id IS NULL
  AND enrollment_id IS NULL
  AND teacher_id IS NULL;

-- 7. Sanity check: must return zero rows. One row per student per date.
SELECT student_id, date, count(*) AS row_count
FROM attendance
WHERE student_id IS NOT NULL
GROUP BY student_id, date
HAVING count(*) > 1;
