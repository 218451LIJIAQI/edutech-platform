import {
  PaymentStatus,
  RefundStatus,
  type Prisma,
} from "@prisma/client";
import {
  allocateOrderItemAmounts,
  calculatePlatformCommission,
  calculateTeacherNetEarning,
  roundMoney,
  toNumber as decimalToNumber,
} from "../shared/payment-utils";

export const recentUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const recentCourseSelect = {
  id: true,
  title: true,
  createdAt: true,
  teacherProfile: {
    select: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.CourseSelect;

export const recentEnrollmentSelect = {
  id: true,
  enrolledAt: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  package: {
    select: {
      course: {
        select: {
          title: true,
        },
      },
    },
  },
} satisfies Prisma.EnrollmentSelect;

export const recentReportSelect = {
  id: true,
  type: true,
  status: true,
  createdAt: true,
  reporter: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ReportSelect;

export const recentPaymentSelect = {
  id: true,
  amount: true,
  paidAt: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  package: {
    select: {
      course: {
        select: {
          title: true,
        },
      },
    },
  },
  order: {
    select: {
      items: {
        select: {
          package: {
            select: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentSelect;

export const settlementPaymentInclude = {
  user: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  package: {
    include: {
      course: {
        include: {
          teacherProfile: {
            include: {
              user: true,
            },
          },
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
                  teacherProfile: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

type RecentUserRecord = Prisma.UserGetPayload<{
  select: typeof recentUserSelect;
}>;

type RecentCourseRecord = Prisma.CourseGetPayload<{
  select: typeof recentCourseSelect;
}>;

type RecentEnrollmentRecord = Prisma.EnrollmentGetPayload<{
  select: typeof recentEnrollmentSelect;
}>;

type RecentReportRecord = Prisma.ReportGetPayload<{
  select: typeof recentReportSelect;
}>;

type RecentPaymentRecord = Prisma.PaymentGetPayload<{
  select: typeof recentPaymentSelect;
}>;

type SettlementPaymentRecord = Prisma.PaymentGetPayload<{
  include: typeof settlementPaymentInclude;
}>;

type RevenueGroupBy = "day" | "week" | "month";

const formatMoney = (value: Prisma.Decimal | number | null | undefined) => {
  return roundMoney(decimalToNumber(value)).toFixed(2);
};

const buildFullName = (
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Unknown User",
): string => {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  return name || fallback;
};

const getUtcDateKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const getUtcMonthKey = (date: Date): string => {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
};

const getUtcWeekStartKey = (date: Date): string => {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const day = utcDate.getUTCDay();
  utcDate.setUTCDate(utcDate.getUTCDate() - day);

  return getUtcDateKey(utcDate);
};

const getRevenueGroupKey = (date: Date, groupBy: RevenueGroupBy): string => {
  if (groupBy === "month") {
    return getUtcMonthKey(date);
  }

  if (groupBy === "week") {
    return getUtcWeekStartKey(date);
  }

  return getUtcDateKey(date);
};

const getFirstPaymentCourseTitle = (payment: RecentPaymentRecord): string => {
  const directCourseTitle = payment.package?.course?.title;

  if (directCourseTitle) {
    return directCourseTitle;
  }

  const firstOrderItemCourseTitle =
    payment.order?.items?.[0]?.package?.course?.title;

  return firstOrderItemCourseTitle || "a course";
};

export const createCompletedPaymentWhere = (
  startDate?: Date,
  endDate?: Date,
): Prisma.PaymentWhereInput => {
  const paidAt: Prisma.DateTimeNullableFilter = {
    not: null,
  };

  if (startDate) {
    paidAt.gte = startDate;
  }

  if (endDate) {
    paidAt.lte = endDate;
  }

  return {
    status: PaymentStatus.COMPLETED,
    paidAt,
  };
};

export const createPaidOrRefundedPaymentWhere = (
  startDate?: Date,
  endDate?: Date,
): Prisma.PaymentWhereInput => {
  const paidAt: Prisma.DateTimeNullableFilter = {
    not: null,
  };

  if (startDate) {
    paidAt.gte = startDate;
  }

  if (endDate) {
    paidAt.lte = endDate;
  }

  return {
    status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
    paidAt,
  };
};

export const createPaymentUserRelationFilter = (
  search?: string,
): NonNullable<Prisma.PaymentWhereInput["user"]> | undefined => {
  const keyword = search?.trim();

  if (!keyword) {
    return undefined;
  }

  return {
    is: {
      OR: [
        {
          firstName: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: keyword,
            mode: "insensitive",
          },
        },
      ],
    },
  };
};

interface ActivityFeedItem {
  id: string;
  type:
    | "user_registered"
    | "course_created"
    | "enrollment_created"
    | "report_submitted"
    | "payment_completed";
  createdAt: Date;
  description: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export const buildRecentActivities = ({
  recentUsers,
  recentCourses,
  recentEnrollments,
  recentReports,
  recentPayments,
  page,
  limit,
}: {
  recentUsers: RecentUserRecord[];
  recentCourses: RecentCourseRecord[];
  recentEnrollments: RecentEnrollmentRecord[];
  recentReports: RecentReportRecord[];
  recentPayments: RecentPaymentRecord[];
  page: number;
  limit: number;
}) => {
  const paymentActivities = recentPayments
    .filter((payment) => payment.paidAt)
    .map((payment) => ({
      id: payment.id,
      type: "payment_completed" as const,
      createdAt: payment.paidAt as Date,
      description: `Payment completed: ${formatMoney(payment.amount)} for ${getFirstPaymentCourseTitle(
        payment,
      )}`,
      user: {
        firstName: payment.user?.firstName || "",
        lastName: payment.user?.lastName || "",
      },
    }));

  const raw: ActivityFeedItem[] = [
    ...recentUsers.map((user) => ({
      id: user.id,
      type: "user_registered" as const,
      createdAt: user.createdAt,
      description: `${buildFullName(
        user.firstName,
        user.lastName,
      )} registered as ${user.role}`,
      user: {
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      },
    })),

    ...recentCourses.map((course) => ({
      id: course.id,
      type: "course_created" as const,
      createdAt: course.createdAt,
      description: `New course created: ${course.title}`,
      user: {
        firstName: course.teacherProfile?.user?.firstName || "",
        lastName: course.teacherProfile?.user?.lastName || "",
      },
    })),

    ...recentEnrollments.map((enrollment) => ({
      id: enrollment.id,
      type: "enrollment_created" as const,
      createdAt: enrollment.enrolledAt,
      description: `${buildFullName(
        enrollment.user?.firstName,
        enrollment.user?.lastName,
      )} enrolled in ${enrollment.package?.course?.title || "a course"}`,
      user: {
        firstName: enrollment.user?.firstName || "",
        lastName: enrollment.user?.lastName || "",
      },
    })),

    ...recentReports.map((report) => ({
      id: report.id,
      type: "report_submitted" as const,
      createdAt: report.createdAt,
      description: `Report submitted: ${report.type} (${report.status})`,
      user: {
        firstName: report.reporter?.firstName || "",
        lastName: report.reporter?.lastName || "",
      },
    })),

    ...paymentActivities,
  ];

  const ordered = raw.sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );

  const total = ordered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = ordered.slice(start, start + limit);
  const hasMore = start + items.length < total;

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore,
    },
  };
};

interface SettlementRow {
  teacherUserId: string;
  teacherName: string;
  teacherEmail?: string;
  totalGross: number;
  platformCommission: number;
  teacherEarning: number;
  transactions: number;
}

const getOrCreateSettlementRow = (
  rows: Map<string, SettlementRow>,
  teacherUserId: string,
  teacherName: string,
  teacherEmail?: string,
) => {
  if (!rows.has(teacherUserId)) {
    rows.set(teacherUserId, {
      teacherUserId,
      teacherName,
      teacherEmail,
      totalGross: 0,
      platformCommission: 0,
      teacherEarning: 0,
      transactions: 0,
    });
  }

  return rows.get(teacherUserId)!;
};

const normalizeSettlementRows = (rows: SettlementRow[]): SettlementRow[] => {
  return rows.map((row) => ({
    ...row,
    totalGross: roundMoney(row.totalGross),
    platformCommission: roundMoney(row.platformCommission),
    teacherEarning: roundMoney(row.teacherEarning),
  }));
};

const getNetOrderItemsWithSplits = (
  payment: SettlementPaymentRecord,
  defaultCommissionRate: number,
) => {
  const items = payment.order?.items ?? [];
  if (items.length === 0) return [];

  const orderItemsTotal = roundMoney(
    items.reduce(
      (sum, item) => sum + Math.max(0, decimalToNumber(item.finalPrice)),
      0,
    ),
  );
  const completedRefundTotal = roundMoney(
    (payment.order?.refunds ?? []).reduce(
      (sum, refund) => sum + Math.max(0, decimalToNumber(refund.amount)),
      0,
    ),
  );

  if (
    payment.status === PaymentStatus.REFUNDED ||
    (orderItemsTotal > 0 && completedRefundTotal >= orderItemsTotal)
  ) {
    return [];
  }

  return allocateOrderItemAmounts(items, completedRefundTotal).map(
    ({ item, itemPrice, allocatedAmount: itemRefundPortion }) => {

    const netGross = Math.max(0, roundMoney(itemPrice - itemRefundPortion));
    const teacherProfile = item.package.course?.teacherProfile ?? null;
    const grossCommission = calculatePlatformCommission(
      itemPrice,
      teacherProfile,
      defaultCommissionRate,
    );
    const grossTeacher = calculateTeacherNetEarning(
      itemPrice,
      teacherProfile,
      defaultCommissionRate,
    );
    const refundCommission =
      itemRefundPortion > 0
        ? calculatePlatformCommission(
            itemRefundPortion,
            teacherProfile,
            defaultCommissionRate,
          )
        : 0;
    const refundTeacher =
      itemRefundPortion > 0
        ? calculateTeacherNetEarning(
            itemRefundPortion,
            teacherProfile,
            defaultCommissionRate,
          )
        : 0;
    const platformCommission = Math.max(
      0,
      roundMoney(grossCommission - refundCommission),
    );
    const teacherEarning = Math.max(
      0,
      roundMoney(grossTeacher - refundTeacher),
    );

    return {
      item,
      netGross,
      platformCommission,
      teacherEarning,
    };
  });
};

export const buildSettlementRows = ({
  payments,
  defaultCommissionRate,
  page,
  limit,
}: {
  payments: SettlementPaymentRecord[];
  defaultCommissionRate: number;
  page: number;
  limit: number;
}) => {
  const rows = new Map<string, SettlementRow>();

  for (const payment of payments) {
    if (payment.status === PaymentStatus.REFUNDED) {
      continue;
    }

    if (payment.orderId && payment.order) {
      const netItems = getNetOrderItemsWithSplits(
        payment,
        defaultCommissionRate,
      );
      for (const {
        item,
        netGross,
        platformCommission,
        teacherEarning,
      } of netItems) {
        const course = item.package.course;
        const teacherProfile = course?.teacherProfile;

        if (!teacherProfile) {
          continue;
        }

        const settlementRow = getOrCreateSettlementRow(
          rows,
          teacherProfile.userId,
          buildFullName(
            teacherProfile.user.firstName,
            teacherProfile.user.lastName,
            "Unknown Teacher",
          ),
          teacherProfile.user.email || undefined,
        );

        settlementRow.totalGross += netGross;
        settlementRow.platformCommission += platformCommission;
        settlementRow.teacherEarning += teacherEarning;
        settlementRow.transactions += 1;
      }

      continue;
    }

    const directTeacherProfile = payment.package?.course?.teacherProfile;

    if (!directTeacherProfile) {
      continue;
    }

    const directRow = getOrCreateSettlementRow(
      rows,
      directTeacherProfile.userId,
      buildFullName(
        directTeacherProfile.user.firstName,
        directTeacherProfile.user.lastName,
        "Unknown Teacher",
      ),
      directTeacherProfile.user.email || undefined,
    );

    directRow.totalGross += decimalToNumber(payment.amount);
    directRow.platformCommission += decimalToNumber(payment.platformCommission);
    directRow.teacherEarning += decimalToNumber(payment.teacherEarning);
    directRow.transactions += 1;
  }

  const orderedRows = normalizeSettlementRows(
    Array.from(rows.values()).sort(
      (left, right) => right.teacherEarning - left.teacherEarning,
    ),
  );

  const total = orderedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = orderedRows.slice(start, start + limit);
  const hasMore = start + items.length < total;

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore,
    },
  };
};

interface RevenueTrendRow {
  date: string;
  totalRevenue: number;
  platformEarnings: number;
  teacherEarnings: number;
}

interface TeacherRevenueRow {
  id: string;
  name: string;
  earnings: number;
}

interface CourseRevenueRow {
  id: string;
  title: string;
  revenue: number;
}

interface RevenueBreakdownRow {
  type: string;
  revenue: number;
}

type CourseForRevenue = NonNullable<
  NonNullable<SettlementPaymentRecord["package"]>["course"]
>;

const roundRevenueTrendRows = (rows: RevenueTrendRow[]) =>
  rows.map((row) => ({
    ...row,
    totalRevenue: roundMoney(row.totalRevenue),
    platformEarnings: roundMoney(row.platformEarnings),
    teacherEarnings: roundMoney(row.teacherEarnings),
  }));

const roundTeacherRows = (rows: TeacherRevenueRow[]) =>
  rows.map((row) => ({
    ...row,
    earnings: roundMoney(row.earnings),
  }));

const roundCourseRows = (rows: CourseRevenueRow[]) =>
  rows.map((row) => ({
    ...row,
    revenue: roundMoney(row.revenue),
  }));

const roundBreakdownRows = (rows: RevenueBreakdownRow[]) =>
  rows.map((row) => ({
    ...row,
    revenue: roundMoney(row.revenue),
  }));

export const buildRevenueAnalytics = ({
  payments,
  groupBy,
  defaultCommissionRate,
}: {
  payments: SettlementPaymentRecord[];
  groupBy: RevenueGroupBy;
  defaultCommissionRate: number;
}) => {
  const trendMap = new Map<string, RevenueTrendRow>();
  const teacherMap = new Map<string, TeacherRevenueRow>();
  const courseMap = new Map<string, CourseRevenueRow>();
  const breakdownMap = new Map<string, RevenueBreakdownRow>();

  const accumulateTrend = (
    paidAt: Date | null,
    totalRevenue: number,
    platformEarnings: number,
    teacherEarnings: number,
  ) => {
    if (!paidAt) {
      return;
    }

    const trendKey = getRevenueGroupKey(paidAt, groupBy);

    if (!trendMap.has(trendKey)) {
      trendMap.set(trendKey, {
        date: trendKey,
        totalRevenue: 0,
        platformEarnings: 0,
        teacherEarnings: 0,
      });
    }

    const trend = trendMap.get(trendKey)!;
    trend.totalRevenue += totalRevenue;
    trend.platformEarnings += platformEarnings;
    trend.teacherEarnings += teacherEarnings;
  };

  const accumulateCourseRevenue = ({
    finalPrice,
    course,
    teacherEarning,
  }: {
    finalPrice: number;
    course: CourseForRevenue | null | undefined;
    teacherEarning?: number;
  }) => {
    if (!course?.teacherProfile) {
      return;
    }

    const teacherProfile = course.teacherProfile;
    const teacher = teacherProfile.user;
    const teacherId = teacher.id;

    const calculatedTeacherEarning =
      teacherEarning ??
      calculateTeacherNetEarning(
        finalPrice,
        teacherProfile,
        defaultCommissionRate,
      );

    if (!teacherMap.has(teacherId)) {
      teacherMap.set(teacherId, {
        id: teacherId,
        name: buildFullName(
          teacher.firstName,
          teacher.lastName,
          "Unknown Teacher",
        ),
        earnings: 0,
      });
    }

    teacherMap.get(teacherId)!.earnings += calculatedTeacherEarning;

    if (!courseMap.has(course.id)) {
      courseMap.set(course.id, {
        id: course.id,
        title: course.title,
        revenue: 0,
      });
    }

    courseMap.get(course.id)!.revenue += finalPrice;

    if (!breakdownMap.has(course.courseType)) {
      breakdownMap.set(course.courseType, {
        type: course.courseType,
        revenue: 0,
      });
    }

    breakdownMap.get(course.courseType)!.revenue += finalPrice;
  };

  for (const payment of payments) {
    if (payment.status === PaymentStatus.REFUNDED) {
      continue;
    }

    if (payment.order) {
      const netItems = getNetOrderItemsWithSplits(
        payment,
        defaultCommissionRate,
      );
      if (netItems.length === 0) {
        continue;
      }

      const netOrderTotal = netItems.reduce(
        (sum, entry) => sum + entry.netGross,
        0,
      );
      const netPlatformTotal = netItems.reduce(
        (sum, entry) => sum + entry.platformCommission,
        0,
      );
      const netTeacherTotal = netItems.reduce(
        (sum, entry) => sum + entry.teacherEarning,
        0,
      );

      accumulateTrend(
        payment.paidAt,
        netOrderTotal,
        netPlatformTotal,
        netTeacherTotal,
      );

      for (const entry of netItems) {
        accumulateCourseRevenue({
          finalPrice: entry.netGross,
          teacherEarning: entry.teacherEarning,
          course: entry.item.package.course,
        });
      }

      continue;
    }

    const directRevenue = decimalToNumber(payment.amount);
    const directPlatform = decimalToNumber(payment.platformCommission);
    const directTeacher = decimalToNumber(payment.teacherEarning);

    accumulateTrend(
      payment.paidAt,
      directRevenue,
      directPlatform,
      directTeacher,
    );

    if (payment.package?.course) {
      accumulateCourseRevenue({
        finalPrice: directRevenue,
        teacherEarning: directTeacher,
        course: payment.package.course,
      });
    }
  }

  return {
    revenueTrend: roundRevenueTrendRows(
      Array.from(trendMap.values()).sort((left, right) =>
        left.date.localeCompare(right.date),
      ),
    ),

    topTeachers: roundTeacherRows(
      Array.from(teacherMap.values())
        .sort((left, right) => right.earnings - left.earnings)
        .slice(0, 5),
    ),

    topCourses: roundCourseRows(
      Array.from(courseMap.values())
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 5),
    ),

    revenueBreakdown: roundBreakdownRows(Array.from(breakdownMap.values())),
  };
};
