import { PaymentStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { NotFoundError, ValidationError } from "../utils/errors";
import {
  adminAuditLogInclude,
  adminUserListSelect,
  assertTeacherHasNoActiveStudents,
  assertTeacherProfileCanBeRemoved,
  buildAdminUserOrderBy,
  buildAdminUserWhere,
  buildUserAuditLogWhere,
  collectImpactedTeacherUserIdsForStudent,
  collectImpactedTeacherUserIdsForStudents,
  createApprovedTeacherProfileData,
  createUserAuditLog,
  ensureAdminManageableRole,
  ensureEmailAvailable,
  ensureNotAdminUser,
  ensureStrongPassword,
  recalculateTeacherStudentCounts,
  requireUser,
} from "./admin/admin-user-helpers";
import { buildPaginationMeta, normalizePagination } from "./shared/pagination";
import {
  ensureUrlOrUploadPathForFolders,
  normalizeOptionalUrlOrPath,
} from "../utils/url-or-path";
import { shouldInvalidateSessions } from "../utils/auth-session";
import {
  normalizeCanonicalEmail,
  sanitizeUserPlainText,
} from "../utils/sanitize-user-content";

const AVATAR_URL_ERROR =
  "Avatar must be an external URL or use the /uploads/avatars/ folder";

const normalizeAdminAvatarUrl = (
  value: string | null | undefined,
): string | null | undefined => {
  const normalizedValue = normalizeOptionalUrlOrPath(value);

  return normalizedValue
    ? ensureUrlOrUploadPathForFolders(
        normalizedValue,
        ["avatars"],
        AVATAR_URL_ERROR,
      )
    : normalizedValue;
};

const normalizeInlineAdminText = (value: string): string =>
  sanitizeUserPlainText(value).replace(/\s+/g, " ");

const normalizeNullableInlineAdminText = (
  value: string | null | undefined,
): string | null | undefined => {
  if (value === undefined || value === null) {
    return value;
  }

  return normalizeInlineAdminText(value) || null;
};

type UserFilters = {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isLocked?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
};

type ProtectedUserDependencyCounts = {
  payments: number;
  orders: number;
  reportsSubmitted: number;
  reportsAgainst: number;
  supportTickets: number;
  supportMessages: number;
  auditLogsAsAdmin: number;
  auditLogsAsUser: number;
  wallets: number;
};

type UserRecordWithPassword = {
  password?: unknown;
};

class AdminService {
  private withoutPassword<T extends UserRecordWithPassword>(
    user: T,
  ): Omit<T, "password"> {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private normalizeUserIds(userIds: string[]) {
    const normalizedIds = [
      ...new Set(userIds.map((id) => id.trim()).filter(Boolean)),
    ];

    if (normalizedIds.length === 0) {
      throw new ValidationError("At least one user ID is required");
    }

    return normalizedIds;
  }

  private async getProtectedUserDependencyCounts(
    userId: string,
  ): Promise<ProtectedUserDependencyCounts> {
    const [
      payments,
      orders,
      reportsSubmitted,
      reportsAgainst,
      supportTickets,
      supportMessages,
      auditLogsAsAdmin,
      auditLogsAsUser,
      wallets,
    ] = await Promise.all([
      prisma.payment.count({ where: { userId } }),
      prisma.order.count({ where: { userId } }),
      prisma.report.count({ where: { reporterId: userId } }),
      prisma.report.count({ where: { reportedId: userId } }),
      prisma.supportTicket.count({ where: { userId } }),
      prisma.supportTicketMessage.count({ where: { senderId: userId } }),
      prisma.userAuditLog.count({ where: { adminId: userId } }),
      prisma.userAuditLog.count({ where: { userId } }),
      prisma.wallet.count({ where: { userId } }),
    ]);

    return {
      payments,
      orders,
      reportsSubmitted,
      reportsAgainst,
      supportTickets,
      supportMessages,
      auditLogsAsAdmin,
      auditLogsAsUser,
      wallets,
    };
  }

  private buildProtectedDependencyMessage(
    counts: ProtectedUserDependencyCounts,
  ) {
    const existingDependencies = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${name}: ${count}`);

    return (
      "Cannot permanently delete this user because protected records exist " +
      `(${existingDependencies.join(", ")}). Deactivate the account instead.`
    );
  }

  private async deactivateUserForDeletion(
    user: { id: string; role: UserRole; isActive: boolean; isLocked: boolean },
    adminId?: string,
  ) {
    const impactedTeacherUserIds =
      user.role === UserRole.STUDENT
        ? await collectImpactedTeacherUserIdsForStudent(user.id)
        : new Set<string>();

    const updatedUser = await prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          isLocked: true,
          lockedUntil: null,
          failedLoginAttempts: 0,
          tokenVersion: { increment: 1 },
          updatedBy: adminId,
        },
      });

      if (adminId) {
        await createUserAuditLog(
          {
            adminId,
            userId: user.id,
            action: "SOFT_DELETE",
            oldValues: {
              isActive: user.isActive,
              isLocked: user.isLocked,
            },
            newValues: {
              isActive: false,
              isLocked: true,
            },
          },
          tx,
        );
      }

      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Account Deactivated",
          message: "Your account has been deactivated by an administrator.",
          type: "account",
        },
      });

      return nextUser;
    });

    await recalculateTeacherStudentCounts(impactedTeacherUserIds);
    return this.withoutPassword(updatedUser);
  }

  async getAllUsers(filters: UserFilters = {}) {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      isLocked,
      createdAfter,
      createdBefore,
    } = filters;

    const pagination = normalizePagination(page, limit, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const where = buildAdminUserWhere({
      role,
      isActive,
      search,
      isLocked,
      createdAfter,
      createdBefore,
    });

    const orderBy = buildAdminUserOrderBy(sortBy, sortOrder);

    const [users, total, active, teachers, students] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        select: adminUserListSelect,
        orderBy,
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, isActive: true } }),
      prisma.user.count({ where: { ...where, role: UserRole.TEACHER } }),
      prisma.user.count({ where: { ...where, role: UserRole.STUDENT } }),
    ]);

    return {
      items: users,
      overview: {
        total,
        active,
        teachers,
        students,
      },
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: {
          include: {
            courses: {
              include: {
                _count: {
                  select: { lessons: true, packages: true },
                },
              },
            },
            certifications: true,
            verifications: true,
          },
        },
        enrollments: {
          include: {
            package: {
              include: {
                course: {
                  select: {
                    title: true,
                    thumbnail: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          where: {
            status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
          },
        },
        reviewsGiven: true,
        reviewsReceived: true,
        reportsSubmitted: true,
        reportsAgainst: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return this.withoutPassword(user);
  }

  async updateUserStatus(userId: string, isActive: boolean, adminId?: string) {
    const user = await requireUser(userId);
    ensureNotAdminUser(user, "Cannot modify admin user status");

    const impactedTeacherUserIds =
      user.role === UserRole.STUDENT && user.isActive !== isActive
        ? await collectImpactedTeacherUserIdsForStudent(user.id)
        : new Set<string>();

    const updatedUser = await prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: userId },
        data: {
          isActive,
          isLocked: isActive ? false : user.isLocked,
          lockedUntil: isActive ? null : user.lockedUntil,
          failedLoginAttempts: isActive ? 0 : user.failedLoginAttempts,
          updatedBy: adminId,
          tokenVersion: isActive ? undefined : { increment: 1 },
        },
      });

      if (adminId) {
        await createUserAuditLog(
          {
            adminId,
            userId,
            action: isActive ? "ACTIVATE" : "DEACTIVATE",
            oldValues: { isActive: user.isActive },
            newValues: { isActive },
          },
          tx,
        );
      }

      return nextUser;
    });

    await recalculateTeacherStudentCounts(impactedTeacherUserIds);

    return this.withoutPassword(updatedUser);
  }

  async deleteUser(
    userId: string,
    options?: { force?: boolean; adminId?: string },
  ) {
    const user = await requireUser(userId);
    ensureNotAdminUser(user, "Cannot delete admin user");

    if (!options?.force) {
      return this.deactivateUserForDeletion(user, options?.adminId);
    }

    const protectedCounts = await this.getProtectedUserDependencyCounts(userId);
    if (Object.values(protectedCounts).some((count) => count > 0)) {
      throw new ValidationError(
        this.buildProtectedDependencyMessage(protectedCounts),
      );
    }

    if (user.role === UserRole.TEACHER) {
      await assertTeacherHasNoActiveStudents(userId);
    }

    const impactedTeacherUserIds =
      user.role === UserRole.STUDENT
        ? await collectImpactedTeacherUserIdsForStudent(userId)
        : new Set<string>();

    await prisma.user.delete({ where: { id: userId } });
    await recalculateTeacherStudentCounts(impactedTeacherUserIds);

    return { deleted: true };
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    address?: string;
    department?: string;
    createdBy: string;
  }) {
    const firstName = normalizeInlineAdminText(data.firstName);
    const lastName = normalizeInlineAdminText(data.lastName);

    if (!firstName || !lastName) {
      throw new ValidationError("First name and last name are required");
    }

    ensureAdminManageableRole(data.role);
    const normalizedEmail = await ensureEmailAvailable(data.email);
    ensureStrongPassword(data.password);

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          role: data.role,
          phone: normalizeNullableInlineAdminText(data.phone) ?? null,
          address: normalizeNullableInlineAdminText(data.address) ?? null,
          department: normalizeNullableInlineAdminText(data.department) ?? null,
          createdBy: data.createdBy,
        },
      });

      if (data.role === UserRole.TEACHER) {
        await tx.teacherProfile.create({
          data: createApprovedTeacherProfileData(createdUser.id),
        });
      }

      await createUserAuditLog(
        {
          adminId: data.createdBy,
          userId: createdUser.id,
          action: "CREATE",
          newValues: {
            email: createdUser.email,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            role: createdUser.role,
          },
        },
        tx,
      );

      return this.withoutPassword(createdUser);
    });
  }

  async updateUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      address?: string | null;
      department?: string | null;
      avatar?: string | null;
      role?: UserRole;
      isActive?: boolean;
      isLocked?: boolean;
    },
    adminId: string,
  ) {
    const user = await requireUser(userId);

    if (
      user.role === UserRole.ADMIN &&
      (data.role || data.isActive !== undefined || data.isLocked !== undefined)
    ) {
      throw new ValidationError(
        "Admin role, status, and lock state cannot be modified through this endpoint",
      );
    }

    if (data.role) {
      ensureAdminManageableRole(data.role);
    }

    const nextEmail =
      data.email === undefined
        ? undefined
        : normalizeCanonicalEmail(data.email);
    const nextRole = data.role ?? user.role;

    if (nextEmail !== undefined) {
      await ensureEmailAvailable(nextEmail, userId);
    }

    const nextFirstName =
      data.firstName === undefined
        ? undefined
        : normalizeInlineAdminText(data.firstName);
    const nextLastName =
      data.lastName === undefined
        ? undefined
        : normalizeInlineAdminText(data.lastName);

    if (nextFirstName === "" || nextLastName === "") {
      throw new ValidationError("First name and last name cannot be empty");
    }

    const nextPhone = normalizeNullableInlineAdminText(data.phone);
    const nextAddress = normalizeNullableInlineAdminText(data.address);
    const nextDepartment = normalizeNullableInlineAdminText(data.department);
    const nextAvatar =
      data.avatar === undefined
        ? undefined
        : normalizeAdminAvatarUrl(data.avatar);

    const impactedTeacherUserIds =
      (user.role === UserRole.STUDENT || nextRole === UserRole.STUDENT) &&
      (data.isActive !== undefined || data.role !== undefined)
        ? await collectImpactedTeacherUserIdsForStudent(userId)
        : new Set<string>();

    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      department: user.department,
      avatar: user.avatar,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isLocked: user.isLocked,
    };

    const updatedUser = await prisma.$transaction(async (tx) => {
      const invalidateSessions = shouldInvalidateSessions({
        isActive: data.isActive,
        isLocked: data.isLocked,
      });

      if (nextRole === UserRole.TEACHER) {
        await tx.teacherProfile.upsert({
          where: { userId },
          update: {},
          create: createApprovedTeacherProfileData(userId),
        });
      }

      if (user.role === UserRole.TEACHER && nextRole !== UserRole.TEACHER) {
        await assertTeacherProfileCanBeRemoved(userId, tx);
        await tx.teacherProfile.deleteMany({ where: { userId } });
      }

      const nextUser = await tx.user.update({
        where: { id: userId },
        data: {
          email: nextEmail,
          firstName: nextFirstName,
          lastName: nextLastName,
          avatar: nextAvatar,
          phone: nextPhone,
          address: nextAddress,
          department: nextDepartment,
          role: data.role,
          isActive: data.isActive,
          isLocked: data.isLocked,
          lockedUntil: data.isLocked === false ? null : undefined,
          failedLoginAttempts: data.isLocked === false ? 0 : undefined,
          updatedBy: adminId,
          tokenVersion: invalidateSessions ? { increment: 1 } : undefined,
        },
      });

      await createUserAuditLog(
        {
          adminId,
          userId,
          action: "UPDATE",
          oldValues,
          newValues: {
            firstName: nextUser.firstName,
            lastName: nextUser.lastName,
            phone: nextUser.phone,
            address: nextUser.address,
            department: nextUser.department,
            avatar: nextUser.avatar,
            email: nextUser.email,
            role: nextUser.role,
            isActive: nextUser.isActive,
            isLocked: nextUser.isLocked,
          },
        },
        tx,
      );

      return this.withoutPassword(nextUser);
    });

    await recalculateTeacherStudentCounts(impactedTeacherUserIds);

    return updatedUser;
  }

  async resetUserPassword(
    userId: string,
    newPassword: string,
    adminId: string,
  ) {
    await requireUser(userId);
    ensureStrongPassword(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    return prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          isLocked: false,
          lockedUntil: null,
          tokenVersion: { increment: 1 },
          updatedBy: adminId,
        },
      });

      await tx.passwordResetCode.updateMany({
        where: {
          userId,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await createUserAuditLog(
        {
          adminId,
          userId,
          action: "RESET_PASSWORD",
          newValues: { password: "***" },
        },
        tx,
      );

      await tx.notification.create({
        data: {
          userId,
          title: "Password Reset",
          message: "Your password has been reset by an administrator.",
          type: "security",
        },
      });

      return this.withoutPassword(nextUser);
    });
  }

  async lockUserAccount(
    userId: string,
    lock: boolean,
    adminId: string,
    reason?: string,
  ) {
    const user = await requireUser(userId);
    ensureNotAdminUser(user, "Cannot lock or unlock admin user");

    const updated = await prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: userId },
        data: {
          isLocked: lock,
          lockedUntil: lock ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
          failedLoginAttempts: lock ? undefined : 0,
          tokenVersion: lock ? { increment: 1 } : undefined,
          updatedBy: adminId,
        },
      });

      await createUserAuditLog(
        {
          adminId,
          userId,
          action: lock ? "LOCK" : "UNLOCK",
          reason,
          oldValues: {
            isLocked: user.isLocked,
            lockedUntil: user.lockedUntil,
          },
          newValues: {
            isLocked: lock,
            lockedUntil: nextUser.lockedUntil,
          },
        },
        tx,
      );

      await tx.notification.create({
        data: {
          userId,
          title: lock ? "Account Locked" : "Account Unlocked",
          message: lock
            ? `Your account has been locked. Reason: ${reason || "Not specified"}`
            : "Your account has been unlocked.",
          type: "security",
        },
      });

      return nextUser;
    });

    return this.withoutPassword(updated);
  }

  async batchDeleteUsers(userIds: string[], adminId?: string) {
    const normalizedIds = this.normalizeUserIds(userIds);
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: normalizedIds } },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    const userMap = new Map(existingUsers.map((u) => [u.id, u]));

    const eligibleUserIds: string[] = [];
    const failed: Array<{ userId: string; reason: string }> = [];

    for (const userId of normalizedIds) {
      const target = userMap.get(userId);
      if (!target) {
        failed.push({ userId, reason: "User not found" });
        continue;
      }
      if (target.role === UserRole.ADMIN) {
        failed.push({ userId, reason: "Admin accounts cannot be deleted" });
        continue;
      }
      if (target.role === UserRole.TEACHER) {
        try {
          await assertTeacherHasNoActiveStudents(
            target.id,
            `${target.firstName} ${target.lastName}`,
          );
        } catch (error) {
          failed.push({
            userId,
            reason:
              error instanceof Error
                ? error.message
                : "Teacher has active enrolled students",
          });
          continue;
        }
      }
      eligibleUserIds.push(userId);
    }

    if (eligibleUserIds.length === 0 && failed.length > 0) {
      throw new ValidationError(failed[0].reason);
    }

    const studentIds = eligibleUserIds.filter(
      (id) => userMap.get(id)?.role === UserRole.STUDENT,
    );
    const impactedTeacherUserIds =
      await collectImpactedTeacherUserIdsForStudents(studentIds);

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: eligibleUserIds } },
        data: {
          isActive: false,
          isLocked: true,
          lockedUntil: null,
          failedLoginAttempts: 0,
          updatedBy: adminId,
          tokenVersion: { increment: 1 },
        },
      });

      if (adminId) {
        await tx.userAuditLog.createMany({
          data: eligibleUserIds.map((userId) => ({
            adminId,
            userId,
            action: "SOFT_DELETE",
            newValues: { isActive: false, isLocked: true },
          })),
        });
      }
    });

    await recalculateTeacherStudentCounts(impactedTeacherUserIds);

    return {
      affected: eligibleUserIds.length,
      succeeded: eligibleUserIds,
      failed,
    };
  }

  async batchUpdateUserStatus(
    userIds: string[],
    isActive: boolean,
    adminId: string,
  ) {
    const normalizedIds = this.normalizeUserIds(userIds);
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: normalizedIds } },
      select: { id: true, role: true },
    });
    const userMap = new Map(existingUsers.map((u) => [u.id, u]));

    const eligibleUserIds: string[] = [];
    const failed: Array<{ userId: string; reason: string }> = [];

    for (const userId of normalizedIds) {
      const target = userMap.get(userId);
      if (!target) {
        failed.push({ userId, reason: "User not found" });
        continue;
      }
      if (target.role === UserRole.ADMIN) {
        failed.push({
          userId,
          reason: "Admin accounts cannot be batch-updated",
        });
        continue;
      }
      eligibleUserIds.push(userId);
    }

    if (eligibleUserIds.length === 0 && failed.length > 0) {
      throw new ValidationError(failed[0].reason);
    }

    const studentIds = eligibleUserIds.filter(
      (id) => userMap.get(id)?.role === UserRole.STUDENT,
    );
    const impactedTeacherUserIds =
      await collectImpactedTeacherUserIdsForStudents(studentIds);

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: { in: eligibleUserIds } },
        data: {
          isActive,
          isLocked: isActive ? false : undefined,
          lockedUntil: isActive ? null : undefined,
          failedLoginAttempts: isActive ? 0 : undefined,
          updatedBy: adminId,
          tokenVersion: isActive ? undefined : { increment: 1 },
        },
      });

      await tx.userAuditLog.createMany({
        data: eligibleUserIds.map((userId) => ({
          adminId,
          userId,
          action: isActive ? "ACTIVATE" : "DEACTIVATE",
          newValues: { isActive },
        })),
      });
    });

    await recalculateTeacherStudentCounts(impactedTeacherUserIds);

    return {
      affected: eligibleUserIds.length,
      succeeded: eligibleUserIds,
      failed,
    };
  }

  async getUserAuditLogs(filters: {
    userId?: string;
    adminId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, adminId, action, page = 1, limit = 20 } = filters;
    const pagination = normalizePagination(page, limit, {
      defaultLimit: 20,
      maxLimit: 100,
    });
    const where = buildUserAuditLogWhere({ userId, adminId, action });

    const [logs, total] = await Promise.all([
      prisma.userAuditLog.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: adminAuditLogInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.userAuditLog.count({ where }),
    ]);

    return {
      items: logs,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }
}

export default new AdminService();
