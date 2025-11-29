import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../config/database';
import { RegistrationStatus } from '@prisma/client';
import { AuthorizationError, NotFoundError } from '../utils/errors';

/**
 * Middleware to ensure the teacher's registration has been approved
 * Blocks access to teacher-protected endpoints until admin approval
 */
export const ensureTeacherApproved: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AuthorizationError('Unauthorized'));

    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: {
        registrationStatus: true,
      },
    });

    if (!profile) throw new NotFoundError('Teacher profile not found');

    if (profile.registrationStatus !== RegistrationStatus.APPROVED) {
      let message = 'Access restricted to approved teachers.';
      switch (profile.registrationStatus) {
        case RegistrationStatus.PENDING:
          message = 'Your teacher registration is pending approval. Please wait for admin review.';
          break;
        case RegistrationStatus.REJECTED:
          message = 'Your teacher registration has been rejected. Please contact support if you believe this is a mistake.';
          break;
        default:
          message = 'Your teacher status does not allow access to this resource.';
      }
      return next(new AuthorizationError(message));
    }

    return next();
  } catch (err) {
    return next(err as Error);
  }
};

export default { ensureTeacherApproved };
