import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

// Type helper for included relations
type CartItemWithPackage = Prisma.CartItemGetPayload<{
  include: { package: { include: { course: true } } };
}>;

const CURRENCY = 'USD' as const;

class CartService {
  /**
   * Get a user's cart with items and total amount.
   */
  async getCart(userId: string) {
    const items: CartItemWithPackage[] = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        package: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    // Use Prisma.Decimal to avoid floating point errors when summing prices
    const totalAmountDecimal = items.reduce((sum: Prisma.Decimal, it) => {
      const price = new Prisma.Decimal(it.package.finalPrice ?? 0);
      const qty = new Prisma.Decimal(it.quantity ?? 0);
      return sum.add(price.mul(qty));
    }, new Prisma.Decimal(0));

    return {
      items,
      totalAmount: Number(totalAmountDecimal.toFixed(2)),
      currency: CURRENCY,
    };
  }

  /**
   * Add a package to the user's cart. If already present, increment quantity by 1.
   */
  async addItem(userId: string, packageId: string) {
    // Validate package exists and is active
    const pkg = await prisma.lessonPackage.findUnique({
      where: { id: packageId },
      include: { course: true },
    });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundError('Package not available');
    }

    // Prevent adding when user is already enrolled in this package
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_packageId: { userId, packageId } },
    });
    if (existingEnrollment && existingEnrollment.isActive) {
      throw new ValidationError('You are already enrolled in this course package.');
    }

    // Upsert to either create or increment quantity atomically
    const item = await prisma.cartItem.upsert({
      where: { userId_packageId: { userId, packageId } },
      update: { quantity: { increment: 1 } },
      create: { userId, packageId, quantity: 1 },
      include: {
        package: { include: { course: true } },
      },
    });

    return item;
  }

  /**
   * Remove a specific package from the user's cart.
   */
  async removeItem(userId: string, packageId: string) {
    const existing = await prisma.cartItem.findUnique({
      where: { userId_packageId: { userId, packageId } },
    });
    if (!existing) {
      throw new NotFoundError('Item not found in cart');
    }

    await prisma.cartItem.delete({
      where: { userId_packageId: { userId, packageId } },
    });
    return { message: 'Removed from cart' };
  }

  /**
   * Clear all items from the user's cart.
   */
  async clearCart(userId: string) {
    await prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'Cart cleared' };
  }
}

export default new CartService();
