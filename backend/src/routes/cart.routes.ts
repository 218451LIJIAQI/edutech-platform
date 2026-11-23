import { Router } from "express";
import { validate } from "../middleware/validate";
import { studentOnly } from "../middleware/teacher-access";
import { uuidBodyField, uuidParam } from "../validators/common.validator";
import cartController from "../controllers/cart.controller";

const router = Router();

router.use(studentOnly);

router.get("/", cartController.getCart);

router.post(
  "/items",
  validate(uuidBodyField("packageId")),
  cartController.addItem,
);

router.delete(
  "/items/:packageId",
  validate(uuidParam("packageId")),
  cartController.removeItem,
);

router.delete("/clear", cartController.clearCart);

export default router;
