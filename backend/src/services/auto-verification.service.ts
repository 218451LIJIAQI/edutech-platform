import {
  VerificationStatus,
  VerificationMethod,
  type TeacherVerification,
} from "@prisma/client";
import prisma from "../config/database";
import logger from "../utils/logger";
import { createTeacherNotification } from "./teacher/teacher-service-helpers";

// ================================
// ACCEPTED DOCUMENT TYPES
// ================================

const ACCEPTED_DOCUMENT_TYPES = new Set([
  "teaching license",
  "teaching certificate",
  "degree certificate",
  "professional certification",
  "bachelor degree",
  "master degree",
  "phd certificate",
  "diploma",
  "tesol",
  "tefl",
  "celta",
  "pgce",
  "education certificate",
  "teacher qualification",
  "teaching diploma",
  "instructor certification",
  "training certificate",
  "accreditation",
]);

const VALID_DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".doc",
  ".docx",
]);

// ================================
// AUTO-VERIFICATION RULES
// ================================

interface VerificationCheckResult {
  passed: boolean;
  reason?: string;
}

const checkDocumentTypeAccepted = (
  documentType: string,
): VerificationCheckResult => {
  const normalizedType = documentType
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalizedType) {
    return { passed: false, reason: "Document type is empty" };
  }

  const isAccepted =
    ACCEPTED_DOCUMENT_TYPES.has(normalizedType) ||
    Array.from(ACCEPTED_DOCUMENT_TYPES).some(
      (accepted) =>
        normalizedType.includes(accepted) || accepted.includes(normalizedType),
    );

  return isAccepted
    ? { passed: true }
    : {
        passed: false,
        reason: `Document type "${documentType}" is not in the accepted list. Manual review required.`,
      };
};

const checkDocumentUrlValid = (documentUrl: string): VerificationCheckResult => {
  const trimmedUrl = documentUrl.trim();

  if (!trimmedUrl) {
    return { passed: false, reason: "Document URL is empty" };
  }

  const isExternalUrl =
    trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://");

  if (isExternalUrl) {
    try {
      new URL(trimmedUrl);
      return { passed: true };
    } catch {
      return { passed: false, reason: "Document URL is not a valid URL" };
    }
  }

  const hasValidExtension = Array.from(VALID_DOCUMENT_EXTENSIONS).some((ext) =>
    trimmedUrl.toLowerCase().endsWith(ext),
  );

  if (!hasValidExtension) {
    return {
      passed: false,
      reason:
        "Document file does not have a recognized extension. Manual review required.",
    };
  }

  return { passed: true };
};

