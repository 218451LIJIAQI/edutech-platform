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
  const numericValue = isDecimalLike(value) ? value.toNumber() : Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const roundMoney = (value: number): number => {
  const factor = 10 ** MONEY_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
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

  if (rate < 0) {
    return 0;
  }

  if (rate > 100) {
    return 100;
  }

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
