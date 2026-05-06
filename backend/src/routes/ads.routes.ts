import { Router } from "express";

import adsController from "../controllers/ads.controller";
import { optionalAuth } from "../middleware/auth";

const router = Router();

/**
 * Public advertising routes.
 *
 * Login promotions are shown before users sign in, so authentication is not required.
 * If a valid bearer token is present, role-targeted ads can be resolved from it.
 */
router.get("/login-promotions", optionalAuth, adsController.getLoginPromotions);

export default router;