const checkNoDuplicateSubmission = async (
  teacherProfileId: string,
  documentType: string,
  documentUrl: string,
  currentVerificationId: string,
): Promise<VerificationCheckResult> => {
  const duplicate = await prisma.teacherVerification.findFirst({
    where: {
      teacherProfileId,
      documentType: { equals: documentType, mode: "insensitive" },
      documentUrl,
      id: { not: currentVerificationId },
      status: VerificationStatus.APPROVED,
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      passed: false,
      reason:
        "A similar document has already been approved. Manual review required for duplicates.",
    };
  }

  return { passed: true };
};

const checkTeacherProfileComplete = async (
  teacherProfileId: string,
): Promise<VerificationCheckResult> => {
  const profile = await prisma.teacherProfile.findUnique({
    where: { id: teacherProfileId },
    select: {
      id: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!profile) {
    return { passed: false, reason: "Teacher profile not found" };
  }

  const hasName =
    Boolean(profile.user.firstName?.trim()) &&
    Boolean(profile.user.lastName?.trim());
  const hasEmail = Boolean(profile.user.email?.trim());

  if (!hasName || !hasEmail) {
    return {
      passed: false,
      reason:
        "Teacher profile is incomplete (missing name or email). Manual review required.",
    };
  }

  return { passed: true };
};

// ================================
// AUTO-VERIFICATION ENGINE
// ================================

interface AutoVerificationResult {
  autoApproved: boolean;
  verificationMethod: VerificationMethod;
  reviewNotes: string;
  failedChecks: string[];
}

const runAutoVerificationChecks = async (
  verification: TeacherVerification,
): Promise<AutoVerificationResult> => {
  const failedChecks: string[] = [];

  // Rule 1: Document type is in accepted list
  const typeCheck = checkDocumentTypeAccepted(verification.documentType);
  if (!typeCheck.passed && typeCheck.reason) {
    failedChecks.push(typeCheck.reason);
  }

  // Rule 2: Document URL is valid
  const urlCheck = checkDocumentUrlValid(verification.documentUrl);
  if (!urlCheck.passed && urlCheck.reason) {
    failedChecks.push(urlCheck.reason);
  }

  // Rule 3: No duplicate approved submissions
  const duplicateCheck = await checkNoDuplicateSubmission(
    verification.teacherProfileId,
    verification.documentType,
    verification.documentUrl,
    verification.id,
  );
  if (!duplicateCheck.passed && duplicateCheck.reason) {
    failedChecks.push(duplicateCheck.reason);
  }

  // Rule 4: Teacher profile has required basic fields
  const profileCheck = await checkTeacherProfileComplete(
    verification.teacherProfileId,
  );
  if (!profileCheck.passed && profileCheck.reason) {
    failedChecks.push(profileCheck.reason);
  }

  const autoApproved = failedChecks.length === 0;

  return {
    autoApproved,
    verificationMethod: VerificationMethod.AUTO,
    reviewNotes: autoApproved
      ? "Auto-verified by system: All automated checks passed successfully."
      : `Flagged for manual review: ${failedChecks.join("; ")}`,
    failedChecks,
  };
};

// ================================
// SERVICE
// ================================

class AutoVerificationService {
  /**
   * Process a newly submitted verification through automated checks.
   * If all checks pass, auto-approve. Otherwise, keep as PENDING with review notes.
   */
  async processVerification(
    verificationId: string,
  ): Promise<TeacherVerification> {
    const verification = await prisma.teacherVerification.findUnique({
      where: { id: verificationId },
      include: {
        teacherProfile: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!verification) {
      logger.warn("Auto-verification: verification not found", {
        verificationId,
      });
      throw new Error("Verification not found for auto-processing");
    }

    if (verification.status !== VerificationStatus.PENDING) {
      logger.info("Auto-verification: skipping non-pending verification", {
        verificationId,
        status: verification.status,
      });
      return verification;
    }

    const result = await runAutoVerificationChecks(verification);

    logger.info("Auto-verification result", {
      verificationId,
      autoApproved: result.autoApproved,
      failedChecks: result.failedChecks,
    });

    if (result.autoApproved) {
      const reviewTimestamp = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.teacherVerification.updateMany({
          where: {
            id: verificationId,
            status: VerificationStatus.PENDING,
          },
          data: {
            status: VerificationStatus.APPROVED,
            verificationMethod: VerificationMethod.AUTO,
            reviewNotes: result.reviewNotes,
            reviewedAt: reviewTimestamp,
          },
        });

        if (updateResult.count !== 1) {
          throw new Error(
            "Verification status changed during auto-processing",
          );
        }

        await tx.teacherProfile.update({
          where: { id: verification.teacherProfileId },
          data: {
            isVerified: true,
            verificationStatus: VerificationStatus.APPROVED,
            profileReviewedAt: reviewTimestamp,
            profileReviewNotes: result.reviewNotes,
          },
        });

        return tx.teacherVerification.findUnique({
          where: { id: verificationId },
        });
      });

      if (updated) {
        await createTeacherNotification({
          userId: verification.teacherProfile.userId,
          title: "Verification Auto-Approved",
          message:
            "Your verification document has been automatically reviewed and approved. You are now a verified teacher!",
          type: "verification",
        });
      }

      return updated!;
    }

    // Not auto-approved: update with method=AUTO and review notes, keep status=PENDING
    await prisma.teacherVerification.update({
      where: { id: verificationId },
      data: {
        verificationMethod: VerificationMethod.AUTO,
        reviewNotes: result.reviewNotes,
      },
    });

    return (await prisma.teacherVerification.findUnique({
      where: { id: verificationId },
    }))!;
  }

  /**
   * Get auto-verification statistics for admin dashboard.
   */
  async getAutoVerificationStats(): Promise<{
    totalProcessed: number;
    autoApproved: number;
    flaggedForReview: number;
    manuallyReviewed: number;
    autoApprovalRate: number;
  }> {
    const [autoApproved, flaggedForReview, manuallyReviewed, totalAuto] =
      await Promise.all([
        prisma.teacherVerification.count({
          where: {
            verificationMethod: VerificationMethod.AUTO,
            status: VerificationStatus.APPROVED,
            reviewedBy: null,
          },
        }),
        prisma.teacherVerification.count({
          where: {
            verificationMethod: VerificationMethod.AUTO,
            status: VerificationStatus.PENDING,
          },
        }),
        prisma.teacherVerification.count({
          where: {
            verificationMethod: VerificationMethod.MANUAL,
          },
        }),
        prisma.teacherVerification.count({
          where: {
            verificationMethod: VerificationMethod.AUTO,
          },
        }),
      ]);

    const totalProcessed = totalAuto + manuallyReviewed;
    const autoApprovalRate =
      totalAuto > 0 ? Math.round((autoApproved / totalAuto) * 100) : 0;

    return {
      totalProcessed,
      autoApproved,
      flaggedForReview,
      manuallyReviewed,
      autoApprovalRate,
    };
  }
}

export default new AutoVerificationService();
