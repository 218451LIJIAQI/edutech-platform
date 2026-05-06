import { Request, Response } from "express";
import asyncHandler from "../utils/async-handler";
import cartService from "../services/cart.service";
import { AuthenticationError, BadRequestError } from "../utils/errors";

/**
 * Cart Controller
 * Handles HTTP requests for cart-related endpoints.
 */

const sendSuccess = (
  res: Response,
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  res.status(statusCode).json({
    status: "success",
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  });
};

const getAuthenticatedUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthenticationError("Authentication required");
  }

  return req.user.id;
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${fieldName} is required and must be a string`);
  }

  const parsed = value.trim();

  if (parsed.length === 0) {
    throw new BadRequestError(`${fieldName} is required and cannot be empty`);
  }

  return parsed;
};

class CartController {
  /**
   * Get current user's cart.
   * GET /api/cart
   */
  getCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const cart = await cartService.getCart(userId);

    sendSuccess(res, cart);
  });

  /**
   * Add item to cart.
   * POST /api/cart/items
   */
  addItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const packageId = parseRequiredString(req.body?.packageId, "packageId");

    const item = await cartService.addItem(userId, packageId);

    sendSuccess(res, item, "Added to cart successfully", 201);
  });

  /**
   * Remove item from cart.
   * DELETE /api/cart/items/:packageId
   */
  removeItem = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const packageId = parseRequiredString(req.params.packageId, "packageId");

    const result = await cartService.removeItem(userId, packageId);

    sendSuccess(
      res,
      undefined,
      result.message || "Item removed from cart successfully",
    );
  });

  /**
   * Clear current user's cart.
   * DELETE /api/cart/clear
   */
  clearCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);

    const result = await cartService.clearCart(userId);

    sendSuccess(res, undefined, result.message || "Cart cleared successfully");
  });
}

export default new CartController();
