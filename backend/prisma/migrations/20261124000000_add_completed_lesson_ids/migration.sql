-- AlterTable: Persist exact completed lesson ID sets on enrollments (idempotent)
ALTER TABLE "enrollments"
ADD COLUMN IF NOT EXISTS "completed_lesson_ids" JSONB NOT NULL DEFAULT '[]'::jsonb;
