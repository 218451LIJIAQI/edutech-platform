import prisma from "../../config/database";
import type {
  Prisma,
  TeacherProfile,
  TeacherVerification,
} from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { buildCurrentEnrollmentWhere } from "../shared/enrollment-access";

const publicTeacherUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const teacherUserSummarySelect = {
  ...publicTeacherUserSelect,
  email: true,
} satisfies Prisma.UserSelect;

const basicUserContactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

export const teacherListInclude = {
  user: { select: publicTeacherUserSelect },
  certifications: true,
  _count: { select: { courses: true } },
} satisfies Prisma.TeacherProfileInclude;

export const teacherOwnProfileInclude = {
  user: {
    select: {
      ...teacherUserSummarySelect,
      createdAt: true,
    },
  },
  certifications: true,
  courses: {
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lessons: true } } },
  },
  verifications: {
    orderBy: { submittedAt: "desc" },
  },
} satisfies Prisma.TeacherProfileInclude;

export const teacherProfileUpdateInclude = {
  user: { select: teacherUserSummarySelect },
} satisfies Prisma.TeacherProfileInclude;

export const teacherProfileSubmissionInclude = {
  user: { select: basicUserContactSelect },
} satisfies Prisma.TeacherProfileInclude;

export const pendingTeacherVerificationInclude = {
  teacherProfile: {
    include: {
      user: { select: basicUserContactSelect },
    },
  },
} satisfies Prisma.TeacherVerificationInclude;

export const pendingTeacherRegistrationInclude = {
  user: { select: teacherUserSummarySelect },
} satisfies Prisma.TeacherProfileInclude;

export const reviewedTeacherRegistrationInclude = {
  user: {
    select: {
      ...basicUserContactSelect,
      isActive: true,
    },
  },
} satisfies Prisma.TeacherProfileInclude;

export const ensureRequiredIdentifier = (
  value: unknown,
  label: string,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} is required`);
  }
  return value.trim();
};

export const requireTeacherProfileByUserId = async (
  userId: string,
): Promise<TeacherProfile> => {
  const normalizedUserId = ensureRequiredIdentifier(userId, "User ID");
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: normalizedUserId },
  });

  if (!teacherProfile) {
    throw new NotFoundError("Teacher profile not found");
  }
  return teacherProfile;
};

export const requireTeacherProfileById = async (
  teacherProfileId: string,
): Promise<TeacherProfile> => {
  const normalizedTeacherProfileId = ensureRequiredIdentifier(
    teacherProfileId,
    "Teacher profile ID",
  );
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { id: normalizedTeacherProfileId },
  });

  if (!teacherProfile) {
    throw new NotFoundError("Teacher profile not found");
  }
  return teacherProfile;
};

export const requireTeacherVerificationById = async (
  verificationId: string,
): Promise<
  TeacherVerification & {
    teacherProfile: TeacherProfile;
  }
> => {
  const normalizedVerificationId = ensureRequiredIdentifier(
    verificationId,
    "Verification ID",
  );
  const verification = await prisma.teacherVerification.findUnique({
    where: { id: normalizedVerificationId },
    include: { teacherProfile: true },
  });

  if (!verification) {
    throw new NotFoundError("Verification not found");
  }
  return verification;
};

const calculateActualTeacherStudentCountMap = async (
  teacherProfileIds: string[],
): Promise<Map<string, number>> => {
  const normalizedTeacherProfileIds = Array.from(
    new Set(teacherProfileIds.map((id) => id.trim()).filter(Boolean)),
  );
  const countMap = new Map<string, number>();

  if (normalizedTeacherProfileIds.length === 0) {
    return countMap;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: buildCurrentEnrollmentWhere(
      {
        package: {
          course: {
            teacherProfileId: { in: normalizedTeacherProfileIds },
          },
        },
      },
      new Date(),
    ),
    select: {
      userId: true,
      package: {
        select: {
          course: { select: { teacherProfileId: true } },
        },
      },
    },
  });

  const studentSetsByTeacher = new Map<string, Set<string>>();
  for (const enrollment of enrollments) {
    const teacherProfileId = enrollment.package.course.teacherProfileId;
    let set = studentSetsByTeacher.get(teacherProfileId);
    if (!set) {
      set = new Set<string>();
      studentSetsByTeacher.set(teacherProfileId, set);
    }
    set.add(enrollment.userId);
  }

  for (const teacherProfileId of normalizedTeacherProfileIds) {
    countMap.set(
      teacherProfileId,
      studentSetsByTeacher.get(teacherProfileId)?.size ?? 0,
    );
  }

  return countMap;
};

export const calculateActualTeacherStudentCount = async (
  teacherProfileId: string,
): Promise<number> => {
  const normalizedTeacherProfileId = ensureRequiredIdentifier(
    teacherProfileId,
    "Teacher profile ID",
  );
  const countMap = await calculateActualTeacherStudentCountMap([
    normalizedTeacherProfileId,
  ]);
  return countMap.get(normalizedTeacherProfileId) ?? 0;
};

export const applyActualTeacherStudentCounts = async <T extends { id: string }>(
  teachers: T[],
): Promise<Array<T & { totalStudents: number }>> => {
  if (teachers.length === 0) return [];

  const countMap = await calculateActualTeacherStudentCountMap(
    teachers.map((teacher) => teacher.id),
  );

  return teachers.map((teacher) => ({
    ...teacher,
    totalStudents: countMap.get(teacher.id) ?? 0,
  }));
};

export const createTeacherNotification = async (params: {
  userId: string;
  title: string;
  message: string;
  type: string;
}) =>
  prisma.notification.create({
    data: {
      userId: ensureRequiredIdentifier(params.userId, "User ID"),
      title: ensureRequiredIdentifier(params.title, "Notification title"),
      message: ensureRequiredIdentifier(params.message, "Notification message"),
      type: ensureRequiredIdentifier(params.type, "Notification type"),
    },
  });
