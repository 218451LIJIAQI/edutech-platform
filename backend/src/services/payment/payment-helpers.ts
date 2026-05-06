import { PaymentStatus, Prisma } from "@prisma/client";
import type { Course, LessonPackage, TeacherProfile } from "@prisma/client";
import { calculateTeacherNetEarning, toNumber } from "../shared/payment-utils";

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

type TeacherEarningsOrderItem = NonNullable<
  TeacherEarningsPaymentRecord["order"]
>["items"][number];

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

const roundMoney = (value: number): number => Number(value.toFixed(2));

const moneyToNumber = (value: unknown): number => roundMoney(toNumber(value));

const sortByPaidAtDescending = <T extends { paidAt: Date | null }>(
  entries: T[],
) =>
  [...entries].sort(
    (left, right) =>
      new Date(right.paidAt || 0).getTime() -
      new Date(left.paidAt || 0).getTime(),
  );

const getStudentKey = (entry: TeacherEarningsEntry) =>
  entry.user?.id || entry.user?.email || entry.id;

const isCompletedPayment = (payment: TeacherEarningsPaymentRecord) =>
  payment.status === PaymentStatus.COMPLETED;

const createDirectTeacherPayment = (
  payment: TeacherEarningsPaymentRecord,
  teacherProfileId: string,
): TeacherEarningsPayment | null => {
  const lessonPackage = payment.package;
  const course = lessonPackage?.course;

  if (
    !lessonPackage ||
    !course ||
    course.teacherProfileId !== teacherProfileId
  ) {
    return null;
  }

  return {
    id: payment.id,
    amount: moneyToNumber(payment.amount),
    teacherEarning: moneyToNumber(payment.teacherEarning),
    paidAt: payment.paidAt,
    status: payment.status,
    package: lessonPackage,
    user: payment.user,
  };
};

const createOrderItemTeacherPayment = (
  payment: TeacherEarningsPaymentRecord,
  item: TeacherEarningsOrderItem,
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): TeacherEarningsPayment | null => {
  const lessonPackage = item.package;
  const course = lessonPackage?.course;

  if (
    !lessonPackage ||
    !course ||
    course.teacherProfileId !== teacherProfileId
  ) {
    return null;
  }

  return {
    id: `${payment.id}:${item.id}`,
    amount: moneyToNumber(item.finalPrice),
    teacherEarning: roundMoney(
      calculateTeacherNetEarning(
        item.finalPrice,
        course.teacherProfile,
        defaultCommissionRate,
      ),
    ),
    paidAt: payment.paidAt,
    status: payment.status,
    package: lessonPackage,
    user: payment.user,
  };
};

const createDirectCourseEntry = (
  payment: TeacherEarningsPaymentRecord,
  teacherProfileId: string,
): TeacherEarningsEntry | null => {
  const lessonPackage = payment.package;
  const course = lessonPackage?.course;

  if (
    !lessonPackage ||
    !course ||
    course.teacherProfileId !== teacherProfileId
  ) {
    return null;
  }

  return {
    id: payment.id,
    amount: moneyToNumber(payment.amount),
    teacherEarning: moneyToNumber(payment.teacherEarning),
    paidAt: payment.paidAt,
    package: {
      id: lessonPackage.id,
      name: lessonPackage.name,
      finalPrice: moneyToNumber(lessonPackage.finalPrice),
      course: {
        id: course.id,
        title: course.title,
      },
    },
    user: payment.user,
  };
};

const createOrderItemCourseEntry = (
  payment: TeacherEarningsPaymentRecord,
  item: TeacherEarningsOrderItem,
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): TeacherEarningsEntry | null => {
  const lessonPackage = item.package;
  const course = lessonPackage?.course;

  if (
    !lessonPackage ||
    !course ||
    course.teacherProfileId !== teacherProfileId
  ) {
    return null;
  }

  return {
    id: `${payment.id}:${item.id}`,
    amount: moneyToNumber(item.finalPrice),
    teacherEarning: roundMoney(
      calculateTeacherNetEarning(
        item.finalPrice,
        course.teacherProfile,
        defaultCommissionRate,
      ),
    ),
    paidAt: payment.paidAt,
    package: {
      id: lessonPackage.id,
      name: lessonPackage.name,
      finalPrice: moneyToNumber(lessonPackage.finalPrice),
      course: {
        id: course.id,
        title: course.title,
      },
    },
    user: payment.user,
  };
};

