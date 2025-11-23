import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import cartService from '../services/cart.service';

class CartController {
  getCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cart = await cartService.getCart(userId);
    res.status(200).json({ status: 'success', data: cart });
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { packageId } = req.body as { packageId: string };
    const item = await cartService.addItem(userId, packageId);
    res.status(201).json({ status: 'success', message: 'Added to cart', data: item });
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { packageId } = req.params as { packageId: string };
    const result = await cartService.removeItem(userId, packageId);
    res.status(200).json({ status: 'success', message: result.message });
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await cartService.clearCart(userId);
    res.status(200).json({ status: 'success', message: result.message });
  });
}

export default new CartController();

