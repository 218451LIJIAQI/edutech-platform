-- Squashed Prisma baseline migration.
-- This migration creates the complete PostgreSQL schema for the Edutech Platform.
-- The baseline database is intentionally empty: no default rows and no seed data are inserted.
-- Monetary values use NUMERIC for precision, audit/financial records are protected from accidental deletion,
-- and database-level constraints are used to improve data integrity.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('LIVE', 'RECORDED', 'HYBRID');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('LIVE', 'RECORDED', 'HYBRID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('QUALITY_ISSUE', 'INAPPROPRIATE_CONTENT', 'FRAUD', 'TECHNICAL_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'WALLET', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('LOGIN_MODAL');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdDestinationType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AdTheme" AS ENUM ('MIDNIGHT', 'SUNSET', 'AURORA', 'OCEAN', 'FOREST', 'ROSE');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletTransactionSource" AS ENUM ('COURSE_SALE', 'REFUND', 'REVERSAL', 'ADMIN_ADJUSTMENT', 'PAYOUT');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('BANK_TRANSFER', 'GRABPAY', 'TOUCH_N_GO', 'PAYPAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "address" TEXT,
    "department" TEXT,
    "last_login_at" TIMESTAMP(3),
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_until" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "badge" TEXT,
    "description" TEXT NOT NULL,
    "supporting_text" TEXT,
    "sponsor_name" TEXT,
    "image_url" TEXT,
    "cta_label" TEXT NOT NULL,
    "cta_url" TEXT NOT NULL,
    "destination_type" "AdDestinationType" NOT NULL DEFAULT 'INTERNAL',
    "open_in_new_tab" BOOLEAN NOT NULL DEFAULT false,
    "placement" "AdPlacement" NOT NULL DEFAULT 'LOGIN_MODAL',
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "theme" "AdTheme" NOT NULL DEFAULT 'MIDNIGHT',
    "target_roles" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[],
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "headline" TEXT,
    "hourly_rate" NUMERIC(10,2),
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "average_rating" NUMERIC(3,2) NOT NULL DEFAULT 0,
    "total_earnings" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "commission_rate" NUMERIC(5,2),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "registration_status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "self_introduction" TEXT,
    "education_background" TEXT,
    "teaching_experience" TEXT,
    "awards" TEXT,
    "specialties" TEXT,
    "teaching_style" TEXT,
    "languages" TEXT,
    "years_of_experience" INTEGER,
    "profile_photo" TEXT,
    "certificate_photos" TEXT,
    "profile_completion_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "profile_submitted_at" TIMESTAMP(3),
    "profile_reviewed_at" TIMESTAMP(3),
    "profile_review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_verifications" (
    "id" TEXT NOT NULL,
    "teacher_profile_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "teacher_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profile_submissions" (
    "id" TEXT NOT NULL,
    "teacher_profile_id" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "payload" JSONB,

    CONSTRAINT "teacher_profile_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "teacher_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "credential_id" TEXT,
    "credential_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "teacher_profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "course_type" "CourseType" NOT NULL DEFAULT 'RECORDED',
    "thumbnail" TEXT,
    "preview_video_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "LessonType" NOT NULL,
    "duration" INTEGER,
    "video_url" TEXT,
    "quiz" JSONB,
    "order_index" INTEGER NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "score_percentage" INTEGER NOT NULL,
    "correct_answers" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_packages" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" NUMERIC(10,2) NOT NULL,
    "discount" NUMERIC(10,2) DEFAULT 0,
    "final_price" NUMERIC(10,2) NOT NULL,
    "duration" INTEGER,
    "max_students" INTEGER,
    "features" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed_lessons" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT,
    "order_id" TEXT,
    "amount" NUMERIC(10,2) NOT NULL,
    "platform_commission" NUMERIC(10,2) NOT NULL,
    "teacher_earning" NUMERIC(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" NUMERIC(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refund_amount" NUMERIC(10,2),
    "refund_reason" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "price" NUMERIC(10,2) NOT NULL,
    "discount" NUMERIC(10,2) DEFAULT 0,
    "final_price" NUMERIC(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" NUMERIC(10,2) NOT NULL,
    "reason" TEXT,
    "reason_category" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "refund_method" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
    "bank_details" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticket_no" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "is_downloadable" BOOLEAN NOT NULL DEFAULT true,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "meeting_url" TEXT,
    "room_id" TEXT,
    "max_participants" INTEGER,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "recording_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "community_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "course_id" TEXT,
    "course_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_tags" (
    "post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "community_post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "community_media" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "community_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_bookmarks" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "community_post_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_following" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,

    CONSTRAINT "community_following_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "participant_ids" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_balance" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "pending_payout" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount" NUMERIC(10,2) NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "source" "WalletTransactionSource" NOT NULL,
    "reference_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_methods" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "PayoutMethodType" NOT NULL,
    "label" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "method_id" TEXT,
    "amount" NUMERIC(10,2) NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "admin_note" TEXT,
    "external_reference" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ThreadParticipants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE INDEX "password_reset_codes_user_id_consumed_at_created_at_idx" ON "password_reset_codes"("user_id", "consumed_at", "created_at");

-- CreateIndex
CREATE INDEX "password_reset_codes_expires_at_idx" ON "password_reset_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_codes_single_active_per_user_key"
ON "password_reset_codes"("user_id")
WHERE "consumed_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_name_key" ON "ad_campaigns"("name");

-- CreateIndex
CREATE INDEX "ad_campaigns_placement_status_display_order_idx" ON "ad_campaigns"("placement", "status", "display_order");

-- CreateIndex
CREATE INDEX "ad_campaigns_starts_at_ends_at_idx" ON "ad_campaigns"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "user_audit_logs_user_id_idx" ON "user_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_audit_logs_admin_id_idx" ON "user_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "user_audit_logs_created_at_idx" ON "user_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "user_audit_logs_action_idx" ON "user_audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_user_id_key" ON "teacher_profiles"("user_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_lesson_id_idx" ON "quiz_attempts"("lesson_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_student_id_idx" ON "quiz_attempts"("student_id");

-- CreateIndex
CREATE INDEX "quiz_attempts_submitted_at_idx" ON "quiz_attempts"("submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_package_id_key" ON "enrollments"("user_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_user_id_package_id_key" ON "cart_items"("user_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_package_id_key" ON "order_items"("order_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_no_key" ON "support_tickets"("ticket_no");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_enrollment_id_key" ON "reviews"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "live_sessions_room_id_key" ON "live_sessions"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_tags_name_key" ON "community_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_likes_post_id_user_id_key" ON "community_post_likes"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_bookmarks_post_id_user_id_key" ON "community_post_bookmarks"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_following_follower_id_following_id_key" ON "community_following"("follower_id", "following_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "payout_methods_wallet_id_idx" ON "payout_methods"("wallet_id");

-- CreateIndex
CREATE INDEX "payout_methods_wallet_id_is_default_created_at_idx" ON "payout_methods"("wallet_id", "is_default", "created_at");

-- CreateIndex
CREATE INDEX "payout_requests_wallet_id_status_idx" ON "payout_requests"("wallet_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "_ThreadParticipants_AB_unique" ON "_ThreadParticipants"("A", "B");

-- CreateIndex
CREATE INDEX "_ThreadParticipants_B_index" ON "_ThreadParticipants"("B");

-- CreateIndex
CREATE UNIQUE INDEX "message_threads_participant_ids_key" ON "message_threads"("participant_ids");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_wallet_id_source_reference_id_key"
ON "wallet_transactions"("wallet_id", "source", "reference_id")
WHERE "reference_id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "payout_methods_single_default_per_wallet_key"
ON "payout_methods"("wallet_id")
WHERE "is_default" = true;

-- CreateIndex
CREATE UNIQUE INDEX "refunds_single_active_refund_per_order_key"
ON "refunds"("order_id")
WHERE "status" IN ('PENDING', 'APPROVED', 'PROCESSING');

-- AddCheckConstraint
ALTER TABLE "users"
ADD CONSTRAINT "users_login_count_nonnegative_check"
CHECK ("login_count" >= 0);

-- AddCheckConstraint
ALTER TABLE "password_reset_codes"
ADD CONSTRAINT "password_reset_codes_attempts_nonnegative_check"
CHECK ("attempts" >= 0);

-- AddCheckConstraint
ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_hourly_rate_nonnegative_check"
CHECK ("hourly_rate" IS NULL OR "hourly_rate" >= 0);

-- AddCheckConstraint
ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_total_students_nonnegative_check"
CHECK ("total_students" >= 0);

-- AddCheckConstraint
ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_average_rating_range_check"
CHECK ("average_rating" >= 0 AND "average_rating" <= 5);

-- AddCheckConstraint
ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_total_earnings_nonnegative_check"
CHECK ("total_earnings" >= 0);

-- AddCheckConstraint
ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_commission_rate_range_check"
CHECK ("commission_rate" IS NULL OR ("commission_rate" >= 0 AND "commission_rate" <= 100));

-- AddCheckConstraint
ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_years_of_experience_nonnegative_check"
CHECK ("years_of_experience" IS NULL OR "years_of_experience" >= 0);

-- AddCheckConstraint
ALTER TABLE "users"
ADD CONSTRAINT "users_failed_login_attempts_nonnegative_check"
CHECK ("failed_login_attempts" >= 0);

-- AddCheckConstraint
ALTER TABLE "users"
ADD CONSTRAINT "users_token_version_nonnegative_check"
CHECK ("token_version" >= 0);

-- AddCheckConstraint
ALTER TABLE "ad_campaigns"
ADD CONSTRAINT "ad_campaigns_display_order_nonnegative_check"
CHECK ("display_order" >= 0);

-- AddCheckConstraint
ALTER TABLE "ad_campaigns"
ADD CONSTRAINT "ad_campaigns_schedule_window_check"
CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "starts_at" <= "ends_at");

-- AddCheckConstraint
ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_score_percentage_range_check"
CHECK ("score_percentage" >= 0 AND "score_percentage" <= 100);

-- AddCheckConstraint
ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_correct_answers_nonnegative_check"
CHECK ("correct_answers" >= 0);

-- AddCheckConstraint
ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_total_questions_nonnegative_check"
CHECK ("total_questions" >= 0);

-- AddCheckConstraint
ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_correct_answers_within_total_check"
CHECK ("correct_answers" <= "total_questions");

-- AddCheckConstraint
ALTER TABLE "lessons"
ADD CONSTRAINT "lessons_order_index_positive_check"
CHECK ("order_index" > 0);

-- AddCheckConstraint
ALTER TABLE "lessons"
ADD CONSTRAINT "lessons_duration_positive_check"
CHECK ("duration" IS NULL OR "duration" > 0);

-- AddCheckConstraint
ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_price_nonnegative_check"
CHECK ("price" >= 0);

-- AddCheckConstraint
ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_discount_nonnegative_check"
CHECK ("discount" IS NULL OR "discount" >= 0);

-- AddCheckConstraint
ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_final_price_nonnegative_check"
CHECK ("final_price" >= 0);

-- AddCheckConstraint
ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_duration_positive_check"
CHECK ("duration" IS NULL OR "duration" > 0);

-- AddCheckConstraint
ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_max_students_positive_check"
CHECK ("max_students" IS NULL OR "max_students" > 0);

-- AddCheckConstraint
ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_final_price_not_above_price_check"
CHECK ("final_price" <= "price");

-- AddCheckConstraint
ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_progress_range_check"
CHECK ("progress" >= 0 AND "progress" <= 100);

-- AddCheckConstraint
ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_completed_lessons_nonnegative_check"
CHECK ("completed_lessons" >= 0);

-- AddCheckConstraint
ALTER TABLE "payments"
ADD CONSTRAINT "payments_amount_nonnegative_check"
CHECK ("amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "payments"
ADD CONSTRAINT "payments_platform_commission_nonnegative_check"
CHECK ("platform_commission" >= 0);

-- AddCheckConstraint
ALTER TABLE "payments"
ADD CONSTRAINT "payments_teacher_earning_nonnegative_check"
CHECK ("teacher_earning" >= 0);

-- AddCheckConstraint
ALTER TABLE "payments"
ADD CONSTRAINT "payments_purchase_target_check"
CHECK (
  ("package_id" IS NOT NULL AND "order_id" IS NULL)
  OR ("package_id" IS NULL AND "order_id" IS NOT NULL)
);

-- AddCheckConstraint
ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_quantity_positive_check"
CHECK ("quantity" > 0);

-- AddCheckConstraint
ALTER TABLE "orders"
ADD CONSTRAINT "orders_total_amount_nonnegative_check"
CHECK ("totalAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "orders"
ADD CONSTRAINT "orders_refund_amount_nonnegative_check"
CHECK ("refund_amount" IS NULL OR "refund_amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "orders"
ADD CONSTRAINT "orders_refund_amount_within_total_check"
CHECK ("refund_amount" IS NULL OR "refund_amount" <= "totalAmount");

-- AddCheckConstraint
ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_price_nonnegative_check"
CHECK ("price" >= 0);

-- AddCheckConstraint
ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_discount_nonnegative_check"
CHECK ("discount" IS NULL OR "discount" >= 0);

-- AddCheckConstraint
ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_final_price_nonnegative_check"
CHECK ("final_price" >= 0);

-- AddCheckConstraint
ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_final_price_not_above_price_check"
CHECK ("final_price" <= "price");

-- AddCheckConstraint
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_amount_nonnegative_check"
CHECK ("amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_processed_after_created_check"
CHECK ("processed_at" IS NULL OR "processed_at" >= "created_at");

-- AddCheckConstraint
ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_completed_after_processed_check"
CHECK (
  "completed_at" IS NULL
  OR "completed_at" >= COALESCE("processed_at", "created_at")
);

-- AddCheckConstraint
ALTER TABLE "support_tickets"
ADD CONSTRAINT "support_tickets_resolved_after_created_check"
CHECK ("resolved_at" IS NULL OR "resolved_at" >= "created_at");

-- AddCheckConstraint
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_rating_range_check"
CHECK ("rating" >= 1 AND "rating" <= 5);

-- AddCheckConstraint
ALTER TABLE "materials"
ADD CONSTRAINT "materials_file_size_nonnegative_check"
CHECK ("file_size" >= 0);

-- AddCheckConstraint
ALTER TABLE "community_posts"
ADD CONSTRAINT "community_posts_likes_nonnegative_check"
CHECK ("likes" >= 0);

-- AddCheckConstraint
ALTER TABLE "community_posts"
ADD CONSTRAINT "community_posts_bookmarks_nonnegative_check"
CHECK ("bookmarks" >= 0);

-- AddCheckConstraint
ALTER TABLE "community_posts"
ADD CONSTRAINT "community_posts_comments_count_nonnegative_check"
CHECK ("comments_count" >= 0);

-- AddCheckConstraint
ALTER TABLE "wallets"
ADD CONSTRAINT "wallets_available_balance_nonnegative_check"
CHECK ("available_balance" >= 0);

-- AddCheckConstraint
ALTER TABLE "wallets"
ADD CONSTRAINT "wallets_pending_payout_nonnegative_check"
CHECK ("pending_payout" >= 0);

-- AddCheckConstraint
ALTER TABLE "wallet_transactions"
ADD CONSTRAINT "wallet_transactions_amount_positive_check"
CHECK ("amount" > 0);

-- AddCheckConstraint
ALTER TABLE "messages"
ADD CONSTRAINT "messages_read_at_after_created_check"
CHECK ("read_at" IS NULL OR "read_at" >= "created_at");

-- AddCheckConstraint
ALTER TABLE "payout_requests"
ADD CONSTRAINT "payout_requests_amount_positive_check"
CHECK ("amount" > 0);

-- AddCheckConstraint
ALTER TABLE "payout_requests"
ADD CONSTRAINT "payout_requests_processed_after_requested_check"
CHECK ("processed_at" IS NULL OR "processed_at" >= "requested_at");


-- Additional professional data-integrity constraints

ALTER TABLE "lesson_packages"
ADD CONSTRAINT "lesson_packages_discount_not_above_price_check"
CHECK ("discount" IS NULL OR "discount" <= "price");

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_discount_not_above_price_check"
CHECK ("discount" IS NULL OR "discount" <= "price");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_amount_split_check"
CHECK ("amount" = "platform_commission" + "teacher_earning");

ALTER TABLE "live_sessions"
ADD CONSTRAINT "live_sessions_max_participants_positive_check"
CHECK ("max_participants" IS NULL OR "max_participants" > 0);

ALTER TABLE "live_sessions"
ADD CONSTRAINT "live_sessions_duration_positive_check"
CHECK ("duration" IS NULL OR "duration" > 0);

ALTER TABLE "certifications"
ADD CONSTRAINT "certifications_expiry_after_issue_check"
CHECK ("expiry_date" IS NULL OR "expiry_date" >= "issue_date");

ALTER TABLE "teacher_profiles"
ADD CONSTRAINT "teacher_profiles_reviewed_after_submitted_check"
CHECK (
  "profile_reviewed_at" IS NULL
  OR "profile_submitted_at" IS NULL
  OR "profile_reviewed_at" >= "profile_submitted_at"
);

ALTER TABLE "teacher_verifications"
ADD CONSTRAINT "teacher_verifications_reviewed_after_submitted_check"
CHECK ("reviewed_at" IS NULL OR "reviewed_at" >= "submitted_at");

ALTER TABLE "teacher_profile_submissions"
ADD CONSTRAINT "teacher_profile_submissions_reviewed_after_submitted_check"
CHECK ("reviewed_at" IS NULL OR "reviewed_at" >= "submitted_at");

ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_expires_after_enrolled_check"
CHECK ("expires_at" IS NULL OR "expires_at" >= "enrolled_at");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_paid_after_created_check"
CHECK ("paid_at" IS NULL OR "paid_at" >= "created_at");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_paid_after_created_check"
CHECK ("paid_at" IS NULL OR "paid_at" >= "created_at");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_canceled_after_created_check"
CHECK ("canceled_at" IS NULL OR "canceled_at" >= "created_at");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_refunded_after_created_check"
CHECK ("refunded_at" IS NULL OR "refunded_at" >= "created_at");

ALTER TABLE "live_sessions"
ADD CONSTRAINT "live_sessions_ended_after_started_check"
CHECK (
  "ended_at" IS NULL
  OR "started_at" IS NULL
  OR "ended_at" >= "started_at"
);


-- Additional lifecycle and relationship integrity constraints

ALTER TABLE "password_reset_codes"
ADD CONSTRAINT "password_reset_codes_expires_after_created_check"
CHECK ("expires_at" > "created_at");

ALTER TABLE "password_reset_codes"
ADD CONSTRAINT "password_reset_codes_verified_after_created_check"
CHECK ("verified_at" IS NULL OR "verified_at" >= "created_at");

ALTER TABLE "password_reset_codes"
ADD CONSTRAINT "password_reset_codes_consumed_after_verified_check"
CHECK (
  "consumed_at" IS NULL
  OR ("verified_at" IS NOT NULL AND "consumed_at" >= "verified_at")
);

ALTER TABLE "payments"
ADD CONSTRAINT "payments_completed_requires_paid_at_check"
CHECK ("status" <> 'COMPLETED' OR "paid_at" IS NOT NULL);

ALTER TABLE "payments"
ADD CONSTRAINT "payments_refunded_requires_paid_at_check"
CHECK ("status" <> 'REFUNDED' OR "paid_at" IS NOT NULL);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_paid_requires_paid_at_check"
CHECK ("status" <> 'PAID' OR "paid_at" IS NOT NULL);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_cancelled_requires_canceled_at_check"
CHECK ("status" <> 'CANCELLED' OR "canceled_at" IS NOT NULL);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_refunded_requires_refund_details_check"
CHECK (
  "status" <> 'REFUNDED'
  OR ("refunded_at" IS NOT NULL AND "refund_amount" IS NOT NULL)
);

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_processing_requires_processed_at_check"
CHECK (
  "status" NOT IN ('PROCESSING', 'COMPLETED')
  OR "processed_at" IS NOT NULL
);

ALTER TABLE "refunds"
ADD CONSTRAINT "refunds_completed_requires_completed_at_check"
CHECK ("status" <> 'COMPLETED' OR "completed_at" IS NOT NULL);

ALTER TABLE "reports"
ADD CONSTRAINT "reports_no_self_report_check"
CHECK ("reporter_id" <> "reported_id");

ALTER TABLE "community_following"
ADD CONSTRAINT "community_following_no_self_follow_check"
CHECK ("follower_id" <> "following_id");

ALTER TABLE "message_threads"
ADD CONSTRAINT "message_threads_participant_ids_not_empty_check"
CHECK (length(trim("participant_ids")) > 0);

-- CreateIndex
CREATE INDEX "teacher_profiles_registration_status_is_verified_average_rating_idx" ON "teacher_profiles"("registration_status", "is_verified", "average_rating");

-- CreateIndex
CREATE INDEX "teacher_profiles_verification_status_profile_submitted_at_idx" ON "teacher_profiles"("verification_status", "profile_submitted_at");

-- CreateIndex
CREATE INDEX "teacher_verifications_teacher_profile_id_idx" ON "teacher_verifications"("teacher_profile_id");

-- CreateIndex
CREATE INDEX "teacher_verifications_status_submitted_at_idx" ON "teacher_verifications"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "teacher_profile_submissions_teacher_profile_id_idx" ON "teacher_profile_submissions"("teacher_profile_id");

-- CreateIndex
CREATE INDEX "teacher_profile_submissions_status_submitted_at_idx" ON "teacher_profile_submissions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "certifications_teacher_profile_id_idx" ON "certifications"("teacher_profile_id");

-- CreateIndex
CREATE INDEX "courses_teacher_profile_id_idx" ON "courses"("teacher_profile_id");

-- CreateIndex
CREATE INDEX "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX "courses_course_type_is_published_idx" ON "courses"("course_type", "is_published");

-- CreateIndex
CREATE INDEX "courses_created_at_idx" ON "courses"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_course_id_order_index_key" ON "lessons"("course_id", "order_index");

-- CreateIndex
CREATE INDEX "lesson_packages_course_id_is_active_idx" ON "lesson_packages"("course_id", "is_active");

-- CreateIndex
CREATE INDEX "lesson_packages_final_price_idx" ON "lesson_packages"("final_price");

-- CreateIndex
CREATE INDEX "enrollments_package_id_idx" ON "enrollments"("package_id");

-- CreateIndex
CREATE INDEX "enrollments_user_id_is_active_expires_at_idx" ON "enrollments"("user_id", "is_active", "expires_at");

-- CreateIndex
CREATE INDEX "payments_user_id_status_created_at_idx" ON "payments"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "payments_package_id_idx" ON "payments"("package_id");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_paid_at_idx" ON "orders"("paid_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_package_id_idx" ON "order_items"("package_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_status_created_at_idx" ON "refunds"("status", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_order_id_idx" ON "support_tickets"("order_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_updated_at_idx" ON "support_tickets"("status", "updated_at");

-- CreateIndex
CREATE INDEX "support_tickets_priority_created_at_idx" ON "support_tickets"("priority", "created_at");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticket_id_created_at_idx" ON "support_ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "support_ticket_messages_sender_id_created_at_idx" ON "support_ticket_messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "reviews_teacher_id_idx" ON "reviews"("teacher_id");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_reported_id_idx" ON "reports"("reported_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "materials_course_id_idx" ON "materials"("course_id");

-- CreateIndex
CREATE INDEX "materials_uploaded_at_idx" ON "materials"("uploaded_at");

-- CreateIndex
CREATE INDEX "live_sessions_lesson_id_idx" ON "live_sessions"("lesson_id");

-- CreateIndex
CREATE INDEX "live_sessions_status_scheduled_at_idx" ON "live_sessions"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "community_posts_author_id_created_at_idx" ON "community_posts"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "community_posts_course_id_idx" ON "community_posts"("course_id");

-- CreateIndex
CREATE INDEX "community_posts_created_at_idx" ON "community_posts"("created_at");

-- CreateIndex
CREATE INDEX "community_post_tags_tag_id_idx" ON "community_post_tags"("tag_id");

-- CreateIndex
CREATE INDEX "community_media_post_id_idx" ON "community_media"("post_id");

-- CreateIndex
CREATE INDEX "community_comments_post_id_created_at_idx" ON "community_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "community_comments_author_id_idx" ON "community_comments"("author_id");

-- CreateIndex
CREATE INDEX "community_post_likes_user_id_idx" ON "community_post_likes"("user_id");

-- CreateIndex
CREATE INDEX "community_post_bookmarks_user_id_idx" ON "community_post_bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "community_following_following_id_idx" ON "community_following"("following_id");

-- CreateIndex
CREATE INDEX "message_threads_updated_at_idx" ON "message_threads"("updated_at");

-- CreateIndex
CREATE INDEX "messages_thread_id_created_at_idx" ON "messages"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "payout_requests_method_id_idx" ON "payout_requests"("method_id");

-- CreateIndex
CREATE INDEX "payout_requests_requested_at_idx" ON "payout_requests"("requested_at");


-- Additional indexes for nullable foreign-key fields
CREATE INDEX "users_created_by_idx" ON "users"("created_by");
CREATE INDEX "users_updated_by_idx" ON "users"("updated_by");
CREATE INDEX "ad_campaigns_created_by_idx" ON "ad_campaigns"("created_by");
CREATE INDEX "ad_campaigns_updated_by_idx" ON "ad_campaigns"("updated_by");
CREATE INDEX "teacher_verifications_reviewed_by_idx" ON "teacher_verifications"("reviewed_by");
CREATE INDEX "teacher_profile_submissions_reviewed_by_idx" ON "teacher_profile_submissions"("reviewed_by");
CREATE INDEX "support_tickets_assigned_to_idx" ON "support_tickets"("assigned_to");

-- AddForeignKey
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Additional foreign keys for nullable administrative/reviewer fields
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_verifications" ADD CONSTRAINT "teacher_verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_profile_submissions" ADD CONSTRAINT "teacher_profile_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_verifications" ADD CONSTRAINT "teacher_verifications_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_profile_submissions" ADD CONSTRAINT "teacher_profile_submissions_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_packages" ADD CONSTRAINT "lesson_packages_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "lesson_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "lesson_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "lesson_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "lesson_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_tags" ADD CONSTRAINT "community_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_tags" ADD CONSTRAINT "community_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "community_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_media" ADD CONSTRAINT "community_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_bookmarks" ADD CONSTRAINT "community_post_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_bookmarks" ADD CONSTRAINT "community_post_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_following" ADD CONSTRAINT "community_following_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_following" ADD CONSTRAINT "community_following_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "payout_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ThreadParticipants" ADD CONSTRAINT "_ThreadParticipants_A_fkey" FOREIGN KEY ("A") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ThreadParticipants" ADD CONSTRAINT "_ThreadParticipants_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Automatically maintain updated_at columns for direct SQL updates.
-- Prisma also manages @updatedAt at application level, but these triggers keep the database consistent
-- when rows are updated outside Prisma.

CREATE OR REPLACE FUNCTION "set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "users_set_updated_at"
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "ad_campaigns_set_updated_at"
BEFORE UPDATE ON "ad_campaigns"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "teacher_profiles_set_updated_at"
BEFORE UPDATE ON "teacher_profiles"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "courses_set_updated_at"
BEFORE UPDATE ON "courses"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "lessons_set_updated_at"
BEFORE UPDATE ON "lessons"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "lesson_packages_set_updated_at"
BEFORE UPDATE ON "lesson_packages"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "support_tickets_set_updated_at"
BEFORE UPDATE ON "support_tickets"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "reviews_set_updated_at"
BEFORE UPDATE ON "reviews"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "community_posts_set_updated_at"
BEFORE UPDATE ON "community_posts"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "message_threads_set_updated_at"
BEFORE UPDATE ON "message_threads"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

CREATE TRIGGER "wallets_set_updated_at"
BEFORE UPDATE ON "wallets"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

