import { VerificationStatus } from '@prisma/client';
import prisma from '../config/database';
import {
  NotFoundError,
  AuthorizationError,
} from '../utils/errors';

/**
 * Teacher Service
 * Handles teacher profile management and verification
 */
class TeacherService {
  /**
   * Get all teachers with optional filters
   */
  async getAllTeachers(filters: {
    isVerified?: boolean;
    category?: string;
    minRating?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      isVerified,
      category,
      minRating,
      search,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    if (minRating) {
      where.averageRating = { gte: minRating };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { headline: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If category filter is provided, filter by courses
    if (category) {
      where.courses = {
        some: {
          category: { equals: category, mode: 'insensitive' },
        },
      };
    }

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          certifications: true,
          _count: {
            select: {
              courses: true,
            },
          },
        },
        orderBy: { averageRating: 'desc' },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    return {
      teachers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get teacher profile by ID
   */
  async getTeacherById(teacherId: string) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
        certifications: true,
        courses: {
          where: { isPublished: true },
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
        verifications: {
          where: { status: VerificationStatus.APPROVED },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    return teacher;
  }

  /**
   * Get teacher profile by user ID
   */
  async getTeacherByUserId(userId: string) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            createdAt: true,
          },
        },
        certifications: true,
        courses: {
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
        verifications: true,
      },
    });

    if (!teacher) {
      throw new NotFoundError('Teacher profile not found');
    }

    return teacher;
  }

  /**
   * Update teacher profile
   */
  async updateTeacherProfile(
    userId: string,
    data: {
      bio?: string;
      headline?: string;
      hourlyRate?: number;
    }
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const updated = await prisma.teacherProfile.update({
      where: { userId },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Add certification
   */
  async addCertification(
    userId: string,
    data: {
      title: string;
      issuer: string;
      issueDate: Date;
      expiryDate?: Date;
      credentialId?: string;
      credentialUrl?: string;
    }
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const certification = await prisma.certification.create({
      data: {
        teacherProfileId: teacherProfile.id,
        ...data,
      },
    });

    return certification;
  }

  /**
   * Delete certification
   */
  async deleteCertification(userId: string, certificationId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const certification = await prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification || certification.teacherProfileId !== teacherProfile.id) {
      throw new AuthorizationError('You can only delete your own certifications');
    }

    await prisma.certification.delete({
      where: { id: certificationId },
    });

    return { message: 'Certification deleted successfully' };
  }

  /**
   * Submit verification document
   */
  async submitVerification(
    userId: string,
    documentType: string,
    documentUrl: string
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const verification = await prisma.teacherVerification.create({
      data: {
        teacherProfileId: teacherProfile.id,
        documentType,
        documentUrl,
        status: VerificationStatus.PENDING,
      },
    });

    return verification;
  }

  /**
   * Get teacher's verifications
   */
  async getVerifications(userId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const verifications = await prisma.teacherVerification.findMany({
      where: { teacherProfileId: teacherProfile.id },
      orderBy: { submittedAt: 'desc' },
    });

    return verifications;
  }

  /**
   * Review verification (Admin only)
   */
  async reviewVerification(
    verificationId: string,
    adminId: string,
    status: VerificationStatus,
    reviewNotes?: string
  ) {
    const verification = await prisma.teacherVerification.findUnique({
      where: { id: verificationId },
      include: { teacherProfile: true },
    });

    if (!verification) {
      throw new NotFoundError('Verification not found');
    }

    // Update verification status
    const updated = await prisma.teacherVerification.update({
      where: { id: verificationId },
      data: {
        status,
        reviewedBy: adminId,
        reviewNotes,
        reviewedAt: new Date(),
      },
    });

    // If approved, update teacher's verified status
    if (status === VerificationStatus.APPROVED) {
      await prisma.teacherProfile.update({
        where: { id: verification.teacherProfileId },
        data: { isVerified: true },
      });
    }

    return updated;
  }

  /**
   * Get all pending verifications (Admin only)
   */
  async getPendingVerifications() {
    const verifications = await prisma.teacherVerification.findMany({
      where: { status: VerificationStatus.PENDING },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return verifications;
  }

  /**
   * Get teacher statistics
   */
  async getTeacherStats(userId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    // Compute counts efficiently via aggregate queries
    const [totalCourses, totalEnrollments] = await Promise.all([
      prisma.course.count({ where: { teacherProfileId: teacherProfile.id } }),
      prisma.enrollment.count({ where: { package: { course: { teacherProfileId: teacherProfile.id } } } }),
    ]);

    return {
      totalCourses,
      totalEnrollments,
      totalRevenue: teacherProfile.totalEarnings,
      averageRating: teacherProfile.averageRating,
      totalStudents: teacherProfile.totalStudents,
      isVerified: teacherProfile.isVerified,
    };
  }
}

export default new TeacherService();

