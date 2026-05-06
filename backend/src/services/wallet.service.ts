import prisma from "../config/database";
import { NotFoundError, ValidationError } from "../utils/errors";
import { sanitizeUserPlainText } from "../utils/sanitize-user-content";
import { toNumber } from "./shared/payment-utils";

// Note: raw string literal types are used to avoid depending on generated Prisma enum imports
// during early setup. Values must stay aligned with schema.prisma enums.
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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function toInt(
  value: unknown,
  def: number,
  opts: { min?: number; max?: number } = {},
): number {
  const { min, max } = opts;
  let parsedValue: number;

  if (typeof value === "number") {
    parsedValue = Math.trunc(value);
  } else if (typeof value === "string") {
    parsedValue = parseInt(value, 10);
  } else {
    parsedValue = NaN;
  }

  if (!Number.isFinite(parsedValue)) {
    parsedValue = def;
  }

  if (typeof min === "number" && parsedValue < min) {
    parsedValue = min;
  }

  if (typeof max === "number" && parsedValue > max) {
    parsedValue = max;
  }

  return parsedValue;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = sanitizeUserPlainText(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireCleanString(value: unknown, fieldName: string): string {
  const cleaned = cleanString(value);

  if (!cleaned) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return cleaned;
}

function cleanLimitedString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return undefined;
  }

  if (cleaned.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
  }

  return cleaned;
}

