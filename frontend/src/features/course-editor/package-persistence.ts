import type { LessonPackage } from '@/types';
import type { PackageFormData } from './types';

const DECIMAL_PLACES = 2;

const roundCurrency = (value: number): number =>
  Number(value.toFixed(DECIMAL_PLACES));

const parseNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return 0;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
};

const parseInteger = (value: number | string | null | undefined): number => {
  const parsedValue = parseNumber(value);

  return Number.isFinite(parsedValue) ? Math.trunc(parsedValue) : 0;
};

const normalizeFeatures = (features: string[]): string[] =>
  Array.from(
    new Set(
      features
        .map((feature) => feature.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
    )
  );

export const calculatePackageFinalPrice = (
  price: number | string,
  discount: number | string
): number => {
  const normalizedPrice = parseNumber(price);
  const normalizedDiscount = parseNumber(discount);

  return roundCurrency(Math.max(0, normalizedPrice - normalizedDiscount));
};

export const buildPackageSavePayload = (
  data: PackageFormData,
  features: string[]
): Partial<LessonPackage> => {
  const normalizedFeatures = normalizeFeatures(features);

  if (normalizedFeatures.length === 0) {
    throw new Error('Please add at least one package feature');
  }

  const price = roundCurrency(parseNumber(data.price));
  const discount = roundCurrency(parseNumber(data.discount));
  const duration = parseInteger(data.duration);
  const maxStudents = parseInteger(data.maxStudents);
  const finalPrice = calculatePackageFinalPrice(price, discount);

  if (price <= 0) {
    throw new Error('Package price must be greater than 0');
  }

  if (discount < 0) {
    throw new Error('Discount cannot be negative');
  }

  if (discount > price) {
    throw new Error('Discount cannot exceed price');
  }

  if (duration < 0) {
    throw new Error('Duration cannot be negative');
  }

  if (maxStudents < 1) {
    throw new Error('Max students must be at least 1');
  }

  return {
    ...data,
    price,
    discount,
    finalPrice,
    duration,
    maxStudents,
    features: normalizedFeatures,
  };
};
