import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import cartService from '../services/cart.service';
import { AuthenticationError, BadRequestError } from '../utils/errors';

class CartController {
  /**
   * Get current user's cart
   * GET /api/cart
   */
  getCart = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    const cart = await cartService.getCart(userId);
    res.status(200).json({ status: 'success', data: cart });
  });

  /**
   * Add item to cart
   * POST /api/cart/items
   */
  addItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    const { packageId } = req.body as { packageId: string };
    if (!packageId || typeof packageId !== 'string' || packageId.trim().length === 0) {
      throw new BadRequestError('packageId is required and must be a non-empty string');
    }
    const item = await cartService.addItem(userId, packageId);
    res
      .status(201)
      .json({ status: 'success', message: 'Added to cart', data: item });
  });

  /**
   * Remove item from cart
   * DELETE /api/cart/items/:packageId
   */
  removeItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    const { packageId } = req.params;
    if (!packageId || typeof packageId !== 'string' || packageId.trim().length === 0) {
      throw new BadRequestError('packageId is required and must be a non-empty string');
    }
    const result = await cartService.removeItem(userId, packageId);
    res.status(200).json({ status: 'success', message: result.message });
  });

  /**
   * Clear cart
   * DELETE /api/cart/clear
   */
  clearCart = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    const userId = req.user.id;
    const result = await cartService.clearCart(userId);
    res.status(200).json({ status: 'success', message: result.message });
  });
}

export default new CartController();
