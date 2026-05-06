export interface PaginationWindow {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type PaginationOptions = {
  defaultLimit?: number;
  maxLimit?: number;
};

const toPositiveInteger = (
  value: number | undefined,
  fallback: number,
): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const integerValue = Math.floor(value as number);
  return integerValue > 0 ? integerValue : fallback;
};

export const normalizePagination = (
  page: number | undefined,
  limit: number | undefined,
  options: PaginationOptions = {},
): PaginationWindow => {
  const safeMaxLimit = toPositiveInteger(options.maxLimit, 100);
  const safeDefaultLimit = Math.min(
    toPositiveInteger(options.defaultLimit, 10),
    safeMaxLimit,
  );

  const safePage = toPositiveInteger(page, 1);
  const requestedLimit = toPositiveInteger(limit, safeDefaultLimit);
  const safeLimit = Math.min(requestedLimit, safeMaxLimit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const safePage = toPositiveInteger(page, 1);
  const safeLimit = toPositiveInteger(limit, 10);

  return {
    total: safeTotal,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(safeTotal / safeLimit),
  };
};