export const buildTeacherEarningsTimeline = (
  payments: TeacherEarningsPaymentRecord[],
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): TeacherEarningsPayment[] => {
  const entries: TeacherEarningsPayment[] = [];

  for (const payment of payments) {
    if (!isCompletedPayment(payment)) {
      continue;
    }

    if (payment.packageId) {
      const directPayment = createDirectTeacherPayment(
        payment,
        teacherProfileId,
      );

      if (directPayment) {
        entries.push(directPayment);
      }

      continue;
    }

    if (!payment.order) {
      continue;
    }

    for (const item of payment.order.items) {
      const orderPayment = createOrderItemTeacherPayment(
        payment,
        item,
        teacherProfileId,
        defaultCommissionRate,
      );

      if (orderPayment) {
        entries.push(orderPayment);
      }
    }
  }

  return sortByPaidAtDescending(entries);
};

export const buildTeacherCourseEarningsSummary = (
  payments: TeacherEarningsPaymentRecord[],
  teacherProfileId: string,
  defaultCommissionRate: unknown,
): TeacherCourseEarningsSummary => {
  const entries: TeacherEarningsEntry[] = [];
  const courseEarningsMap = new Map<string, TeacherCourseEarningsGroup>();
  const studentKeysByCourseId = new Map<string, Set<string>>();

  const pushToCourse = (entry: TeacherEarningsEntry) => {
    const courseId = entry.package.course.id;
    const courseTitle = entry.package.course.title;

    if (!courseEarningsMap.has(courseId)) {
      courseEarningsMap.set(courseId, {
        courseId,
        courseTitle,
        totalEarnings: 0,
        totalStudents: 0,
        payments: [],
      });
    }

    if (!studentKeysByCourseId.has(courseId)) {
      studentKeysByCourseId.set(courseId, new Set<string>());
    }

    const courseGroup = courseEarningsMap.get(courseId);
    const studentSet = studentKeysByCourseId.get(courseId);

    if (!courseGroup || !studentSet) {
      return;
    }

    studentSet.add(getStudentKey(entry));

    courseGroup.totalEarnings += entry.teacherEarning;
    courseGroup.totalStudents = studentSet.size;
    courseGroup.payments.push(entry);
  };

  for (const payment of payments) {
    if (!isCompletedPayment(payment)) {
      continue;
    }

    if (payment.packageId) {
      const directEntry = createDirectCourseEntry(payment, teacherProfileId);

      if (directEntry) {
        entries.push(directEntry);
        pushToCourse(directEntry);
      }

      continue;
    }

    if (!payment.order) {
      continue;
    }

    for (const item of payment.order.items) {
      const orderEntry = createOrderItemCourseEntry(
        payment,
        item,
        teacherProfileId,
        defaultCommissionRate,
      );

      if (!orderEntry) {
        continue;
      }

      entries.push(orderEntry);
      pushToCourse(orderEntry);
    }
  }

  const sortedEntries = sortByPaidAtDescending(entries);
  const uniqueStudentKeys = new Set(sortedEntries.map(getStudentKey));

  const courseEarnings = Array.from(courseEarningsMap.values())
    .map((courseGroup) => ({
      ...courseGroup,
      totalEarnings: roundMoney(courseGroup.totalEarnings),
      payments: sortByPaidAtDescending(courseGroup.payments),
    }))
    .sort((left, right) => right.totalEarnings - left.totalEarnings);

  const totalEarnings = roundMoney(
    sortedEntries.reduce((sum, entry) => sum + entry.teacherEarning, 0),
  );

  return {
    totalEarnings,
    totalCourses: courseEarnings.length,
    totalStudents: uniqueStudentKeys.size,
    courseEarnings,
    recentPayments: sortedEntries.slice(0, 10),
  };
};
