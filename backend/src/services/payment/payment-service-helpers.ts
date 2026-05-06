import { PaymentStatus, Prisma } from "@prisma/client";
import prisma from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import {
  teacherEarningsPaymentInclude,
  type TeacherEarningsPaymentRecord,
} from "./payment-helpers";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const paymentHistoryTeacherUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

export const cartCheckoutItemInclude = {
  package: {
    include: {
      course: {
        include: {
          teacherProfile: {
            include: {
              user: {
                select: paymentHistoryTeacherUserSelect,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

export const orderPaymentItemsInclude = {
  items: {
    include: {
      package: {
        include: {
          course: {
            include: {
              teacherProfile: {
                include: {
                  user: {
                    select: paymentHistoryTeacherUserSelect,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

const packagePaymentIntentInclude = {
  course: {
    include: {
      teacherProfile: true,
    },
  },
} satisfies Prisma.LessonPackageInclude;

export const paymentConfirmationInclude = {
  package: {
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseType: true,
          thumbnail: true,
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
                  thumbnail: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

export const paymentDetailsInclude = {
  package: {
    include: {
      course: {
        include: {
          teacherProfile: {
            include: {
              user: {
                select: paymentHistoryTeacherUserSelect,
              },
            },
          },
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
                  teacherProfile: {
                    include: {
                      user: {
                        select: paymentHistoryTeacherUserSelect,
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
  },
} satisfies Prisma.PaymentInclude;

export type PaymentDetailsRecord = Prisma.PaymentGetPayload<{
  include: typeof paymentDetailsInclude;
}>;

export const userPaymentHistoryInclude = {
  package: {
    include: {
      course: {
        include: {
          teacherProfile: {
            include: {
              user: {
                select: paymentHistoryTeacherUserSelect,
              },
            },
          },
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
                  teacherProfile: {
                    include: {
                      user: {
                        select: paymentHistoryTeacherUserSelect,
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
  },
} satisfies Prisma.PaymentInclude;

export type UserPaymentHistoryRecord = Prisma.PaymentGetPayload<{
  include: typeof userPaymentHistoryInclude;
}>;

export const ensureRequiredPaymentField = (
  value: string | null | undefined,
  label: string,
) => {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new ValidationError(`${label} is required`);
  }

  return normalizedValue;
};

export const requireAvailableLessonPackage = async (
  packageId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedPackageId = ensureRequiredPaymentField(
    packageId,
    "Package ID",
  );

  const lessonPackage = await client.lessonPackage.findUnique({
    where: {
      id: normalizedPackageId,
    },
    include: packagePaymentIntentInclude,
  });

  if (!lessonPackage) {
    throw new NotFoundError("Package not found");
  }

  if (!lessonPackage.isActive || !lessonPackage.course?.isPublished) {
    throw new ValidationError("This package is no longer available");
  }

  return {
    normalizedPackageId,
    lessonPackage,
  };
};

export const requireTeacherProfileByUserId = async (
  userId: string,
  client: PrismaClientLike = prisma,
) => {
  const normalizedUserId = ensureRequiredPaymentField(userId, "User ID");

  const teacherProfile = await client.teacherProfile.findUnique({
    where: {
      userId: normalizedUserId,
    },
  });

  if (!teacherProfile) {
    throw new NotFoundError("Teacher profile not found");
  }

  return {
    teacherProfile,
  };
};

export const findCompletedTeacherPayments = async (
  teacherProfileId: string,
  client: PrismaClientLike = prisma,
): Promise<TeacherEarningsPaymentRecord[]> => {
  const normalizedTeacherProfileId = ensureRequiredPaymentField(
    teacherProfileId,
    "Teacher profile ID",
  );

  return client.payment.findMany({
    where: {
      status: PaymentStatus.COMPLETED,
      paidAt: {
        not: null,
      },
      OR: [
        {
          package: {
            course: {
              teacherProfileId: normalizedTeacherProfileId,
            },
          },
        },
        {
          order: {
            items: {
              some: {
                package: {
                  course: {
                    teacherProfileId: normalizedTeacherProfileId,
                  },
                },
              },
            },
          },
        },
      ],
    },
    include: teacherEarningsPaymentInclude,
    orderBy: {
      paidAt: "desc",
    },
  });
};