function roundCurrency(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function normalizeMoneyAmount(value: unknown, fieldName: string): number {
  const amount = roundCurrency(toNumber(value));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }

  if (amount > MAX_MONEY_AMOUNT) {
    throw new ValidationError(
      `${fieldName} exceeds the maximum supported amount`,
    );
  }

  return amount;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return Number.isFinite(value as number) || typeof value !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

function sanitizeJsonValue(value: JsonValue): JsonValue {
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
}

function toJsonObject(value: unknown, fieldName: string): JsonObject {
  if (!isPlainObject(value) || !isJsonValue(value)) {
    throw new ValidationError(`${fieldName} must be a valid JSON object`);
  }

  return sanitizeJsonValue(value as JsonObject) as JsonObject;
}

function parseTransactionType(type?: string): TransactionType | undefined {
  const normalizedType = cleanString(type)?.toUpperCase() as
    | TransactionType
    | undefined;

  if (!normalizedType) {
    return undefined;
  }

  if (!ALLOWED_TX_TYPES.has(normalizedType)) {
    throw new ValidationError(
      `Invalid transaction type. Allowed values: ${Array.from(ALLOWED_TX_TYPES).join(", ")}`,
    );
  }

  return normalizedType;
}

function parseTransactionSource(
  source?: string,
): TransactionSource | undefined {
  const normalizedSource = cleanString(source)?.toUpperCase() as
    | TransactionSource
    | undefined;

  if (!normalizedSource) {
    return undefined;
  }

  if (!ALLOWED_TX_SOURCES.has(normalizedSource)) {
    throw new ValidationError(
      `Invalid transaction source. Allowed values: ${Array.from(ALLOWED_TX_SOURCES).join(", ")}`,
    );
  }

  return normalizedSource;
}

function parsePayoutStatus(status?: string): PayoutStatus | undefined {
  const normalizedStatus = cleanString(status)?.toUpperCase() as
    | PayoutStatus
    | undefined;

  if (!normalizedStatus) {
    return undefined;
  }

  if (!ALLOWED_PAYOUT_STATUSES.has(normalizedStatus)) {
    throw new ValidationError(
      `Invalid payout status. Allowed values: ${Array.from(ALLOWED_PAYOUT_STATUSES).join(", ")}`,
    );
  }

  return normalizedStatus;
}

function isPayoutMethodType(value: string): value is PayoutMethodTypeValue {
  return ALLOWED_PAYOUT_METHOD_TYPES.has(value as PayoutMethodTypeValue);
}

function parsePayoutMethodType(type: unknown): PayoutMethodTypeValue {
  const normalizedType = cleanString(type)?.toUpperCase();

  if (!normalizedType) {
    throw new ValidationError("Payout method type is required");
  }

  if (!isPayoutMethodType(normalizedType)) {
    throw new ValidationError(
      `Invalid payout method type. Allowed values: ${Array.from(ALLOWED_PAYOUT_METHOD_TYPES).join(", ")}`,
    );
  }

  return normalizedType;
}

function normalizePayoutMethodDetails(
  type: PayoutMethodTypeValue,
  detailsInput: unknown,
): JsonObject {
  const details = toJsonObject(detailsInput, "Payout method details");

  if (type === "BANK_TRANSFER") {
    const bankName = requireCleanString(details.bankName, "Bank name");
    const accountName = requireCleanString(details.accountName, "Account name");
    const accountNo = requireCleanString(details.accountNo, "Account number");

    return {
      bankName,
      accountName,
      accountNo,
    };
  }

  const walletId = requireCleanString(
    details.walletId,
    `${type} wallet ID or destination handle`,
  );

  const normalized: JsonObject = {
    walletId,
  };

  const holder = cleanString(details.holder);
  if (holder) {
    normalized.holder = holder;
  }

  return normalized;
}

function getStringMetadataValue(
  metadata: JsonObject | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildWalletReferenceId(
  source: TransactionSource,
  metadata?: JsonObject,
): string | undefined {
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
}

class WalletService {
  async ensureWallet(userId: string) {
    const normalizedUserId = requireCleanString(userId, "User ID");

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

        if (existing) {
          return existing;
        }
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
    const safeLimit = toInt(params.limit, 20, { min: 1, max: 100 });
    const safeOffset = toInt(params.offset, 0, { min: 0 });
    const parsedType = parseTransactionType(params.type);
    const parsedSource = parseTransactionSource(params.source);

    const where: {
      walletId: string;
      type?: TransactionType;
      source?: TransactionSource;
    } = {
      walletId: wallet.id,
      ...(parsedType ? { type: parsedType } : {}),
      ...(parsedSource ? { source: parsedSource } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return { items, total, limit: safeLimit, offset: safeOffset };
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
    const label = cleanLimitedString(input.label, "Label", MAX_LABEL_LENGTH);

    if (!label) {
      throw new ValidationError("Label is required");
    }

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
    const normalizedMethodId = requireCleanString(methodId, "Payout method ID");
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
        : cleanLimitedString(input.label, "Label", MAX_LABEL_LENGTH);

    if (input.label !== undefined && !label) {
      throw new ValidationError("Label is required");
    }

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
    const normalizedMethodId = requireCleanString(methodId, "Payout method ID");
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
      let replacementId: string | null = null;

      if (existing.isDefault) {
        const replacement = await tx.payoutMethod.findFirst({
          where: {
            walletId: wallet.id,
            id: { not: normalizedMethodId },
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          select: { id: true },
        });

        replacementId = replacement?.id ?? null;
      }

      await tx.payoutMethod.delete({
        where: { id: normalizedMethodId },
      });

      if (replacementId) {
        await tx.payoutMethod.updateMany({
          where: { walletId: wallet.id },
          data: { isDefault: false },
        });

        await tx.payoutMethod.update({
          where: { id: replacementId },
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
    const note = cleanLimitedString(input.note, "Note", MAX_NOTE_LENGTH);
    const payoutMetadata: JsonObject | undefined = note ? { note } : undefined;

    return prisma.$transaction(async (tx) => {
      let methodId: string | undefined = cleanString(input.methodId);
      let selectedMethodType: PayoutMethodTypeValue | undefined;
      let selectedMethodDetails: unknown;

      if (methodId) {
        const method = await tx.payoutMethod.findUnique({
          where: { id: methodId },
        });

        if (!method || method.walletId !== wallet.id) {
          throw new ValidationError("Invalid payout method");
        }

        selectedMethodType = method.type as PayoutMethodTypeValue;
        selectedMethodDetails = method.details;
      } else {
        const defaultMethod = await tx.payoutMethod.findFirst({
          where: { walletId: wallet.id, isDefault: true },
        });

        methodId = defaultMethod?.id;
        selectedMethodType = defaultMethod?.type as
          | PayoutMethodTypeValue
          | undefined;
        selectedMethodDetails = defaultMethod?.details;
      }

      if (!methodId) {
        throw new ValidationError(
          "A payout method is required before requesting a payout",
        );
      }

      if (!selectedMethodType || !isPayoutMethodType(selectedMethodType)) {
        throw new ValidationError("Selected payout method has an invalid type");
      }

      normalizePayoutMethodDetails(selectedMethodType, selectedMethodDetails);

      const balanceUpdate = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          availableBalance: { gte: amount },
        },
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
          methodId,
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
          metadata: payoutMetadata,
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
    const safeLimit = toInt(params.limit, 20, { min: 1, max: 100 });
    const safeOffset = toInt(params.offset, 0, { min: 0 });
    const parsedStatus = parsePayoutStatus(params.status);

    const where: {
      walletId: string;
      status?: PayoutStatus;
    } = {
      walletId: wallet.id,
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
        include: { method: true },
      }),
      prisma.payoutRequest.count({ where }),
    ]);

    return { items, total, limit: safeLimit, offset: safeOffset };
  }

  // Admin actions
  async listPayoutRequests(
    status?: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    const safeLimit = toInt(limit, 50, { min: 1, max: 100 });
    const safeOffset = toInt(offset, 0, { min: 0 });
    const parsedStatus = parsePayoutStatus(status);

    const where: { status?: PayoutStatus } = {
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        take: safeLimit,
        skip: safeOffset,
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

    return { items, total, limit: safeLimit, offset: safeOffset };
  }

  async reviewPayout(
    id: string,
    action: PayoutAction,
    opts?: { adminNote?: string; externalReference?: string },
  ) {
    const payoutId = requireCleanString(id, "Payout ID");
    const adminNote =
      cleanLimitedString(opts?.adminNote, "Admin note", MAX_NOTE_LENGTH) ||
      null;
    const externalReference =
      cleanLimitedString(
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

      const amount = roundCurrency(toNumber(payout.amount));

      if (action === "approve") {
        const transition = await tx.payoutRequest.updateMany({
          where: { id: payoutId, status: "PENDING" },
          data: {
            status: "APPROVED",
            adminNote,
          },
        });

        if (transition.count !== 1) {
          throw new ValidationError("Only pending payouts can be approved");
        }

        return tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId } });
      }

      if (action === "processing") {
        const transition = await tx.payoutRequest.updateMany({
          where: { id: payoutId, status: "APPROVED" },
          data: {
            status: "PROCESSING",
            adminNote,
            processedAt: payout.processedAt ?? new Date(),
          },
        });

        if (transition.count !== 1) {
          throw new ValidationError(
            "Only approved payouts can be marked processing",
          );
        }

        return tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId } });
      }

      if (action === "reject") {
        const transition = await tx.payoutRequest.updateMany({
          where: {
            id: payoutId,
            status: { in: ACTIVE_PAYOUT_STATUSES },
          },
          data: {
            status: "REJECTED",
            adminNote,
            processedAt: payout.processedAt ?? new Date(),
          },
        });

        if (transition.count !== 1) {
          throw new ValidationError(
            "Only pending, approved, or processing payouts can be rejected",
          );
        }

        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: payout.walletId,
            pendingPayout: { gte: amount },
          },
          data: {
            availableBalance: { increment: amount },
            pendingPayout: { decrement: amount },
          },
        });

        if (walletUpdate.count !== 1) {
          throw new ValidationError(
            "Wallet pending payout balance is insufficient",
          );
        }

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

        return tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId } });
      }

      if (action === "paid") {
        const transition = await tx.payoutRequest.updateMany({
          where: { id: payoutId, status: "PROCESSING" },
          data: {
            status: "PAID",
            adminNote,
            externalReference,
            processedAt: payout.processedAt ?? new Date(),
          },
        });

        if (transition.count !== 1) {
          throw new ValidationError(
            "Only processing payouts can be marked paid",
          );
        }

        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: payout.walletId,
            pendingPayout: { gte: amount },
          },
          data: {
            pendingPayout: { decrement: amount },
          },
        });

        if (walletUpdate.count !== 1) {
          throw new ValidationError(
            "Wallet pending payout balance is insufficient",
          );
        }

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

        return tx.payoutRequest.findUniqueOrThrow({ where: { id: payoutId } });
      }

      throw new ValidationError("Invalid payout action");
    });
  }

  // Credits and debits during commerce flows
  async creditForTeacher(
    userId: string,
    amount: number,
    metadata?: JsonObject,
  ) {
    const normalizedAmount = roundCurrency(Number(amount));

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return;
    }

    const wallet = await this.ensureWallet(userId);
    const referenceId = buildWalletReferenceId("COURSE_SALE", metadata);

    try {
      await prisma.$transaction(async (tx) => {
        if (referenceId) {
          const existingTransaction = await tx.walletTransaction.findFirst({
            where: {
              walletId: wallet.id,
              source: "COURSE_SALE",
              referenceId,
            },
            select: { id: true },
          });

          if (existingTransaction) {
            return;
          }
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { increment: normalizedAmount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: normalizedAmount,
            type: "CREDIT",
            source: "COURSE_SALE",
            referenceId: referenceId || null,
            metadata,
          },
        });
      });
    } catch (error) {
      if (!(referenceId && isUniqueConstraintError(error))) {
        throw error;
      }
    }
  }

  async debitForRefund(userId: string, amount: number, metadata?: JsonObject) {
    const normalizedAmount = roundCurrency(Number(amount));

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return;
    }

    const wallet = await this.ensureWallet(userId);
    const referenceId = buildWalletReferenceId("REFUND", metadata);

    try {
      await prisma.$transaction(async (tx) => {
        if (referenceId) {
          const existingTransaction = await tx.walletTransaction.findFirst({
            where: {
              walletId: wallet.id,
              source: "REFUND",
              referenceId,
            },
            select: { id: true },
          });

          if (existingTransaction) {
            return;
          }
        }

        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            availableBalance: { gte: normalizedAmount },
          },
          data: {
            availableBalance: { decrement: normalizedAmount },
          },
        });

        if (walletUpdate.count !== 1) {
          throw new ValidationError(
            "Teacher wallet balance is insufficient for refund debit",
          );
        }

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: normalizedAmount,
            type: "DEBIT",
            source: "REFUND",
            referenceId: referenceId || null,
            metadata,
          },
        });
      });
    } catch (error) {
      if (!(referenceId && isUniqueConstraintError(error))) {
        throw error;
      }
    }
  }
}

export default new WalletService();
