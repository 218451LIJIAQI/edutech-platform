import { Router } from "express";
import { UserRole } from "@prisma/client";
import { body, param } from "express-validator";

import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import cartController from "../controllers/cart.controller";

const router = Router();

const packageIdBodyValidation = body("packageId")
  .notEmpty()
  .withMessage("packageId is required")
  .bail()
  .isUUID()
  .withMessage("Invalid packageId");

const packageIdParamValidation = param("packageId")
  .notEmpty()
  .withMessage("packageId is required")
  .bail()
  .isUUID()
  .withMessage("Invalid packageId");

/**
 * Cart routes.
 *
 * All cart routes are restricted to authenticated students.
 */
router.use(authenticate);
router.use(authorize(UserRole.STUDENT));

router.get("/", cartController.getCart);

router.post(
  "/items",
  validate(packageIdBodyValidation),
  cartController.addItem,
);

router.delete(
  "/items/:packageId",
  validate(packageIdParamValidation),
  cartController.removeItem,
);

router.delete("/clear", cartController.clearCart);

export default router;
