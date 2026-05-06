import type { Prisma } from "@prisma/client";

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
