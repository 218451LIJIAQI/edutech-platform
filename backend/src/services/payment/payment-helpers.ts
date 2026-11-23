import { PaymentStatus, Prisma, RefundStatus } from "@prisma/client";
import type { Course, LessonPackage, TeacherProfile } from "@prisma/client";
import {
  calculateTeacherNetEarning,
  roundMoney,
  toNumber,
} from "../shared/payment-utils";

const teacherEarningsUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

export const teacherEarningsPaymentInclude = {
  package: {
    include: {
      course: {
        include: {
          teacherProfile: true,
        },
      },
    },
  },
  order: {
    include: {
      refunds: {
        where: {
          status: RefundStatus.COMPLETED,
        },
        select: {
          amount: true,
        },
      },
      items: {
        include: {
          package: {
            include: {
              course: {
                include: {
                  teacherProfile: true,
                },
              },
            },
          },
        },
      },
    },
  },
  user: {
    select: teacherEarningsUserSelect,
  },
} satisfies Prisma.PaymentInclude;

export type TeacherEarningsPaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof teacherEarningsPaymentInclude;
}>;

type TeacherEarningsUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type TeacherEarningsPackageWithCourse = LessonPackage & {
  course: Course & {
    teacherProfile: TeacherProfile | null;
  };
};

export type TeacherEarningsEntry = {
  id: string;
  amount: number;
  teacherEarning: number;
  paidAt: Date | null;
  package: {
    id: string;
    name: string;
    finalPrice: number;
    course: {
      id: string;
      title: string;
    };
  };
  user: TeacherEarningsUser | null;
};

export type TeacherEarningsPayment = {
  id: string;
  amount: number;
  teacherEarning: number;
  paidAt: Date | null;
  status: PaymentStatus;
  package: TeacherEarningsPackageWithCourse | null;
  user: TeacherEarningsUser | null;
};

interface TeacherCourseEarningsGroup {
  courseId: string;
  courseTitle: string;
  totalEarnings: number;
  totalStudents: number;
  payments: TeacherEarningsEntry[];
}

interface TeacherCourseEarningsSummary {
  totalEarnings: number;
  totalCourses: number;
  totalStudents: number;
  courseEarnings: TeacherCourseEarningsGroup[];
  recentPayments: TeacherEarningsEntry[];
}

type ResolvedTeacherPaymentSlice = {
  id: string;
  amount: number;
  teacherEarning: number;
  paidAt: Date | null;
  status: PaymentStatus;
  lessonPackage: TeacherEarningsPackageWithCourse;
  user: TeacherEarningsUser | null;
};

const sortByPaidAtDescending = <T extends { paidAt: Date | null }>(
  entries: T[],
): T[] =>
  [...entries].sort(
    (left, right) =>
      new Date(right.paidAt || 0).getTime() -
      new Date(left.paidAt || 0).getTime(),
  );

const resolvePaymentRetainedRatio = (
  payment: TeacherEarningsPaymentRecord,
): number => {
  if (payment.status !== PaymentStatus.COMPLETED) {
    return 0;
  }

  const grossAmount = toNumber(payment.amount);
  if (grossAmount <= 0) {
    return 1;
  }

  const completedRefundAmount = (payment.order?.refunds ?? []).reduce(
    (sum, refund) => sum + Math.max(0, toNumber(refund.amount)),
    0,
  );

  if (completedRefundAmount <= 0) {
    return 1;
  }

  return Math.max(
    0,
    Math.min(1, (grossAmount - completedRefundAmount) / grossAmount),
  );
};

