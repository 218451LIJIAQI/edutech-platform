-- AlterTable
ALTER TABLE "teacher_profiles" ADD COLUMN     "awards" TEXT,
ADD COLUMN     "certificate_photos" TEXT,
ADD COLUMN     "education_background" TEXT,
ADD COLUMN     "languages" TEXT,
ADD COLUMN     "profile_completion_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
ADD COLUMN     "profile_photo" TEXT,
ADD COLUMN     "profile_review_notes" TEXT,
ADD COLUMN     "profile_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "profile_submitted_at" TIMESTAMP(3),
ADD COLUMN     "self_introduction" TEXT,
ADD COLUMN     "specialties" TEXT,
ADD COLUMN     "teaching_experience" TEXT,
ADD COLUMN     "teaching_style" TEXT,
ADD COLUMN     "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "years_of_experience" INTEGER;

-- CreateTable
CREATE TABLE "teacher_profile_submissions" (
    "id" TEXT NOT NULL,
    "teacher_profile_id" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,

    CONSTRAINT "teacher_profile_submissions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "teacher_profile_submissions" ADD CONSTRAINT "teacher_profile_submissions_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
