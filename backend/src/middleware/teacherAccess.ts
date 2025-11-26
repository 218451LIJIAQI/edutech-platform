import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { RegistrationStatus } from '@prisma/client';
import { AuthorizationError, NotFoundError } from '../utils/errors';

/**
 * Middleware to ensure the teacher's registration has been approved
 * Blocks access to teacher-protected endpoints until admin approval
 */
export const ensureTeacherApproved = async (
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
        id: true,
        registrationStatus: true,
      },
    });

    if (!profile) throw new NotFoundError('Teacher profile not found');

    if (profile.registrationStatus !== RegistrationStatus.APPROVED) {
      return next(
        new AuthorizationError(
          'Your teacher registration is pending approval. Please wait for admin review.'
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

export default { ensureTeacherApproved };

