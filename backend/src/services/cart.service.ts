import prisma from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';

class CartService {
  async getCart(userId: string) {
    const items = await prisma.cartItem.findMany({
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

    const totalAmount = items.reduce((sum, it) => sum + (it.package.finalPrice * it.quantity), 0);

    return {
      items,
      totalAmount,
      currency: 'USD',
    };
  }

  async addItem(userId: string, packageId: string) {
    // Validate package
    const pkg = await prisma.lessonPackage.findUnique({ where: { id: packageId }, include: { course: true } });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundError('Package not available');
    }

    // Check if user is already enrolled in this package
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_packageId: { userId, packageId } },
    });
    if (existingEnrollment && existingEnrollment.isActive) {
      throw new ValidationError('You are already enrolled in this course package.');
    }

    // Prevent adding same course twice with different packages? For MVP, allow multiple packages from same course.

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

  async removeItem(userId: string, packageId: string) {
    const existing = await prisma.cartItem.findUnique({ where: { userId_packageId: { userId, packageId } } });
    if (!existing) {
      throw new NotFoundError('Item not found in cart');
    }
    await prisma.cartItem.delete({ where: { userId_packageId: { userId, packageId } } });
    return { message: 'Removed from cart' };
  }

  async clearCart(userId: string) {
    await prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'Cart cleared' };
  }
}

export default new CartService();

