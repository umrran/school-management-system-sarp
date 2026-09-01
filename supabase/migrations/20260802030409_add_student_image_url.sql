/*
# Add image_url to students

1. Modified Tables
- `students` — add `image_url` (text, nullable) to store the public URL of a student's photo.

2. Security
- No policy changes needed (existing CRUD policies cover the new column).
*/

ALTER TABLE students ADD COLUMN IF NOT EXISTS image_url text;
