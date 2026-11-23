import prisma from "../config/database";
import { NotFoundError, ValidationError } from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { normalizeOffsetPagination } from "./shared/pagination";
import { roundMoney } from "./shared/payment-utils";
import {
  isUniqueConstraintError,
  normalizeOptionalSanitizedText,
  normalizeRequiredSanitizedText,
} from "./shared/service-helpers";

type TransactionType =
  | "CREDIT"
  | "DEBIT"
  | "FREEZE"
  | "UNFREEZE"
  | "ADJUSTMENT";
type TransactionSource =
  | "COURSE_SALE"
  | "REFUND"
  | "REVERSAL"
  | "ADMIN_ADJUSTMENT"
  | "PAYOUT";
type PayoutStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "REJECTED"
  | "PAID"
  | "CANCELLED";
type PayoutMethodTypeValue =
  | "BANK_TRANSFER"
  | "GRABPAY"
  | "TOUCH_N_GO"
  | "PAYPAL"
  | "OTHER";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

type PayoutAction = "approve" | "reject" | "processing" | "paid";

const ALLOWED_TX_TYPES = new Set<TransactionType>([
  "CREDIT",
  "DEBIT",
  "FREEZE",
  "UNFREEZE",
  "ADJUSTMENT",
]);

const ALLOWED_TX_SOURCES = new Set<TransactionSource>([
  "COURSE_SALE",
  "REFUND",
  "REVERSAL",
  "ADMIN_ADJUSTMENT",
  "PAYOUT",
]);

const ALLOWED_PAYOUT_STATUSES = new Set<PayoutStatus>([
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "REJECTED",
  "PAID",
  "CANCELLED",
]);

const ALLOWED_PAYOUT_METHOD_TYPES = new Set<PayoutMethodTypeValue>([
  "BANK_TRANSFER",
  "GRABPAY",
  "TOUCH_N_GO",
  "PAYPAL",
  "OTHER",
]);

const ACTIVE_PAYOUT_STATUSES: PayoutStatus[] = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
];

const BLOCKED_JSON_KEYS = new Set([
  "__definegetter__",
  "__definesetter__",
  "__lookupgetter__",
  "__lookupsetter__",
  "__proto__",
  "constructor",
  "prototype",
]);

const MAX_LABEL_LENGTH = 80;
const MAX_NOTE_LENGTH = 1000;
const MAX_EXTERNAL_REFERENCE_LENGTH = 150;
const MAX_MONEY_AMOUNT = 99999999.99;

const parseOptionalUppercaseEnum = <T extends string>(
  value: string | undefined,
  allowed: Set<T>,
  label: string,
): T | undefined => {
  const normalized = normalizeOptionalSanitizedText(value)?.toUpperCase() as
    | T
    | undefined;
  if (!normalized) return undefined;

  if (!allowed.has(normalized)) {
    throw new ValidationError(
      `Invalid ${label}. Allowed values: ${Array.from(allowed).join(", ")}`,
    );
  }

  return normalized;
};

const parsePayoutMethodType = (type: unknown): PayoutMethodTypeValue => {
  const normalized = normalizeOptionalSanitizedText(type)?.toUpperCase();
  if (!normalized) {
    throw new ValidationError("Payout method type is required");
  }

  if (!ALLOWED_PAYOUT_METHOD_TYPES.has(normalized as PayoutMethodTypeValue)) {
    throw new ValidationError(
      `Invalid payout method type. Allowed values: ${Array.from(ALLOWED_PAYOUT_METHOD_TYPES).join(", ")}`,
    );
  }

  return normalized as PayoutMethodTypeValue;
};

const normalizeMoneyAmount = (value: unknown, fieldName: string): number => {
  const amount = roundMoney(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }
  if (amount > MAX_MONEY_AMOUNT) {
    throw new ValidationError(
      `${fieldName} exceeds the maximum supported amount`,
    );
  }
  return amount;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
};

