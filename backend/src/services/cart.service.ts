import { Prisma, UserRole } from "@prisma/client";
import prisma from "../config/database";
import { NotFoundError, ValidationError } from "../utils/errors";
import { buildCurrentEnrollmentWhere } from "./shared/enrollment-access";

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

type CartItemWithPackage = Prisma.CartItemGetPayload<{
  include: {
    package: {
      include: {
        course: true;
      };
    };
  };
}>;

const CURRENCY = "USD" as const;
const SINGLE_PACKAGE_CART_QUANTITY = 1;

const ensureActiveStudent = async (
  client: PrismaClientOrTransaction,
  userId: string,
) => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!user.isActive) {
    throw new ValidationError("Inactive users cannot use the cart");
  }

  if (user.role !== UserRole.STUDENT) {
    throw new ValidationError("Only students can use the cart");
  }

  return user;
};

const normalizeCartQuantities = async (
  client: PrismaClientOrTransaction,
  userId: string,
) => {
  await client.cartItem.updateMany({
    where: {
      userId,
      NOT: { quantity: SINGLE_PACKAGE_CART_QUANTITY },
    },
    data: {
      quantity: SINGLE_PACKAGE_CART_QUANTITY,
    },
  });
};

const pruneUnavailableCartItems = async (
  client: PrismaClientOrTransaction,
  userId: string,
) => {
  await client.cartItem.deleteMany({
    where: {
      userId,
      OR: [
        {
          package: {
            isActive: false,
          },
        },
        {
          package: {
            course: {
              isPublished: false,
            },
          },
        },
      ],
    },
  });
};

const pruneOwnedCartItems = async (
  client: PrismaClientOrTransaction,
  userId: string,
  referenceDate: Date = new Date(),
) => {
  const activeEnrollments = await client.enrollment.findMany({
    where: buildCurrentEnrollmentWhere({ userId }, referenceDate),
    select: {
      package: {
        select: {
          courseId: true,
        },
      },
    },
  });

  const ownedCourseIds = [
    ...new Set(
      activeEnrollments.map((enrollment) => enrollment.package.courseId),
    ),
  ];

  if (ownedCourseIds.length === 0) {
    return;
  }

  await client.cartItem.deleteMany({
    where: {
      userId,
      package: {
        courseId: { in: ownedCourseIds },
      },
    },
  });
};

const normalizeCourseSelections = async (
  client: PrismaClientOrTransaction,
  userId: string,
) => {
  const items = await client.cartItem.findMany({
    where: { userId },
    select: {
      id: true,
      addedAt: true,
      package: {
        select: {
          courseId: true,
        },
      },
    },
    orderBy: [{ addedAt: "desc" }, { id: "desc" }],
  });

  const seenCourseIds = new Set<string>();
  const duplicateItemIds: string[] = [];

  for (const item of items) {
    const courseId = item.package.courseId;

    if (seenCourseIds.has(courseId)) {
      duplicateItemIds.push(item.id);
      continue;
    }

    seenCourseIds.add(courseId);
  }

  if (duplicateItemIds.length === 0) {
    return;
  }

  await client.cartItem.deleteMany({
    where: {
      id: { in: duplicateItemIds },
    },
  });
};

const sanitizeCart = async (
  client: PrismaClientOrTransaction,
  userId: string,
  referenceDate: Date = new Date(),
) => {
  await pruneUnavailableCartItems(client, userId);
  await pruneOwnedCartItems(client, userId, referenceDate);
  await normalizeCartQuantities(client, userId);
  await normalizeCourseSelections(client, userId);
};

const calculateCartTotal = (items: CartItemWithPackage[]) => {
  const totalAmountDecimal = items.reduce((sum, item) => {
    const price = new Prisma.Decimal(item.package.finalPrice);
    const quantity = new Prisma.Decimal(
      item.quantity || SINGLE_PACKAGE_CART_QUANTITY,
    );

    return sum.add(price.mul(quantity));
  }, new Prisma.Decimal(0));

  return Number(totalAmountDecimal.toFixed(2));
};

class CartService {
  /**
   * Get the current student's cart with valid items only.
   */
  async getCart(userId: string) {
    await ensureActiveStudent(prisma, userId);
    await sanitizeCart(prisma, userId);

    const items: CartItemWithPackage[] = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        package: {
          include: {
            course: true,
          },
        },
      },
      orderBy: [{ addedAt: "desc" }, { id: "desc" }],
    });

    return {
      items,
      totalAmount: calculateCartTotal(items),
      currency: CURRENCY,
    };
  }

  /**
   * Add a package to the student's cart.
   * A student may only keep one package per course in the cart.
   */
  async addItem(userId: string, packageId: string) {
    const referenceDate = new Date();

    return prisma.$transaction(async (tx) => {
      await ensureActiveStudent(tx, userId);

      const pkg = await tx.lessonPackage.findUnique({
        where: { id: packageId },
        include: {
          course: true,
        },
      });

      if (!pkg || !pkg.isActive || !pkg.course?.isPublished) {
        throw new NotFoundError("Package not available");
      }

      const existingEnrollment = await tx.enrollment.findFirst({
        where: buildCurrentEnrollmentWhere(
          {
            userId,
            package: {
              courseId: pkg.courseId,
            },
          },
          referenceDate,
        ),
        select: {
          id: true,
        },
      });

      if (existingEnrollment) {
        throw new ValidationError(
          "You already have active access to this course.",
        );
      }

      await sanitizeCart(tx, userId, referenceDate);

      await tx.cartItem.deleteMany({
        where: {
          userId,
          package: {
            courseId: pkg.courseId,
          },
          NOT: {
            packageId,
          },
        },
      });

      const item = await tx.cartItem.upsert({
        where: {
          userId_packageId: {
            userId,
            packageId,
          },
        },
        update: {
          quantity: SINGLE_PACKAGE_CART_QUANTITY,
        },
        create: {
          userId,
          packageId,
          quantity: SINGLE_PACKAGE_CART_QUANTITY,
        },
        include: {
          package: {
            include: {
              course: true,
            },
          },
        },
      });

      await normalizeCourseSelections(tx, userId);

      return item;
    });
  }

  /**
   * Remove a specific package from the student's cart.
   */
  async removeItem(userId: string, packageId: string) {
    await ensureActiveStudent(prisma, userId);

    const result = await prisma.cartItem.deleteMany({
      where: {
        userId,
        packageId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundError("Item not found in cart");
    }

    return { message: "Removed from cart" };
  }

  /**
   * Clear all items from the student's cart.
   */
  async clearCart(userId: string) {
    await ensureActiveStudent(prisma, userId);

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { message: "Cart cleared" };
  }
}

export default new CartService();
