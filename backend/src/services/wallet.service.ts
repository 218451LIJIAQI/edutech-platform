/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '../config/database';
// Note: avoid importing Prisma enums to prevent build issues before prisma generate
// Use raw string values aligned with schema enums
import { NotFoundError, ValidationError } from '../utils/errors';

// Local literal types aligned with schema enums
type TransactionType = 'CREDIT' | 'DEBIT' | 'UNFREEZE';
type TransactionSource = 'COURSE_SALE' | 'REFUND' | 'PAYOUT' | 'REVERSAL';
type PayoutStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'REJECTED' | 'PAID';

const ALLOWED_TX_TYPES = new Set<TransactionType>(['CREDIT', 'DEBIT', 'UNFREEZE']);
const ALLOWED_TX_SOURCES = new Set<TransactionSource>(['COURSE_SALE', 'REFUND', 'PAYOUT', 'REVERSAL']);
const ALLOWED_PAYOUT_STATUSES = new Set<PayoutStatus>(['PENDING', 'APPROVED', 'PROCESSING', 'REJECTED', 'PAID']);

// Helpers
function toInt(value: unknown, def: number, opts: { min?: number; max?: number } = {}): number {
  const { min, max } = opts;
  let n: number;
  if (typeof value === 'number') n = Math.trunc(value);
  else if (typeof value === 'string') n = parseInt(value, 10);
  else n = NaN;
  if (!Number.isFinite(n)) n = def;
  if (typeof min === 'number' && n < min) n = min;
  if (typeof max === 'number' && n > max) n = max;
  return n;
}

function cleanString(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const v = val.trim();
  return v.length ? v : undefined;
}

class WalletService {
  async ensureWallet(userId: string) {
    const trimmed = cleanString(userId);
    if (!trimmed) throw new ValidationError('Invalid userId');
    // Use upsert to avoid race conditions creating the same wallet concurrently
    const wallet = await prisma.wallet.upsert({ where: { userId: trimmed }, update: {}, create: { userId: trimmed } });
    return wallet;
  }

  async getSummary(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return wallet;
  }

  async listTransactions(
    userId: string,
    params: { limit?: number; offset?: number; type?: string; source?: string }
  ) {
    const wallet = await this.ensureWallet(userId);
    const { limit, offset, type, source } = params || {};

    const safeLimit = toInt(limit, 20, { min: 1, max: 100 });
    const safeOffset = toInt(offset, 0, { min: 0 });

    const where: { walletId: string; type?: TransactionType; source?: TransactionSource } = { walletId: wallet.id };

    const typeUpper = cleanString(type)?.toUpperCase() as TransactionType | undefined;
    if (typeUpper && ALLOWED_TX_TYPES.has(typeUpper)) where.type = typeUpper;

    const sourceUpper = cleanString(source)?.toUpperCase() as TransactionSource | undefined;
    if (sourceUpper && ALLOWED_TX_SOURCES.has(sourceUpper)) where.source = sourceUpper;

    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    return { items, total, limit: safeLimit, offset: safeOffset };
  }

