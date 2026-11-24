const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MONEY_DECIMAL_PLACES = 2;

type DecimalLike = {
  toNumber: () => number;
};

type TeacherCommissionProfile = {
  commissionRate?: unknown;
};

const isDecimalLike = (value: unknown): value is DecimalLike =>
  Boolean(
    value &&
      typeof value === "object" &&
      "toNumber" in value &&
      typeof (value as DecimalLike).toNumber === "function",
  );

export const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numericValue = isDecimalLike(value) ? value.toNumber() : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = isDecimalLike(value) ? value.toNumber() : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const roundMoney = (value: unknown): number => {
  const factor = 10 ** MONEY_DECIMAL_PLACES;
  const numericValue = toNumber(value, 0);
  return Math.round((numericValue + Number.EPSILON) * factor) / factor;
};

const normalizeMoneyAmount = (value: unknown): number => {
  const amount = toNumber(value);
  return amount > 0 ? roundMoney(amount) : 0;
};

const resolveCommissionRate = (
  teacherProfile: TeacherCommissionProfile | null | undefined,
  fallbackRate: unknown,
): number => {
  const rawRate = teacherProfile?.commissionRate ?? fallbackRate ?? 0;
  const rate = toNumber(rawRate);

  if (rate < 0) return 0;
  if (rate > 100) return 100;
  return rate;
};

export const calculatePlatformCommission = (
  amount: unknown,
  teacherProfile: TeacherCommissionProfile | null | undefined,
  fallbackRate: unknown,
): number => {
  const grossAmount = normalizeMoneyAmount(amount);
  const commissionRate = resolveCommissionRate(teacherProfile, fallbackRate);
  return roundMoney((grossAmount * commissionRate) / 100);
};

export const calculateTeacherNetEarning = (
  amount: unknown,
  teacherProfile: TeacherCommissionProfile | null | undefined,
  fallbackRate: unknown,
): number => {
  const grossAmount = normalizeMoneyAmount(amount);
  const platformCommission = calculatePlatformCommission(
    grossAmount,
    teacherProfile,
    fallbackRate,
  );
  return roundMoney(grossAmount - platformCommission);
};

export const calculateExpirationDate = (
  durationInDays: unknown,
  referenceDate: Date = new Date(),
): Date | null => {
  const durationDays = Math.floor(toNumber(durationInDays));
  if (durationDays <= 0) {
    return null;
  }

  return new Date(referenceDate.getTime() + durationDays * DAY_IN_MS);
};

export type AllocatedOrderItemAmount<T> = {
  item: T;
  itemPrice: number;
  allocatedAmount: number;
};

/**
 * Proportionally allocates `targetAmount` across order items based on `finalPrice`,
 * assigning any cent rounding remainder to the final item so shares sum to `targetAmount`.
 */
export const allocateOrderItemAmounts = <T extends { finalPrice: unknown }>(
  items: readonly T[],
  targetAmount: unknown,
  options?: { fallbackBase?: unknown; equalFallbackWhenZeroItemsTotal?: boolean },
): AllocatedOrderItemAmount<T>[] => {
  if (items.length === 0) {
    return [];
  }

  const normalizedTarget = normalizeMoneyAmount(targetAmount);
  const itemPrices = items.map((item) =>
    roundMoney(Math.max(0, toNumber(item.finalPrice))),
  );

  if (normalizedTarget <= 0) {
    return items.map((item, index) => ({
      item,
      itemPrice: itemPrices[index],
      allocatedAmount: 0,
    }));
  }

  const totalItemsPrice = roundMoney(
    itemPrices.reduce((sum, price) => sum + price, 0),
  );
  const fallbackBase =
    options?.fallbackBase !== undefined
      ? normalizeMoneyAmount(options.fallbackBase)
      : 0;
  const proportionalBase = totalItemsPrice > 0 ? totalItemsPrice : fallbackBase;

  if (proportionalBase <= 0 && !options?.equalFallbackWhenZeroItemsTotal) {
    return items.map((item, index) => ({
      item,
      itemPrice: itemPrices[index],
      allocatedAmount: 0,
    }));
  }

  let allocatedSoFar = 0;
  return items.map((item, index) => {
    const itemPrice = itemPrices[index];
    const isLastItem = index === items.length - 1;
    const shareRatio =
      proportionalBase > 0 ? itemPrice / proportionalBase : 1 / items.length;
    const allocatedAmount = isLastItem
      ? roundMoney(normalizedTarget - allocatedSoFar)
      : roundMoney(normalizedTarget * shareRatio);
    allocatedSoFar = roundMoney(allocatedSoFar + allocatedAmount);

    return {
      item,
      itemPrice,
      allocatedAmount,
    };
  });
};
