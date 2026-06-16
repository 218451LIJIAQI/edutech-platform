DO $$ BEGIN
  CREATE TYPE "VerificationMethod" AS ENUM ('MANUAL', 'AUTO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "teacher_verifications"
  ADD COLUMN IF NOT EXISTS "verification_method" "VerificationMethod" NOT NULL DEFAULT 'MANUAL';