  async addPayoutMethod(
    userId: string,
    input: { type: string; label: string; details: any; isDefault?: boolean }
  ) {
    const wallet = await this.ensureWallet(userId);
    const label = cleanString(input.label);
    if (!label) throw new ValidationError('Label is required');

    const typeUpper = cleanString(input.type)?.toUpperCase();
    if (!typeUpper) throw new ValidationError('Type is required');

    const validTypes = ['BANK_TRANSFER', 'GRABPAY', 'TOUCH_N_GO', 'PAYPAL', 'OTHER'];
    if (!validTypes.includes(typeUpper)) {
      throw new ValidationError(`Invalid payout method type. Must be one of: ${validTypes.join(', ')}`);
    }

    const created = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.payoutMethod.updateMany({ where: { walletId: wallet.id }, data: { isDefault: false } });
      }
      const method = await tx.payoutMethod.create({
        data: {
          walletId: wallet.id,
          type: typeUpper as any,
          label,
          details: input.details,
          isDefault: !!input.isDefault,
        },
      });
      return method;
    });

    return created;
  }

  async listPayoutMethods(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return prisma.payoutMethod.findMany({ where: { walletId: wallet.id }, orderBy: { isDefault: 'desc' } });
  }

  async updatePayoutMethod(
    userId: string,
    methodId: string,
    input: { label?: string; details?: any; isDefault?: boolean }
  ) {
    const wallet = await this.ensureWallet(userId);
    const existing = await prisma.payoutMethod.findUnique({ where: { id: methodId } });
    if (!existing || existing.walletId !== wallet.id) throw new NotFoundError('Payout method not found');

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.payoutMethod.updateMany({ where: { walletId: wallet.id }, data: { isDefault: false } });
      }
      return tx.payoutMethod.update({
        where: { id: methodId },
        data: {
          label: cleanString(input.label) ?? undefined,
          details: input.details !== undefined ? input.details : undefined,
          isDefault: input.isDefault ?? existing.isDefault,
        },
      });
    });

    return updated;
  }

  async deletePayoutMethod(userId: string, methodId: string) {
    const wallet = await this.ensureWallet(userId);
    const existing = await prisma.payoutMethod.findUnique({ where: { id: methodId } });
    if (!existing || existing.walletId !== wallet.id) throw new NotFoundError('Payout method not found');
    await prisma.payoutMethod.delete({ where: { id: methodId } });
    return { success: true };
  }

  async requestPayout(userId: string, input: { amount: number; methodId?: string; note?: string }) {
    const wallet = await this.ensureWallet(userId);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Invalid amount');

    const updated = await prisma.$transaction(async (tx) => {
      // Validate or pick default payout method within the transaction
      let methodId: string | undefined = cleanString(input.methodId);
      if (methodId) {
        const method = await tx.payoutMethod.findUnique({ where: { id: methodId } });
        if (!method || method.walletId !== wallet.id) throw new ValidationError('Invalid payout method');
      } else {
        const def = await tx.payoutMethod.findFirst({ where: { walletId: wallet.id, isDefault: true } });
        methodId = def?.id;
      }

      // Re-check balance atomically
      const current = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { availableBalance: true } });
      if (!current) throw new NotFoundError('Wallet not found');
      if (current.availableBalance < amount) throw new ValidationError('Insufficient balance');

      const res = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: amount },
          pendingPayout: { increment: amount },
          payoutRequests: {
            create: {
              amount,
              methodId: methodId || null,
              status: 'PENDING' as PayoutStatus,
              note: cleanString(input.note) || null,
            },
          },
          transactions: {
            create: {
              amount,
              type: 'DEBIT' as TransactionType,
              source: 'PAYOUT' as TransactionSource,
              metadata: { note: cleanString(input.note) },
            },
          },
        },
      });

      return res;
    });

    return updated;
  }

  async listMyPayouts(userId: string, params: { limit?: number; offset?: number }) {
    const wallet = await this.ensureWallet(userId);
    const { limit, offset } = params || {};
    const safeLimit = toInt(limit, 20, { min: 1, max: 100 });
    const safeOffset = toInt(offset, 0, { min: 0 });

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where: { walletId: wallet.id },
        orderBy: { requestedAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
        include: { method: true },
      }),
      prisma.payoutRequest.count({ where: { walletId: wallet.id } }),
    ]);
    return { items, total, limit: safeLimit, offset: safeOffset };
  }

  // Admin actions
  async listPayoutRequests(status?: string, limit: number = 50, offset: number = 0) {
    const safeLimit = toInt(limit, 50, { min: 1, max: 100 });
    const safeOffset = toInt(offset, 0, { min: 0 });

    const where: { status?: PayoutStatus } = {};
    const statusUpper = cleanString(status)?.toUpperCase() as PayoutStatus | undefined;
    if (statusUpper && ALLOWED_PAYOUT_STATUSES.has(statusUpper)) where.status = statusUpper;

    const [items, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
        include: {
          wallet: {
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
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
    action: 'approve' | 'reject' | 'processing' | 'paid',
    opts?: { adminNote?: string; externalReference?: string }
  ) {
    const cleanedId = cleanString(id);
    if (!cleanedId) throw new ValidationError('Invalid payout id');

    const updated = await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({ where: { id: cleanedId }, include: { wallet: true } });
      if (!payout) throw new NotFoundError('Payout request not found');

      const adminNote = cleanString(opts?.adminNote) || null;
      const externalReference = cleanString(opts?.externalReference) || null;

      if (action === 'approve') {
        if (payout.status !== 'PENDING') throw new ValidationError('Only pending payouts can be approved');
        return tx.payoutRequest.update({ where: { id: cleanedId }, data: { status: 'APPROVED' as PayoutStatus, adminNote } });
      }

      if (action === 'processing') {
        if (!['APPROVED', 'PENDING'].includes(payout.status))
          throw new ValidationError('Only approved or pending payouts can be marked processing');
        return tx.payoutRequest.update({ where: { id: cleanedId }, data: { status: 'PROCESSING' as PayoutStatus, adminNote } });
      }

      if (action === 'reject') {
        if (!['PENDING', 'APPROVED', 'PROCESSING'].includes(payout.status))
          throw new ValidationError('Invalid status for rejection');
        await tx.wallet.update({
          where: { id: payout.walletId },
          data: {
            availableBalance: { increment: payout.amount },
            pendingPayout: { decrement: payout.amount },
            transactions: {
              create: {
                amount: payout.amount,
                type: 'UNFREEZE' as TransactionType,
                source: 'REVERSAL' as TransactionSource,
                referenceId: payout.id,
                metadata: { reason: 'Payout rejected' },
              },
            },
          },
        });
        return tx.payoutRequest.update({
          where: { id: cleanedId },
          data: { status: 'REJECTED' as PayoutStatus, adminNote },
        });
      }

      if (action === 'paid') {
        if (!['APPROVED', 'PROCESSING'].includes(payout.status))
          throw new ValidationError('Only approved/processing payouts can be marked paid');
        await tx.wallet.update({ where: { id: payout.walletId }, data: { pendingPayout: { decrement: payout.amount } } });
        return tx.payoutRequest.update({
          where: { id: cleanedId },
          data: {
            status: 'PAID' as PayoutStatus,
            adminNote,
            externalReference,
            processedAt: new Date(),
          },
        });
      }

      throw new ValidationError('Invalid action');
    });

    return updated;
  }

  // Credits & debits during commerce flows
  async creditForTeacher(userId: string, amount: number, metadata?: any) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const wallet = await this.ensureWallet(userId);
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: amt },
        transactions: {
          create: { amount: amt, type: 'CREDIT' as TransactionType, source: 'COURSE_SALE' as TransactionSource, metadata },
        },
      },
    });
  }

  async debitForRefund(userId: string, amount: number, metadata?: any) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const wallet = await this.ensureWallet(userId);
    await prisma.$transaction(async (tx) => {
      const current = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { availableBalance: true } });
      if (!current) throw new NotFoundError('Wallet not found');
      if (current.availableBalance < amt) throw new ValidationError('Insufficient balance');
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: amt },
          transactions: {
            create: { amount: amt, type: 'DEBIT' as TransactionType, source: 'REFUND' as TransactionSource, metadata },
          },
        },
      });
    });
  }
}

export default new WalletService();
