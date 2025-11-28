import { Prisma, VerificationStatus, RegistrationStatus } from '@prisma/client';
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

    // Build where clause with proper typing
    const where: Prisma.TeacherProfileWhereInput = {};

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    if (minRating !== undefined) {
      where.averageRating = { gte: minRating };
    }

    if (search) {
      where.OR = [
        { user: { is: { firstName: { contains: search, mode: 'insensitive' } } } },
        { user: { is: { lastName: { contains: search, mode: 'insensitive' } } } },
        { headline: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If category filter is provided, filter by courses (case-sensitive equality)
    if (category) {
      where.courses = {
        some: {
          category: { equals: category },
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

    // Calculate actual student counts for each teacher
    const teachersWithActualCounts = await Promise.all(
      teachers.map(async (teacher) => {
        const actualStudentCount = await this.calculateActualStudentCount(teacher.id);
        return {
          ...teacher,
          totalStudents: actualStudentCount, // Override with actual count
        };
      })
    );

    return {
      teachers: teachersWithActualCounts,
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

    // Get actual student count
    const actualStudentCount = await this.calculateActualStudentCount(teacherId);

    // Only expose extended profile fields to students when approved
    const approved = teacher.profileCompletionStatus === 'APPROVED';

    return {
      ...teacher,
      totalStudents: actualStudentCount, // Override with actual count
      // Parse JSON fields conditionally
      awards: approved && teacher.awards ? JSON.parse(teacher.awards) : [],
      specialties: approved && teacher.specialties ? JSON.parse(teacher.specialties) : [],
      languages: approved && teacher.languages ? JSON.parse(teacher.languages) : [],
      certificatePhotos: approved && teacher.certificatePhotos ? JSON.parse(teacher.certificatePhotos) : [],
      selfIntroduction: approved ? teacher.selfIntroduction : undefined,
      educationBackground: approved ? teacher.educationBackground : undefined,
      teachingExperience: approved ? teacher.teachingExperience : undefined,
      teachingStyle: approved ? teacher.teachingStyle : undefined,
      yearsOfExperience: approved ? teacher.yearsOfExperience : undefined,
      profilePhoto: approved ? teacher.profilePhoto : teacher.user?.avatar || null,
    };
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

    // If rejected, do NOT delete the user. Keep the record for admin auditing and notify teacher.
    if (status === VerificationStatus.REJECTED) {
      await prisma.notification.create({
        data: {
          userId: verification.teacherProfile.userId,
          title: 'Verification Rejected',
          message: `Your verification has been rejected. Reason: ${reviewNotes || 'Not specified'}`,
          type: 'verification',
        },
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
   * Calculate actual unique students for a teacher
   * Counts distinct users who have enrollments in this teacher's courses
   */
  async calculateActualStudentCount(teacherProfileId: string): Promise<number> {
    const result = await prisma.enrollment.findMany({
      where: {
        package: {
          course: {
            teacherProfileId,
          },
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    return result.length;
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
    const [totalCourses, totalEnrollments, actualStudentCount] = await Promise.all([
      prisma.course.count({ where: { teacherProfileId: teacherProfile.id } }),
      prisma.enrollment.count({ where: { package: { course: { teacherProfileId: teacherProfile.id } } } }),
      this.calculateActualStudentCount(teacherProfile.id),
    ]);

    return {
      totalCourses,
      totalEnrollments,
      totalRevenue: teacherProfile.totalEarnings,
      averageRating: teacherProfile.averageRating,
      totalStudents: actualStudentCount, // Use actual count instead of stored value
      isVerified: teacherProfile.isVerified,
    };
  }

  /**
   * Submit extended profile for review
   * This method saves the extended profile information and creates a submission record
   */
  async submitExtendedProfile(
    userId: string,
    data: {
      selfIntroduction?: string;
      educationBackground?: string;
      teachingExperience?: string;
      awards?: string[];
      specialties?: string[];
      teachingStyle?: string;
      languages?: string[];
      yearsOfExperience?: number;
      profilePhoto?: string;
      certificatePhotos?: string[];
    }
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    // Do NOT write into TeacherProfile yet; store as draft payload in submission
    const updatedProfile = await prisma.teacherProfile.update({
      where: { userId },
      data: {
        // Mark as pending review so admin can find it
        profileCompletionStatus: 'PENDING_REVIEW',
        profileSubmittedAt: new Date(),
      },
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
    });

    await prisma.teacherProfileSubmission.create({
      data: {
        teacherProfileId: teacherProfile.id,
        status: VerificationStatus.PENDING,
        submittedAt: new Date(),
        payload: {
          selfIntroduction: data.selfIntroduction ?? null,
          educationBackground: data.educationBackground ?? null,
          teachingExperience: data.teachingExperience ?? null,
          awards: data.awards ?? [],
          specialties: data.specialties ?? [],
          teachingStyle: data.teachingStyle ?? null,
          languages: data.languages ?? [],
          yearsOfExperience: data.yearsOfExperience ?? null,
          profilePhoto: data.profilePhoto ?? null,
          certificatePhotos: data.certificatePhotos ?? [],
        },
      },
    });

    return updatedProfile;
  }

  /**
   * Get extended profile for teacher
   */
  async getExtendedProfile(userId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
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
      },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    // Parse JSON fields
    return {
      ...teacherProfile,
      awards: teacherProfile.awards ? JSON.parse(teacherProfile.awards) : [],
      specialties: teacherProfile.specialties ? JSON.parse(teacherProfile.specialties) : [],
      languages: teacherProfile.languages ? JSON.parse(teacherProfile.languages) : [],
      certificatePhotos: teacherProfile.certificatePhotos ? JSON.parse(teacherProfile.certificatePhotos) : [],
    };
  }

  /**
   * Update extended profile for approved teachers
   * This creates a new submission for review
   */
  async updateExtendedProfile(
    userId: string,
    data: {
      selfIntroduction?: string;
      educationBackground?: string;
      teachingExperience?: string;
      awards?: string[];
      specialties?: string[];
      teachingStyle?: string;
      languages?: string[];
      yearsOfExperience?: number;
      profilePhoto?: string;
      certificatePhotos?: string[];
    }
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    // For approved profiles, create a new submission for review
    // Update status to PENDING_REVIEW to indicate there are pending changes
    const updatedProfile = await prisma.teacherProfile.update({
      where: { userId },
      data: {
        profileCompletionStatus: 'PENDING_REVIEW',
        profileSubmittedAt: new Date(),
      },
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
    });

    // Create a new submission record with the updated payload
    await prisma.teacherProfileSubmission.create({
      data: {
        teacherProfileId: teacherProfile.id,
        status: VerificationStatus.PENDING,
        submittedAt: new Date(),
        payload: {
          selfIntroduction: data.selfIntroduction ?? null,
          educationBackground: data.educationBackground ?? null,
          teachingExperience: data.teachingExperience ?? null,
          awards: data.awards ?? [],
          specialties: data.specialties ?? [],
          teachingStyle: data.teachingStyle ?? null,
          languages: data.languages ?? [],
          yearsOfExperience: data.yearsOfExperience ?? null,
          profilePhoto: data.profilePhoto ?? null,
          certificatePhotos: data.certificatePhotos ?? [],
        },
      },
    });

    return updatedProfile;
  }

  /**
   * Get pending teacher registrations (Admin only)
   */
  async getPendingRegistrations(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where: { registrationStatus: RegistrationStatus.PENDING },
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
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.teacherProfile.count({ where: { registrationStatus: RegistrationStatus.PENDING } }),
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
   * Review teacher registration (Admin only)
   */
  async reviewRegistration(
    teacherProfileId: string,
    adminId: string,
    status: RegistrationStatus,
  ) {
    void adminId; // reserved for auditing

    const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: teacherProfileId }, include: { user: true } });
    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const updated = await prisma.teacherProfile.update({
      where: { id: teacherProfileId },
      data: { registrationStatus: status },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } } },
    });

    if (status === RegistrationStatus.REJECTED) {
      // Do not hard-delete users; deactivate account instead and keep records for auditing
      await prisma.user.update({ where: { id: updated.user.id }, data: { isActive: false } });
    }

    return updated;
  }

  /**
   * Get all teachers pending profile verification (Admin only)
   */
  async getPendingProfileVerifications(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      prisma.teacherProfile.findMany({
        where: {
          profileCompletionStatus: 'PENDING_REVIEW',
        },
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
          profileSubmissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { profileSubmittedAt: 'asc' },
      }),
      prisma.teacherProfile.count({
        where: { profileCompletionStatus: 'PENDING_REVIEW' },
      }),
    ]);

    // Overlay pending draft payload onto the teacher object for display only
    const mapped = teachers.map((t) => {
      const draft = t.profileSubmissions?.[0]?.payload as any | undefined;
      const base = {
        ...t,
        awards: t.awards ? JSON.parse(t.awards) : [],
        specialties: t.specialties ? JSON.parse(t.specialties) : [],
        languages: t.languages ? JSON.parse(t.languages) : [],
        certificatePhotos: t.certificatePhotos ? JSON.parse(t.certificatePhotos) : [],
      } as any;

      if (draft) {
        base.selfIntroduction = draft.selfIntroduction ?? base.selfIntroduction;
        base.educationBackground = draft.educationBackground ?? base.educationBackground;
        base.teachingExperience = draft.teachingExperience ?? base.teachingExperience;
        base.awards = Array.isArray(draft.awards) ? draft.awards : base.awards;
        base.specialties = Array.isArray(draft.specialties) ? draft.specialties : base.specialties;
        base.teachingStyle = draft.teachingStyle ?? base.teachingStyle;
        base.languages = Array.isArray(draft.languages) ? draft.languages : base.languages;
        base.yearsOfExperience = draft.yearsOfExperience ?? base.yearsOfExperience;
        base.profilePhoto = draft.profilePhoto ?? base.profilePhoto;
        base.certificatePhotos = Array.isArray(draft.certificatePhotos) ? draft.certificatePhotos : base.certificatePhotos;
      }
      return base;
    });

    return {
      teachers: mapped,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Review and approve/reject teacher extended profile (Admin only)
   */
  async reviewTeacherProfile(
    teacherProfileId: string,
    adminId: string,
    status: VerificationStatus,
    reviewNotes?: string
  ) {
    const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: teacherProfileId } });
    if (!teacherProfile) throw new NotFoundError('Teacher profile not found');

    // Get latest submission (draft payload)
    const submission = await prisma.teacherProfileSubmission.findFirst({
      where: { teacherProfileId },
      orderBy: { submittedAt: 'desc' },
    });

    if (!submission) {
      throw new NotFoundError('No submission found for this teacher');
    }

    if (status === VerificationStatus.APPROVED) {
      const p = (submission.payload as any) || {};
      const updated = await prisma.teacherProfile.update({
        where: { id: teacherProfileId },
        data: {
          selfIntroduction: p.selfIntroduction ?? teacherProfile.selfIntroduction,
          educationBackground: p.educationBackground ?? teacherProfile.educationBackground,
          teachingExperience: p.teachingExperience ?? teacherProfile.teachingExperience,
          awards: Array.isArray(p.awards) ? JSON.stringify(p.awards) : teacherProfile.awards,
          specialties: Array.isArray(p.specialties) ? JSON.stringify(p.specialties) : teacherProfile.specialties,
          teachingStyle: p.teachingStyle ?? teacherProfile.teachingStyle,
          languages: Array.isArray(p.languages) ? JSON.stringify(p.languages) : teacherProfile.languages,
          yearsOfExperience: p.yearsOfExperience ?? teacherProfile.yearsOfExperience,
          profilePhoto: p.profilePhoto ?? teacherProfile.profilePhoto,
          certificatePhotos: Array.isArray(p.certificatePhotos) ? JSON.stringify(p.certificatePhotos) : teacherProfile.certificatePhotos,
          profileCompletionStatus: 'APPROVED',
          profileReviewedAt: new Date(),
          profileReviewNotes: reviewNotes,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      await prisma.teacherProfileSubmission.update({
        where: { id: submission.id },
        data: { status: VerificationStatus.APPROVED, reviewedBy: adminId, reviewedAt: new Date(), reviewNotes, payload: Prisma.DbNull },
      });

      await prisma.notification.create({
        data: {
          userId: updated.user.id,
          title: 'Profile Approved',
          message: 'Your teacher profile submission has been approved.',
          type: 'profile',
        },
      });

      return updated;
    } else if (status === VerificationStatus.REJECTED) {
      await prisma.teacherProfileSubmission.update({
        where: { id: submission.id },
        data: { status: VerificationStatus.REJECTED, reviewedBy: adminId, reviewedAt: new Date(), reviewNotes, payload: Prisma.DbNull },
      });

      const nextStatus = teacherProfile.profileCompletionStatus === 'APPROVED' ? 'APPROVED' : 'INCOMPLETE';
      const updated = await prisma.teacherProfile.update({
        where: { id: teacherProfileId },
        data: { profileCompletionStatus: nextStatus, profileReviewedAt: new Date(), profileReviewNotes: reviewNotes },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });

      await prisma.notification.create({
        data: {
          userId: updated.user.id,
          title: 'Profile Rejected',
          message: `Your teacher profile submission was rejected. Reason: ${reviewNotes || 'Not specified'}`,
          type: 'profile',
        },
      });

      return updated;
    } else {
      const updated = await prisma.teacherProfile.update({
        where: { id: teacherProfileId },
        data: { profileCompletionStatus: 'PENDING_REVIEW', profileReviewedAt: new Date(), profileReviewNotes: reviewNotes },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });
      return updated;
    }
  }

  /**
   * Get all verified teachers (for student view)
   */
  async getVerifiedTeachers(filters: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.TeacherProfileWhereInput = {
      isVerified: true,
      profileCompletionStatus: 'APPROVED',
    };

    if (search) {
      where.OR = [
        { user: { is: { firstName: { contains: search, mode: 'insensitive' } } } },
        { user: { is: { lastName: { contains: search, mode: 'insensitive' } } } },
        { headline: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        // specialties is a JSON string; contains works as substring search
        { specialties: { contains: search, mode: 'insensitive' } },
      ];
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
            select: { courses: true },
          },
        },
        orderBy: { averageRating: 'desc' },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    const teachersWithActualCounts = await Promise.all(
      teachers.map(async (t) => {
        const actualStudentCount = await this.calculateActualStudentCount(t.id);
        return {
          ...t,
          totalStudents: actualStudentCount, // Override with actual count
          awards: t.awards ? JSON.parse(t.awards) : [],
          specialties: t.specialties ? JSON.parse(t.specialties) : [],
          languages: t.languages ? JSON.parse(t.languages) : [],
          certificatePhotos: t.certificatePhotos ? JSON.parse(t.certificatePhotos) : [],
        };
      })
    );

    return {
      teachers: teachersWithActualCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new TeacherService();