const collectTeacherPaymentSlices = (
  payments: TeacherEarningsPaymentRecord[],
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): ResolvedTeacherPaymentSlice[] => {
  const slices: ResolvedTeacherPaymentSlice[] = [];

  for (const payment of payments) {
    const retainedRatio = resolvePaymentRetainedRatio(payment);
    if (retainedRatio <= 0) {
      continue;
    }

    if (payment.packageId) {
      const lessonPackage = payment.package;
      if (lessonPackage?.course?.teacherProfileId === teacherProfileId) {
        slices.push({
          id: payment.id,
          amount: roundMoney(toNumber(payment.amount) * retainedRatio),
          teacherEarning: roundMoney(
            toNumber(payment.teacherEarning) * retainedRatio,
          ),
          paidAt: payment.paidAt,
          status: payment.status,
          lessonPackage,
          user: payment.user,
        });
      }
      continue;
    }

    for (const item of payment.order?.items ?? []) {
      const lessonPackage = item.package;
      if (lessonPackage?.course?.teacherProfileId !== teacherProfileId) {
        continue;
      }

      const effectiveItemGross = toNumber(item.finalPrice) * retainedRatio;

      slices.push({
        id: `${payment.id}:${item.id}`,
        amount: roundMoney(effectiveItemGross),
        teacherEarning: roundMoney(
          calculateTeacherNetEarning(
            effectiveItemGross,
            lessonPackage.course.teacherProfile,
            defaultCommissionRate,
          ),
        ),
        paidAt: payment.paidAt,
        status: payment.status,
        lessonPackage,
        user: payment.user,
      });
    }
  }

  return sortByPaidAtDescending(slices);
};

export const buildTeacherEarningsTimeline = (
  payments: TeacherEarningsPaymentRecord[],
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): TeacherEarningsPayment[] =>
  collectTeacherPaymentSlices(
    payments,
    teacherProfileId,
    defaultCommissionRate,
  ).map(({ lessonPackage, ...rest }) => ({
    ...rest,
    package: lessonPackage,
  }));

export const buildTeacherCourseEarningsSummary = (
  payments: TeacherEarningsPaymentRecord[],
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): TeacherCourseEarningsSummary => {
  const sortedEntries: TeacherEarningsEntry[] = collectTeacherPaymentSlices(
    payments,
    teacherProfileId,
    defaultCommissionRate,
  ).map((slice) => ({
    id: slice.id,
    amount: slice.amount,
    teacherEarning: slice.teacherEarning,
    paidAt: slice.paidAt,
    package: {
      id: slice.lessonPackage.id,
      name: slice.lessonPackage.name,
      finalPrice: roundMoney(slice.lessonPackage.finalPrice),
      course: {
        id: slice.lessonPackage.course.id,
        title: slice.lessonPackage.course.title,
      },
    },
    user: slice.user,
  }));

  const getStudentKey = (entry: TeacherEarningsEntry) =>
    entry.user?.id || entry.user?.email || entry.id;

  const courseGroups = new Map<
    string,
    TeacherCourseEarningsGroup & { studentKeys: Set<string> }
  >();

  for (const entry of sortedEntries) {
    const { id: courseId, title: courseTitle } = entry.package.course;
    let group = courseGroups.get(courseId);
    if (!group) {
      group = {
        courseId,
        courseTitle,
        totalEarnings: 0,
        totalStudents: 0,
        payments: [],
        studentKeys: new Set<string>(),
      };
      courseGroups.set(courseId, group);
    }

    group.studentKeys.add(getStudentKey(entry));
    group.totalEarnings += entry.teacherEarning;
    group.totalStudents = group.studentKeys.size;
    group.payments.push(entry);
  }

  const courseEarnings = Array.from(courseGroups.values())
    .map(({ studentKeys: _studentKeys, ...group }) => ({
      ...group,
      totalEarnings: roundMoney(group.totalEarnings),
    }))
    .sort((left, right) => right.totalEarnings - left.totalEarnings);

  return {
    totalEarnings: roundMoney(
      sortedEntries.reduce((sum, entry) => sum + entry.teacherEarning, 0),
    ),
    totalCourses: courseEarnings.length,
    totalStudents: new Set(sortedEntries.map(getStudentKey)).size,
    courseEarnings,
    recentPayments: sortedEntries.slice(0, 10),
  };
};
