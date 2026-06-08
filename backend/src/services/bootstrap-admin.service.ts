import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import prisma from "../config/database";
import logger from "../utils/logger";

const BOOTSTRAP_ADMIN_EMAIL_KEY = "BOOTSTRAP_ADMIN_EMAIL";
const BOOTSTRAP_ADMIN_PASSWORD_KEY = "BOOTSTRAP_ADMIN_PASSWORD";
const BCRYPT_SALT_ROUNDS = 12;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const bootstrapAdminAccount = async (): Promise<void> => {
  const rawEmail = process.env[BOOTSTRAP_ADMIN_EMAIL_KEY];
  const password = process.env[BOOTSTRAP_ADMIN_PASSWORD_KEY];

  if (!rawEmail && !password) {
    return;
  }

  if (!rawEmail || !password) {
    logger.warn(
      "Admin bootstrap skipped because email or password is missing",
      {
        hasEmail: Boolean(rawEmail),
        hasPassword: Boolean(password),
      },
    );
    return;
  }

  const email = normalizeEmail(rawEmail);

  if (!email || !email.includes("@")) {
    logger.warn("Admin bootstrap skipped because email is invalid");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
    },
    update: {
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  logger.info("Admin bootstrap completed", {
    userId: admin.id,
    email: admin.email,
    role: admin.role,
  });
};
