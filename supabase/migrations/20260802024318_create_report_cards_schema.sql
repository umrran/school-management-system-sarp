/*
# Report Cards Schema

Creates tables for terminal report cards modeled after the SARP EDUCATIONAL COMPLEX
Terminal Report Sheet format.

## 1. New Tables

### `report_cards`
Stores the header/metadata for one student's report card for a given term.
- id (uuid, PK)
- student_id (uuid FK -> students.id)
- pupil_name (text) — full name as printed
- class_form (text) — e.g. "BS 1"
- term (text) — "First Term", "Second Term", "Third Term"
- academic_year (text) — e.g. "2024"
- vacation_date (text)
- reopening_date (text)
- next_term_fees (text)
- fees_in_arrears (text)
- total_fees_due (text)
- no_on_roll (int)
- days_out (int)
- repeated (boolean)
- promoted_to (text)
- overall_grade (text)
- attendance (int)
- conduct (text)
- interest (text)
- teachers_remarks (text)
- headmaster_remarks (text)
- position (int) — calculated rank within class+term
- created_at (timestamptz)

### `report_card_subjects`
Stores per-subject scores for one report card.
- id (uuid, PK)
- report_card_id (uuid FK -> report_cards.id, CASCADE)
- subject_name (text)
- class_score (numeric) — out of 50
- exam_score (numeric) — out of 50
- total (numeric, computed = class_score + exam_score)
- grade (int) — computed from grading system
- grade_label (text) — e.g. "Excellent", "Good"
- teacher_remarks (text)
- sort_order (int)

## 2. Security
- RLS enabled, anon + authenticated CRUD (single-tenant app).
*/

CREATE TABLE IF NOT EXISTS report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  pupil_name text NOT NULL,
  class_form text NOT NULL DEFAULT '',
  term text NOT NULL DEFAULT 'First Term',
  academic_year text NOT NULL DEFAULT '2024',
  vacation_date text NOT NULL DEFAULT '',
  reopening_date text NOT NULL DEFAULT '',
  next_term_fees text NOT NULL DEFAULT 'GH¢0.00',
  fees_in_arrears text NOT NULL DEFAULT 'GH¢0.00',
  total_fees_due text NOT NULL DEFAULT '0',
  no_on_roll int NOT NULL DEFAULT 0,
  days_out int NOT NULL DEFAULT 0,
  repeated boolean NOT NULL DEFAULT false,
  promoted_to text NOT NULL DEFAULT '',
  overall_grade text NOT NULL DEFAULT '',
  attendance int NOT NULL DEFAULT 0,
  conduct text NOT NULL DEFAULT '',
  interest text NOT NULL DEFAULT '',
  teachers_remarks text NOT NULL DEFAULT '',
  headmaster_remarks text NOT NULL DEFAULT '',
  header_image_url text,
  position int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_card_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id uuid NOT NULL REFERENCES report_cards(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  class_score numeric NOT NULL DEFAULT 0,
  exam_score numeric NOT NULL DEFAULT 0,
  total numeric GENERATED ALWAYS AS (class_score + exam_score) STORED,
  grade int NOT NULL DEFAULT 9,
  grade_label text NOT NULL DEFAULT 'Fail',
  teacher_remarks text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_report_cards_student ON report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_class_term ON report_cards(class_form, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_report_card_subjects_card ON report_card_subjects(report_card_id);

ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_card_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_report_cards" ON report_cards;
CREATE POLICY "anon_select_report_cards" ON report_cards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_report_cards" ON report_cards;
CREATE POLICY "anon_insert_report_cards" ON report_cards FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_report_cards" ON report_cards;
CREATE POLICY "anon_update_report_cards" ON report_cards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_report_cards" ON report_cards;
CREATE POLICY "anon_delete_report_cards" ON report_cards FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_rc_subjects" ON report_card_subjects;
CREATE POLICY "anon_select_rc_subjects" ON report_card_subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_rc_subjects" ON report_card_subjects;
CREATE POLICY "anon_insert_rc_subjects" ON report_card_subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_rc_subjects" ON report_card_subjects;
CREATE POLICY "anon_update_rc_subjects" ON report_card_subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_rc_subjects" ON report_card_subjects;
CREATE POLICY "anon_delete_rc_subjects" ON report_card_subjects FOR DELETE TO anon, authenticated USING (true);
