-- Add persistent out-of-order completed lesson ID tracking to enrollments
ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "completed_lesson_ids" JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'enrollments_completed_lesson_ids_array_check'
  ) THEN
    ALTER TABLE "enrollments"
      ADD CONSTRAINT "enrollments_completed_lesson_ids_array_check"
      CHECK (jsonb_typeof("completed_lesson_ids") = 'array');
  END IF;
END $$;
