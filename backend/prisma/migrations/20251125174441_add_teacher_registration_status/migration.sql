-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "teacher_profiles" ADD COLUMN     "registration_status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING';
