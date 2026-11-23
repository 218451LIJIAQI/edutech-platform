import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import cartService from "../services/cart.service";
import {
  parseRequiredParam,
  parseRequiredString,
  requireAuthUserId,
  sendCreated,
  sendSuccess,
} from "../utils/http";

class CartController {
  getCart = asyncHandler(async (req: Request, res: Response) => {
    const cart = await cartService.getCart(requireAuthUserId(req));
    sendSuccess(res, cart);
  });

  addItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await cartService.addItem(
      requireAuthUserId(req),
      parseRequiredString(req.body?.packageId, "packageId"),
    );
    sendCreated(res, item, "Added to cart successfully");
  });

  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.removeItem(
      requireAuthUserId(req),
      parseRequiredParam(req.params.packageId, "packageId"),
    );
    sendSuccess(
      res,
      undefined,
      result.message || "Item removed from cart successfully",
    );
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    const result = await cartService.clearCart(requireAuthUserId(req));
    sendSuccess(res, undefined, result.message || "Cart cleared successfully");
  });
}

export default new CartController();
