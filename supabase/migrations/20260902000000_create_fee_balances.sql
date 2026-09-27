/*
# Fee Balances Schema

Tracks each student's outstanding fee balance. When a fee payment is recorded,
the balance is reduced. Fees can be assessed (added) manually by admin.

## 1. New Tables

### `student_fee_balances`
One row per student, holding their current outstanding balance.
- id (uuid, PK)
- student_id (uuid FK -> students.id, ON DELETE CASCADE)
- total_owed (numeric) — total fees assessed to date
- total_paid (numeric) — total payments made to date
- balance (numeric) — outstanding = total_owed - total_paid
- last_updated_at (timestamptz)

## 2. Security
- RLS enabled, open to anon + authenticated (single-tenant app).
*/

CREATE TABLE IF NOT EXISTS student_fee_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_owed numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  last_updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_balances_student ON student_fee_balances(student_id);

ALTER TABLE student_fee_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fee_balances" ON student_fee_balances;
CREATE POLICY "anon_select_fee_balances" ON student_fee_balances FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fee_balances" ON student_fee_balances;
CREATE POLICY "anon_insert_fee_balances" ON student_fee_balances FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fee_balances" ON student_fee_balances;
CREATE POLICY "anon_update_fee_balances" ON student_fee_balances FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);