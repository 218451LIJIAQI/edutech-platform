import type { RequestHandler } from "express";
import { RegistrationStatus, UserRole } from "@prisma/client";

import prisma from "../config/database";
import { authenticate, authorize } from "./auth";
import { AuthorizationError, NotFoundError } from "../utils/errors";
import { isApprovedTeacherProfileCompletionStatus } from "../services/teacher/teacher-profile-helpers";

const getTeacherApprovalMessage = (status: RegistrationStatus): string => {
  switch (status) {
    case RegistrationStatus.PENDING:
      return "Your teacher registration is pending approval. Please wait for admin review.";

    case RegistrationStatus.REJECTED:
      return "Your teacher registration has been rejected. Please contact support if you believe this is a mistake.";

    case RegistrationStatus.APPROVED:
      return "Teacher registration has been approved.";

    default:
      return "Your teacher status does not allow access to this resource.";
  }
};

const INCOMPLETE_TEACHER_PROFILE_MESSAGE =
  "Complete and submit your teacher profile before accessing this resource.";

/**
 * Middleware to ensure that a teacher account has been approved by an admin.
 */
export const ensureTeacherApproved: RequestHandler = async (
  req,
  _res,
  next,
) => {
  try {
    const user = req.user;

    if (!user?.id) {
      return next(new AuthorizationError("Authentication required"));
    }

    if (user.role !== UserRole.TEACHER) {
      return next(new AuthorizationError("Access restricted to teachers"));
    }

    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: {
        registrationStatus: true,
        profileCompletionStatus: true,
      },
    });

    if (!profile) {
      return next(new NotFoundError("Teacher profile not found"));
    }

    if (profile.registrationStatus !== RegistrationStatus.APPROVED) {
      return next(
        new AuthorizationError(
          getTeacherApprovalMessage(profile.registrationStatus),
        ),
      );
    }

    if (
      !isApprovedTeacherProfileCompletionStatus(
        profile.profileCompletionStatus,
      )
    ) {
      return next(
        new AuthorizationError(INCOMPLETE_TEACHER_PROFILE_MESSAGE),
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export const studentOnly: RequestHandler[] = [
  authenticate,
  authorize(UserRole.STUDENT),
];

export const teacherOnly: RequestHandler[] = [
  authenticate,
  authorize(UserRole.TEACHER),
];

export const approvedTeacherOnly: RequestHandler[] = [
  authenticate,
  authorize(UserRole.TEACHER),
  ensureTeacherApproved,
];

export const adminOnly: RequestHandler[] = [
  authenticate,
  authorize(UserRole.ADMIN),
];

export const teacherOrAdminOnly: RequestHandler[] = [
  authenticate,
  authorize(UserRole.TEACHER, UserRole.ADMIN),
];
