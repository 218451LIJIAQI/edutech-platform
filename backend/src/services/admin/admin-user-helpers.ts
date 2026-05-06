import {
  Prisma,
  RegistrationStatus,
  ReportStatus,
  ReportType,
  UserRole,
  VerificationStatus,
  type TeacherProfile,
  type User,
} from "@prisma/client";
import prisma from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { buildCurrentEnrollmentWhere } from "../shared/enrollment-access";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const EMAIL_MAX_LENGTH = 254;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const adminUserListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  department: true,
  role: true,
  avatar: true,
  isActive: true,
  isLocked: true,
  lastLoginAt: true,
  loginCount: true,
  createdAt: true,
  updatedAt: true,
  teacherProfile: {
    select: {
      isVerified: true,
      verificationStatus: true,
      registrationStatus: true,
      profileCompletionStatus: true,
      commissionRate: true,
      totalStudents: true,
      averageRating: true,
      totalEarnings: true,
    },
  },
  _count: {
    select: {
      enrollments: true,
    },
  },
} satisfies Prisma.UserSelect;

export const adminCourseListInclude = {
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
  _count: {
    select: {
      lessons: true,
      packages: true,
    },
  },
} satisfies Prisma.CourseInclude;

export const adminVerificationListInclude = {
  teacherProfile: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.TeacherVerificationInclude;

export const adminReportListInclude = {
  reporter: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  reported: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.ReportInclude;

export const adminAuditLogInclude = {
  admin: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.UserAuditLogInclude;

export const teacherCommissionListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true,
  teacherProfile: {
    select: {
      id: true,
      commissionRate: true,
      totalStudents: true,
      averageRating: true,
      totalEarnings: true,
    },
  },
} satisfies Prisma.UserSelect;

export const adminFinancialPaymentsInclude = {
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  package: {
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseType: true,
        },
      },
    },
  },
  order: {
    include: {
      items: {
        include: {
          package: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  courseType: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

export const adminInvoicesInclude = {
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  package: {
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseType: true,
        },
      },
    },
  },
  order: {
    include: {
      items: {
        include: {
          package: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  courseType: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

const validateDateRange = (startDate?: Date, endDate?: Date) => {
  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new ValidationError("Invalid start date");
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new ValidationError("Invalid end date");
  }

  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError("Start date cannot be later than end date");
  }
};

const normalizeSearchKeyword = (value?: string): string | undefined => {
  const keyword = value?.trim();
  return keyword || undefined;
};

export const buildAdminUserWhere = (
  filters: {
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    isLocked?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
  } = {},
): Prisma.UserWhereInput => {
  validateDateRange(filters.createdAfter, filters.createdBefore);

  const where: Prisma.UserWhereInput = {};
  const search = normalizeSearchKeyword(filters.search);

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.isLocked !== undefined) {
    where.isLocked = filters.isLocked;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
    ];
  }

  if (filters.createdAfter || filters.createdBefore) {
    const createdAt: Prisma.DateTimeFilter = {};

    if (filters.createdAfter) {
      createdAt.gte = filters.createdAfter;
    }

    if (filters.createdBefore) {
      createdAt.lte = filters.createdBefore;
    }

    where.createdAt = createdAt;
  }

  return where;
};

export const buildAdminUserOrderBy = (
  sortBy = "createdAt",
  sortOrder: "asc" | "desc" = "desc",
): Prisma.UserOrderByWithRelationInput => {
  const sortableFields: Record<string, Prisma.UserOrderByWithRelationInput> = {
    email: { email: sortOrder },
    firstName: { firstName: sortOrder },
    lastName: { lastName: sortOrder },
    lastLoginAt: { lastLoginAt: sortOrder },
    loginCount: { loginCount: sortOrder },
    createdAt: { createdAt: sortOrder },
    updatedAt: { updatedAt: sortOrder },
  };

  return sortableFields[sortBy] || { createdAt: sortOrder };
};

export const buildAdminCourseWhere = (
  filters: {
    isPublished?: boolean;
    category?: string;
    search?: string;
  } = {},
): Prisma.CourseWhereInput => {
  const where: Prisma.CourseWhereInput = {};
  const category = normalizeSearchKeyword(filters.category);
  const search = normalizeSearchKeyword(filters.search);

  if (filters.isPublished !== undefined) {
    where.isPublished = filters.isPublished;
  }

  if (category) {
    where.category = {
      equals: category,
      mode: "insensitive",
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      {
        teacherProfile: {
          is: {
            user: {
              is: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      },
    ];
  }

  return where;
};

export const buildAdminVerificationWhere = (
  status?: VerificationStatus,
): Prisma.TeacherVerificationWhereInput => {
  const where: Prisma.TeacherVerificationWhereInput = {};

  if (status) {
    where.status = status;
  }

  return where;
};

export const buildAdminReportWhere = (
  status?: ReportStatus,
  type?: ReportType,
): Prisma.ReportWhereInput => {
  const where: Prisma.ReportWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  return where;
};

export const buildTeacherCommissionWhere = (
  search?: string,
): Prisma.UserWhereInput => {
  const keyword = normalizeSearchKeyword(search);

  return {
    role: UserRole.TEACHER,
    ...(keyword
      ? {
          OR: [
            { email: { contains: keyword, mode: "insensitive" } },
            { firstName: { contains: keyword, mode: "insensitive" } },
            { lastName: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };
};

export const buildUserAuditLogWhere = (
  filters: {
    userId?: string;
    adminId?: string;
    action?: string;
  } = {},
): Prisma.UserAuditLogWhereInput => {
  const where: Prisma.UserAuditLogWhereInput = {};
  const action = normalizeSearchKeyword(filters.action);

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.adminId) {
    where.adminId = filters.adminId;
  }

  if (action) {
    where.action = action;
  }

  return where;
};

export const requireUser = async (
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<User> => {
  const user = await client.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

export const requireTeacherUser = async (
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<User> => {
  const user = await requireUser(userId, client);

  if (user.role !== UserRole.TEACHER) {
    throw new NotFoundError("Teacher not found");
  }

  return user;
};

export const requireTeacherProfile = async (
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<TeacherProfile> => {
  const profile = await client.teacherProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError("Teacher profile not found");
  }

  return profile;
};

export const ensureNotAdminUser = (user: User, message: string) => {
  if (user.role === UserRole.ADMIN) {
    throw new ValidationError(message);
  }
};

export const ensureStrongPassword = (password: string) => {
  if (!password || password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  if (password.length > 72) {
    throw new ValidationError("Password must not exceed 72 characters");
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
    throw new ValidationError(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    );
  }
};

export const ensureAdminManageableRole = (role: unknown): UserRole => {
  if (role !== UserRole.STUDENT && role !== UserRole.TEACHER) {
    throw new ValidationError(
      "This form can only manage student or teacher accounts",
    );
  }

  return role;
};

export const ensureCommissionRateInRange = (commissionRate: number | null) => {
  if (commissionRate === null) {
    return;
  }

  if (
    typeof commissionRate !== "number" ||
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 100
  ) {
    throw new ValidationError("Commission rate must be between 0 and 100");
  }
};

export const normalizeEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ValidationError("Email is required");
  }

  if (
    normalizedEmail.length > EMAIL_MAX_LENGTH ||
    !EMAIL_FORMAT.test(normalizedEmail)
  ) {
    throw new ValidationError("Invalid email format");
  }

  return normalizedEmail;
};

export const ensureEmailAvailable = async (
  email: string,
  excludedUserId?: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await client.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
      ...(excludedUserId
        ? {
            id: {
              not: excludedUserId,
            },
          }
        : {}),
    },
  });

  if (existingUser) {
    throw new ValidationError("Email already in use");
  }

  return normalizedEmail;
};

export const createUserAuditLog = async (
  params: {
    adminId: string;
    userId: string;
    action: string;
    reason?: string;
    oldValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
  },
  client: PrismaClientLike = prisma,
) => {
  const data: Prisma.UserAuditLogUncheckedCreateInput = {
    adminId: params.adminId,
    userId: params.userId,
    action: params.action,
    reason: params.reason,
  };

  if (params.oldValues !== undefined) {
    data.oldValues = params.oldValues;
  }

  if (params.newValues !== undefined) {
    data.newValues = params.newValues;
  }

  return client.userAuditLog.create({
    data,
  });
};

export const createAdminNotification = async (
  params: {
    userId: string;
    title: string;
    message: string;
    type: string;
  },
  client: PrismaClientLike = prisma,
) => {
  return client.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
    },
  });
};

export const collectImpactedTeacherUserIdsForStudent = async (
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<Set<string>> => {
  return collectImpactedTeacherUserIdsForStudents([userId], client);
};

export const collectImpactedTeacherUserIdsForStudents = async (
  userIds: string[],
  client: PrismaClientLike = prisma,
): Promise<Set<string>> => {
  const impactedTeacherUserIds = new Set<string>();

  if (userIds.length === 0) {
    return impactedTeacherUserIds;
  }

  const enrollments = await client.enrollment.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
    select: {
      package: {
        select: {
          course: {
            select: {
              teacherProfile: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const enrollment of enrollments) {
    const teacherUserId = enrollment.package?.course?.teacherProfile?.userId;

    if (teacherUserId) {
      impactedTeacherUserIds.add(teacherUserId);
    }
  }

  return impactedTeacherUserIds;
};

export const assertTeacherHasNoActiveStudents = async (
  teacherUserId: string,
  teacherLabel?: string,
  client: PrismaClientLike = prisma,
) => {
  const activeEnrollments = await client.enrollment.count({
    where: buildCurrentEnrollmentWhere(
      {
        package: {
          course: {
            teacherProfile: {
              userId: teacherUserId,
            },
          },
        },
      },
      new Date(),
    ),
  });

  if (activeEnrollments > 0) {
    throw new ValidationError(
      teacherLabel
        ? `Cannot delete teacher ${teacherLabel} with active students`
        : "Cannot delete teacher with active students",
    );
  }
};

const recalculateTeacherStudentCount = async (
  teacherUserId: string,
  client: PrismaClientLike = prisma,
) => {
  const teacherProfile = await client.teacherProfile.findUnique({
    where: { userId: teacherUserId },
    select: {
      id: true,
    },
  });

  if (!teacherProfile) {
    return;
  }

  const enrollments = await client.enrollment.findMany({
    where: buildCurrentEnrollmentWhere(
      {
        package: {
          course: {
            teacherProfileId: teacherProfile.id,
          },
        },
      },
      new Date(),
    ),
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  await client.teacherProfile.update({
    where: { id: teacherProfile.id },
    data: {
      totalStudents: enrollments.length,
    },
  });
};

export const recalculateTeacherStudentCounts = async (
  teacherUserIds: Iterable<string>,
  client: PrismaClientLike = prisma,
) => {
  const uniqueTeacherUserIds = Array.from(new Set(teacherUserIds));

  for (const teacherUserId of uniqueTeacherUserIds) {
    await recalculateTeacherStudentCount(teacherUserId, client);
  }
};

export const createApprovedTeacherProfileData = (
  userId: string,
): Prisma.TeacherProfileUncheckedCreateInput => ({
  userId,
  registrationStatus: RegistrationStatus.APPROVED,
  verificationStatus: VerificationStatus.PENDING,
  profileCompletionStatus: "INCOMPLETE",
  isVerified: false,
});

export const assertTeacherProfileCanBeRemoved = async (
  userId: string,
  client: PrismaClientLike = prisma,
) => {
  const profile = await client.teacherProfile.findUnique({
    where: { userId },
    include: {
      _count: {
        select: {
          courses: true,
          certifications: true,
          verifications: true,
          profileSubmissions: true,
        },
      },
    },
  });

  if (!profile) {
    return;
  }

  const teacherArtifacts =
    profile._count.courses +
    profile._count.certifications +
    profile._count.verifications +
    profile._count.profileSubmissions;

  if (teacherArtifacts > 0) {
    throw new ValidationError(
      "Cannot change this teacher to a student after teacher-specific records have been created",
    );
  }
};
