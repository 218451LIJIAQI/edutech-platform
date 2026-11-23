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
        where: { status: RefundStatus.COMPLETED },
        select: { amount: true },
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

const collectTeacherPaymentSlices = (
  payments: TeacherEarningsPaymentRecord[],
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): ResolvedTeacherPaymentSlice[] => {
  const slices: ResolvedTeacherPaymentSlice[] = [];

  for (const payment of payments) {
    if (
      payment.status !== PaymentStatus.COMPLETED &&
      payment.status !== PaymentStatus.REFUNDED
    ) {
      continue;
    }

    if (payment.packageId) {
      if (payment.status === PaymentStatus.REFUNDED) {
        continue;
      }
      const lessonPackage = payment.package;
      if (lessonPackage?.course?.teacherProfileId === teacherProfileId) {
        slices.push({
          id: payment.id,
          amount: roundMoney(payment.amount),
          teacherEarning: roundMoney(payment.teacherEarning),
          paidAt: payment.paidAt,
          status: payment.status,
          lessonPackage,
          user: payment.user,
        });
      }
      continue;
    }

    const items = payment.order?.items ?? [];
    if (items.length === 0) {
      continue;
    }

    const orderItemsTotal = roundMoney(
      items.reduce((sum, item) => sum + Math.max(0, toNumber(item.finalPrice)), 0),
    );
    const completedRefundTotal = roundMoney(
      (payment.order?.refunds ?? []).reduce(
        (sum, refund) => sum + Math.max(0, toNumber(refund.amount)),
        0,
      ),
    );

    if (
      payment.status === PaymentStatus.REFUNDED ||
      (orderItemsTotal > 0 && completedRefundTotal >= orderItemsTotal)
    ) {
      continue;
    }

    let allocatedRefund = 0;
    items.forEach((item, index) => {
      const isLastItem = index === items.length - 1;
      const itemPrice = roundMoney(Math.max(0, toNumber(item.finalPrice)));
      const itemRefundPortion =
        completedRefundTotal > 0 && orderItemsTotal > 0
          ? isLastItem
            ? roundMoney(completedRefundTotal - allocatedRefund)
            : roundMoney((itemPrice / orderItemsTotal) * completedRefundTotal)
          : 0;
      allocatedRefund = roundMoney(allocatedRefund + itemRefundPortion);

      const lessonPackage = item.package;
      if (lessonPackage?.course?.teacherProfileId !== teacherProfileId) {
        return;
      }

      const netItemAmount = Math.max(
        0,
        roundMoney(itemPrice - itemRefundPortion),
      );
      const grossTeacherEarning = roundMoney(
        calculateTeacherNetEarning(
          itemPrice,
          lessonPackage.course.teacherProfile,
          defaultCommissionRate,
        ),
      );
      const refundedTeacherEarning =
        itemRefundPortion > 0
          ? roundMoney(
              calculateTeacherNetEarning(
                itemRefundPortion,
                lessonPackage.course.teacherProfile,
                defaultCommissionRate,
              ),
            )
          : 0;
      const netTeacherEarning = Math.max(
        0,
        roundMoney(grossTeacherEarning - refundedTeacherEarning),
      );

      slices.push({
        id: `${payment.id}:${item.id}`,
        amount: netItemAmount,
        teacherEarning: netTeacherEarning,
        paidAt: payment.paidAt,
        status: payment.status,
        lessonPackage,
        user: payment.user,
      });
    });
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
