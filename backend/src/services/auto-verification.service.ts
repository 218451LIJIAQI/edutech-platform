import {
  VerificationStatus,
  VerificationMethod,
  type TeacherVerification,
} from "@prisma/client";
import prisma from "../config/database";
import logger from "../utils/logger";
import { createTeacherNotification } from "./teacher/teacher-service-helpers";

const ACCEPTED_DOCUMENT_TYPES = new Set([
  "teaching license",
  "teaching certificate",
  "degree certificate",
  "professional certification",
  "professional license",
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

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
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

  return hasValidExtension
    ? { passed: true }
    : {
        passed: false,
        reason:
          "Document file does not have a recognized extension. Manual review required.",
      };
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

  return duplicate
    ? {
        passed: false,
        reason:
          "A similar document has already been approved. Manual review required for duplicates.",
      }
    : { passed: true };
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

  return hasName && hasEmail
    ? { passed: true }
    : {
        passed: false,
        reason:
          "Teacher profile is incomplete (missing name or email). Manual review required.",
      };
};

interface AutoVerificationResult {
  autoApproved: boolean;
  verificationMethod: VerificationMethod;
  reviewNotes: string;
  failedChecks: string[];
}

const runAutoVerificationChecks = async (
  verification: TeacherVerification,
): Promise<AutoVerificationResult> => {
  const checks = await Promise.all([
    Promise.resolve(checkDocumentTypeAccepted(verification.documentType)),
    Promise.resolve(checkDocumentUrlValid(verification.documentUrl)),
    checkNoDuplicateSubmission(
      verification.teacherProfileId,
      verification.documentType,
      verification.documentUrl,
      verification.id,
    ),
    checkTeacherProfileComplete(verification.teacherProfileId),
  ]);

  const failedChecks = checks
    .filter((check) => !check.passed && Boolean(check.reason))
    .map((check) => check.reason!);
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

class AutoVerificationService {
  /**
   * Processes a newly submitted TeacherVerification document through automated checks.
   * Updates only `isVerified` and `verificationStatus` on `TeacherProfile` — never
   * touching `profileReviewedAt` or `profileReviewNotes`, which belong strictly
   * to extended profile submissions (`TeacherProfileSubmission`).
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

    return prisma.teacherVerification.update({
      where: { id: verificationId },
      data: {
        verificationMethod: VerificationMethod.AUTO,
        reviewNotes: result.reviewNotes,
      },
    });
  }

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