const sanitizeJsonValue = (value: JsonValue): JsonValue => {
  if (typeof value === "string") {
    return sanitizeUserPlainText(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !BLOCKED_JSON_KEYS.has(key.toLowerCase()))
        .map(([key, nestedValue]) => [
          key,
          sanitizeJsonValue(nestedValue as JsonValue),
        ]),
    ) as JsonObject;
  }
  return value;
};

const toJsonObject = (value: unknown, fieldName: string): JsonObject => {
  if (!isPlainObject(value) || !isJsonValue(value)) {
    throw new ValidationError(`${fieldName} must be a valid JSON object`);
  }
  return sanitizeJsonValue(value as JsonObject) as JsonObject;
};

const normalizePayoutMethodDetails = (
  type: PayoutMethodTypeValue,
  detailsInput: unknown,
): JsonObject => {
  const details = toJsonObject(detailsInput, "Payout method details");

  if (type === "BANK_TRANSFER") {
    return {
      bankName: normalizeRequiredSanitizedText(details.bankName, "Bank name"),
      accountName: normalizeRequiredSanitizedText(
        details.accountName,
        "Account name",
      ),
      accountNo: normalizeRequiredSanitizedText(
        details.accountNo,
        "Account number",
      ),
    };
  }

  const walletId = normalizeRequiredSanitizedText(
    details.walletId,
    `${type} wallet ID or destination handle`,
  );
  const holder = normalizeOptionalSanitizedText(details.holder);
  return holder ? { walletId, holder } : { walletId };
};

const getStringMetadataValue = (
  metadata: JsonObject | undefined,
  key: string,
): string | undefined => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const buildWalletReferenceId = (
  source: TransactionSource,
  metadata?: JsonObject,
): string | undefined => {
  if (source === "COURSE_SALE") {
    return (
      getStringMetadataValue(metadata, "orderItemId") ??
      getStringMetadataValue(metadata, "paymentId")
    );
  }

  if (source === "REFUND") {
    const refundId = getStringMetadataValue(metadata, "refundId");
    const orderItemId = getStringMetadataValue(metadata, "orderItemId");
    const paymentId = getStringMetadataValue(metadata, "paymentId");

    if (refundId && orderItemId) {
      return `${refundId}:${orderItemId}`;
    }

    return refundId ?? orderItemId ?? paymentId;
  }

  return undefined;
};

