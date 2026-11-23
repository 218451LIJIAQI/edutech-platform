import type { Prisma } from "@prisma/client";
import { ValidationError } from "../../utils/errors";

type EnrollmentReader = Pick<Prisma.TransactionClient, "enrollment">;

export type EnrollmentLifecycleRecord = {
  isActive: boolean;
  expiresAt: Date | null;
};

export const buildCurrentEnrollmentWhere = (
  scope: Prisma.EnrollmentWhereInput = {},
  referenceDate: Date = new Date(),
): Prisma.EnrollmentWhereInput => ({
  AND: [
    scope,
    { isActive: true },
    {
      OR: [{ expiresAt: null }, { expiresAt: { gt: referenceDate } }],
    },
  ],
});

export const isEnrollmentCurrentlyActive = (
  enrollment: EnrollmentLifecycleRecord | null | undefined,
  referenceDate: Date = new Date(),
): boolean => {
  if (!enrollment || !enrollment.isActive) {
    return false;
  }

  if (!enrollment.expiresAt) {
    return true;
  }

  return enrollment.expiresAt.getTime() > referenceDate.getTime();
};

export const countActivePackageEnrollments = async (
  client: EnrollmentReader,
  packageId: string,
  referenceDate: Date = new Date(),
): Promise<number> => {
  const normalizedPackageId = packageId.trim();
  if (!normalizedPackageId) {
    return 0;
  }

  return client.enrollment.count({
    where: buildCurrentEnrollmentWhere(
      { packageId: normalizedPackageId },
      referenceDate,
    ),
  });
};

export const assertPackageHasCapacity = async (
  client: EnrollmentReader,
  pkg: { id: string; maxStudents: number | null },
  referenceDate: Date = new Date(),
): Promise<void> => {
  if (pkg.maxStudents === null || pkg.maxStudents === undefined) {
    return;
  }

  const activeCount = await countActivePackageEnrollments(
    client,
    pkg.id,
    referenceDate,
  );

  if (activeCount >= pkg.maxStudents) {
    throw new ValidationError(
      "This package has reached its maximum student capacity",
    );
  }
};

export const parseCompletedLessonIdsJson = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  return normalized;
};

export const countDistinctActiveStudentsForTeacherProfile = async (
  client: EnrollmentReader,
  teacherProfileId: string,
  referenceDate: Date = new Date(),
): Promise<number> => {
  const normalizedTeacherProfileId = teacherProfileId.trim();

  if (!normalizedTeacherProfileId) {
    return 0;
  }

  const activeStudents = await client.enrollment.findMany({
    where: buildCurrentEnrollmentWhere(
      {
        package: {
          course: {
            teacherProfileId: normalizedTeacherProfileId,
          },
        },
      },
      referenceDate,
    ),
    select: { userId: true },
    distinct: ["userId"],
  });

  return activeStudents.length;
};
