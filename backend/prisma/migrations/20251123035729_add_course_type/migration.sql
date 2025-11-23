-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('LIVE', 'RECORDED', 'HYBRID');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "course_type" "CourseType" NOT NULL DEFAULT 'RECORDED';