class WalletService {
  async ensureWallet(userId: string) {
    const normalizedUserId = normalizeRequiredSanitizedText(userId, "User ID");

    const user = await prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    try {
      return await prisma.wallet.upsert({
        where: { userId: normalizedUserId },
        update: {},
        create: { userId: normalizedUserId },
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        const existing = await prisma.wallet.findUnique({
          where: { userId: normalizedUserId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async getSummary(userId: string) {
    return this.ensureWallet(userId);
  }

  async listTransactions(
    userId: string,
    params: {
      limit?: number;
      offset?: number;
      type?: string;
      source?: string;
    } = {},
  ) {
    const wallet = await this.ensureWallet(userId);
    const { limit, offset } = normalizeOffsetPagination(
      params.limit,
      params.offset,
      { defaultLimit: 20, maxLimit: 100 },
    );
    const parsedType = parseOptionalUppercaseEnum(
      params.type,
      ALLOWED_TX_TYPES,
      "transaction type",
    );
    const parsedSource = parseOptionalUppercaseEnum(
      params.source,
      ALLOWED_TX_SOURCES,
      "transaction source",
    );

    const where = {
      walletId: wallet.id,
      ...(parsedType ? { type: parsedType } : {}),
      ...(parsedSource ? { source: parsedSource } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async addPayoutMethod(
    userId: string,
    input: {
      type: string;
      label: string;
      details: unknown;
      isDefault?: boolean;
    },
  ) {
    const wallet = await this.ensureWallet(userId);
    const type = parsePayoutMethodType(input.type);
    const label = normalizeRequiredSanitizedText(
      input.label,
      "Label",
      MAX_LABEL_LENGTH,
    );
    const details = normalizePayoutMethodDetails(type, input.details);

    return prisma.$transaction(async (tx) => {
      const existingMethodCount = await tx.payoutMethod.count({
        where: { walletId: wallet.id },
      });
      const shouldBeDefault =
        Boolean(input.isDefault) || existingMethodCount === 0;

      if (shouldBeDefault) {
        await tx.payoutMethod.updateMany({
          where: { walletId: wallet.id },
          data: { isDefault: false },
        });
      }

      return tx.payoutMethod.create({
        data: {
          walletId: wallet.id,
          type,
          label,
          details,
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async listPayoutMethods(userId: string) {
    const wallet = await this.ensureWallet(userId);

    return prisma.payoutMethod.findMany({
      where: { walletId: wallet.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async updatePayoutMethod(
    userId: string,
    methodId: string,
    input: { label?: string; details?: unknown; isDefault?: boolean },
  ) {
    const normalizedMethodId = normalizeRequiredSanitizedText(
      methodId,
      "Payout method ID",
    );
    const wallet = await this.ensureWallet(userId);

    const existing = await prisma.payoutMethod.findUnique({
      where: { id: normalizedMethodId },
    });

    if (!existing || existing.walletId !== wallet.id) {
      throw new NotFoundError("Payout method not found");
    }

    const label =
      input.label === undefined
        ? undefined
        : normalizeRequiredSanitizedText(input.label, "Label", MAX_LABEL_LENGTH);

    const details =
      input.details !== undefined
        ? normalizePayoutMethodDetails(
            existing.type as PayoutMethodTypeValue,
            input.details,
          )
        : undefined;

    return prisma.$transaction(async (tx) => {
      const shouldBeDefault =
        input.isDefault === undefined
          ? existing.isDefault
          : Boolean(input.isDefault);

      if (!shouldBeDefault && existing.isDefault) {
        const replacement = await tx.payoutMethod.findFirst({
          where: {
            walletId: wallet.id,
            id: { not: normalizedMethodId },
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          select: { id: true },
        });

        if (!replacement) {
          throw new ValidationError(
            "At least one payout method must remain default",
          );
        }

        await tx.payoutMethod.updateMany({
          where: { walletId: wallet.id },
          data: { isDefault: false },
        });
        await tx.payoutMethod.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      } else if (shouldBeDefault) {
        await tx.payoutMethod.updateMany({
          where: { walletId: wallet.id },
          data: { isDefault: false },
        });
      }

      return tx.payoutMethod.update({
        where: { id: normalizedMethodId },
        data: {
          ...(label !== undefined ? { label } : {}),
          ...(details !== undefined ? { details } : {}),
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  async deletePayoutMethod(userId: string, methodId: string) {
    const normalizedMethodId = normalizeRequiredSanitizedText(
      methodId,
      "Payout method ID",
    );
    const wallet = await this.ensureWallet(userId);

    const existing = await prisma.payoutMethod.findUnique({
      where: { id: normalizedMethodId },
    });

    if (!existing || existing.walletId !== wallet.id) {
      throw new NotFoundError("Payout method not found");
    }

    const activePayoutRequest = await prisma.payoutRequest.findFirst({
      where: {
        methodId: normalizedMethodId,
        status: { in: ACTIVE_PAYOUT_STATUSES },
      },
      select: { id: true },
    });

    if (activePayoutRequest) {
      throw new ValidationError(
        "Cannot delete a payout method that is used by an active payout request",
      );
    }

    await prisma.$transaction(async (tx) => {
      const replacement = existing.isDefault
        ? await tx.payoutMethod.findFirst({
            where: {
              walletId: wallet.id,
              id: { not: normalizedMethodId },
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: { id: true },
          })
        : null;

      await tx.payoutMethod.delete({ where: { id: normalizedMethodId } });

      if (replacement) {
        await tx.payoutMethod.updateMany({
          where: { walletId: wallet.id },
          data: { isDefault: false },
        });
        await tx.payoutMethod.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    });

    return { success: true };
  }

  async requestPayout(
    userId: string,
    input: { amount: number; methodId?: string; note?: string },
  ) {
    const wallet = await this.ensureWallet(userId);
    const amount = normalizeMoneyAmount(input.amount, "Payout amount");
    const note = normalizeOptionalSanitizedText(
      input.note,
      "Note",
      MAX_NOTE_LENGTH,
    );

    return prisma.$transaction(async (tx) => {
      const requestedMethodId = normalizeOptionalSanitizedText(input.methodId);
      const selectedMethod = requestedMethodId
        ? await tx.payoutMethod.findUnique({ where: { id: requestedMethodId } })
        : await tx.payoutMethod.findFirst({
            where: { walletId: wallet.id, isDefault: true },
          });

      if (requestedMethodId && (!selectedMethod || selectedMethod.walletId !== wallet.id)) {
        throw new ValidationError("Invalid payout method");
      }

      if (!selectedMethod) {
        throw new ValidationError(
          "A payout method is required before requesting a payout",
        );
      }

      const methodType = parsePayoutMethodType(selectedMethod.type);
      normalizePayoutMethodDetails(methodType, selectedMethod.details);

      const balanceUpdate = await tx.wallet.updateMany({
        where: { id: wallet.id, availableBalance: { gte: amount } },
        data: {
          availableBalance: { decrement: amount },
          pendingPayout: { increment: amount },
        },
      });

      if (balanceUpdate.count !== 1) {
        throw new ValidationError("Insufficient balance");
      }

      const payout = await tx.payoutRequest.create({
        data: {
          walletId: wallet.id,
          amount,
          methodId: selectedMethod.id,
          status: "PENDING",
          note: note || null,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: "FREEZE",
          source: "PAYOUT",
          referenceId: `${payout.id}:freeze`,
          metadata: note ? { note } : undefined,
        },
      });

      return payout;
    });
  }

  async listMyPayouts(
    userId: string,
    params: { limit?: number; offset?: number; status?: string } = {},
  ) {
    const wallet = await this.ensureWallet(userId);
    const { limit, offset } = normalizeOffsetPagination(
      params.limit,
      params.offset,
      { defaultLimit: 20, maxLimit: 100 },
    );
    const parsedStatus = parseOptionalUppercaseEnum(
      params.status,
      ALLOWED_PAYOUT_STATUSES,
      "payout status",
    );

    const where = {
      walletId: wallet.id,
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip: offset,
        include: { method: true },
      }),
      prisma.payoutRequest.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async listPayoutRequests(status?: string, limit = 50, offset = 0) {
    const pagination = normalizeOffsetPagination(limit, offset, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const parsedStatus = parseOptionalUppercaseEnum(
      status,
      ALLOWED_PAYOUT_STATUSES,
      "payout status",
    );
    const where = parsedStatus ? { status: parsedStatus } : {};

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          method: true,
        },
      }),
      prisma.payoutRequest.count({ where }),
    ]);

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async reviewPayout(
    id: string,
    action: PayoutAction,
    opts?: { adminNote?: string; externalReference?: string },
  ) {
    const payoutId = normalizeRequiredSanitizedText(id, "Payout ID");
    const adminNote =
      normalizeOptionalSanitizedText(
        opts?.adminNote,
        "Admin note",
        MAX_NOTE_LENGTH,
      ) || null;
    const externalReference =
      normalizeOptionalSanitizedText(
        opts?.externalReference,
        "External reference",
        MAX_EXTERNAL_REFERENCE_LENGTH,
      ) || null;

    return prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({
        where: { id: payoutId },
        include: { wallet: true },
      });

      if (!payout) {
        throw new NotFoundError("Payout request not found");
      }

      const amount = roundMoney(payout.amount);
      const processedAt = payout.processedAt ?? new Date();

      const assertTransition = async (
        fromStatus: PayoutStatus | { in: PayoutStatus[] },
        nextStatus: PayoutStatus,
        errorMessage: string,
        extraData?: { processedAt?: Date; externalReference?: string | null },
      ) => {
        const transition = await tx.payoutRequest.updateMany({
          where: { id: payoutId, status: fromStatus },
          data: {
            status: nextStatus,
            adminNote,
            ...extraData,
          },
        });
        if (transition.count !== 1) {
          throw new ValidationError(errorMessage);
        }
      };

      const settlePendingBalance = async (releaseToAvailable: boolean) => {
        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: payout.walletId,
            pendingPayout: { gte: amount },
          },
          data: {
            ...(releaseToAvailable
              ? { availableBalance: { increment: amount } }
              : {}),
            pendingPayout: { decrement: amount },
          },
        });

        if (walletUpdate.count !== 1) {
          throw new ValidationError(
            "Wallet pending payout balance is insufficient",
          );
        }
      };

      if (action === "approve") {
        await assertTransition(
          "PENDING",
          "APPROVED",
          "Only pending payouts can be approved",
        );
      } else if (action === "processing") {
        await assertTransition(
          "APPROVED",
          "PROCESSING",
          "Only approved payouts can be marked processing",
          { processedAt },
        );
      } else if (action === "reject") {
        await assertTransition(
          { in: ACTIVE_PAYOUT_STATUSES },
          "REJECTED",
          "Only pending, approved, or processing payouts can be rejected",
          { processedAt },
        );
        await settlePendingBalance(true);
        await tx.walletTransaction.create({
          data: {
            walletId: payout.walletId,
            amount,
            type: "UNFREEZE",
            source: "REVERSAL",
            referenceId: `${payout.id}:reject`,
            metadata: { reason: "Payout rejected" },
          },
        });
      } else if (action === "paid") {
        await assertTransition(
          "PROCESSING",
          "PAID",
          "Only processing payouts can be marked paid",
          { processedAt, externalReference },
        );
        await settlePendingBalance(false);
        await tx.walletTransaction.create({
          data: {
            walletId: payout.walletId,
            amount,
            type: "DEBIT",
            source: "PAYOUT",
            referenceId: `${payout.id}:paid`,
            metadata: externalReference ? { externalReference } : undefined,
          },
        });
      } else {
        throw new ValidationError("Invalid payout action");
      }

      return tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId } });
    });
  }

  private async recordCommerceWalletEntry(
    userId: string,
    amount: number,
    options: {
      type: "CREDIT" | "DEBIT";
      source: "COURSE_SALE" | "REFUND";
      metadata?: JsonObject;
    },
  ) {
    const normalizedAmount = roundMoney(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return;
    }

    const wallet = await this.ensureWallet(userId);
    const referenceId = buildWalletReferenceId(
      options.source,
      options.metadata,
    );

    try {
      await prisma.$transaction(async (tx) => {
        if (referenceId) {
          const existingTransaction = await tx.walletTransaction.findFirst({
            where: {
              walletId: wallet.id,
              source: options.source,
              referenceId,
            },
            select: { id: true },
          });

          if (existingTransaction) return;
        }

        if (options.type === "CREDIT") {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { availableBalance: { increment: normalizedAmount } },
          });
        } else {
          const walletUpdate = await tx.wallet.updateMany({
            where: {
              id: wallet.id,
              availableBalance: { gte: normalizedAmount },
            },
            data: { availableBalance: { decrement: normalizedAmount } },
          });

          if (walletUpdate.count !== 1) {
            throw new ValidationError(
              "Teacher wallet balance is insufficient for refund debit",
            );
          }
        }

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: normalizedAmount,
            type: options.type,
            source: options.source,
            referenceId: referenceId || null,
            metadata: options.metadata,
          },
        });
      });
    } catch (error) {
      if (!(referenceId && isUniqueConstraintError(error))) {
        throw error;
      }
    }
  }

  async creditForTeacher(
    userId: string,
    amount: number,
    metadata?: JsonObject,
  ) {
    await this.recordCommerceWalletEntry(userId, amount, {
      type: "CREDIT",
      source: "COURSE_SALE",
      metadata,
    });
  }

  async debitForRefund(userId: string, amount: number, metadata?: JsonObject) {
    await this.recordCommerceWalletEntry(userId, amount, {
      type: "DEBIT",
      source: "REFUND",
      metadata,
    });
  }
}

export default new WalletService();
