/*
# Fees & Receipts Schema

Adds fee payment tracking and receipt generation for students.

## 1. New Tables

### `fee_payments`
Records a single fee payment made by or for a student.
- id (uuid, PK)
- receipt_no (text, unique) — formatted as RCP-YYYY-NNN, auto-assigned
- student_id (uuid FK -> students.id, nullable — manual entry allowed)
- student_name (text) — full name as it appears on receipt
- class_form (text) — e.g. "BS 1"
- amount (numeric) — amount paid
- amount_in_words (text) — auto-generated or overridable
- payment_type (text) — 'monthly' | 'yearly' | 'termly' | 'other'
- payment_method (text) — 'cash' | 'online' | 'cheque'
- payment_date (date)
- term (text) — which term the fee is for
- academic_year (text)
- notes (text)
- created_at (timestamptz)

### `receipt_counter`
Single-row table that tracks the running receipt number per year.
- year (int, PK)
- last_seq (int) — last issued sequence number

## 2. Security
- RLS enabled, open to anon + authenticated (single-tenant app).
*/

CREATE TABLE IF NOT EXISTS fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text UNIQUE NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  student_name text NOT NULL DEFAULT '',
  class_form text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  amount_in_words text NOT NULL DEFAULT '',
  payment_type text NOT NULL DEFAULT 'termly',
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  term text NOT NULL DEFAULT 'First Term',
  academic_year text NOT NULL DEFAULT '2024',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_counter (
  year int PRIMARY KEY,
  last_seq int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_year ON fee_payments(academic_year);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_counter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fee_payments" ON fee_payments;
CREATE POLICY "anon_select_fee_payments" ON fee_payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fee_payments" ON fee_payments;
CREATE POLICY "anon_insert_fee_payments" ON fee_payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fee_payments" ON fee_payments;
CREATE POLICY "anon_update_fee_payments" ON fee_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fee_payments" ON fee_payments;
CREATE POLICY "anon_delete_fee_payments" ON fee_payments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_receipt_counter" ON receipt_counter;
CREATE POLICY "anon_select_receipt_counter" ON receipt_counter FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_receipt_counter" ON receipt_counter;
CREATE POLICY "anon_insert_receipt_counter" ON receipt_counter FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_receipt_counter" ON receipt_counter;
CREATE POLICY "anon_update_receipt_counter" ON receipt_counter FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
