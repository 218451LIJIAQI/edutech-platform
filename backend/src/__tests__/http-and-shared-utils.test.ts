import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDateRange,
  parseNullableString,
  parseOptionalBoolean,
  parseOptionalEnum,
  parseQueryNonNegativeInt,
  parseQueryPositiveInt,
  parseRequiredString,
  parseStringArray,
} from "../utils/http";
import {
  buildPaginationMeta,
  normalizeOffsetPagination,
  normalizePagination,
} from "../services/shared/pagination";
import {
  roundMoney,
  toNullableNumber,
  toNumber,
} from "../services/shared/payment-utils";

describe("HTTP parsing and shared service utilities", () => {
  it("preserves raw password whitespace when trim=false and trims standard strings", () => {
    assert.equal(
      parseRequiredString("  secretWithSpace  ", "password", { trim: false }),
      "  secretWithSpace  ",
    );
    assert.equal(parseRequiredString("  Alice  ", "firstName"), "Alice");
    assert.equal(parseNullableString("   ", "phone"), null);
    assert.equal(parseNullableString(undefined, "phone"), undefined);
  });

  it("clamps query pagination integers to max and rejects non-integers", () => {
    assert.equal(
      parseQueryPositiveInt("250", "limit", { fallback: 20, max: 100 }),
      100,
    );
    assert.equal(
      parseQueryPositiveInt(undefined, "page", { fallback: 1 }),
      1,
    );
    assert.equal(
      parseQueryNonNegativeInt("0", "offset", { fallback: 0, max: 1000 }),
      0,
    );
    assert.throws(() => parseQueryPositiveInt("0", "page"));
    assert.throws(() => parseQueryNonNegativeInt("-1", "offset"));
  });

  it("parses booleans, enums, string arrays, and date-only end-of-day ranges", () => {
    assert.equal(parseOptionalBoolean("true", "isActive"), true);
    assert.equal(parseOptionalBoolean("0", "isActive"), false);
    assert.equal(
      parseOptionalEnum("hot", ["hot", "new", "weekly"] as const, "tab"),
      "hot",
    );
    assert.deepEqual(
      parseStringArray([" math ", "math", "physics"], "tags"),
      ["math", "physics"],
    );

    const range = parseDateRange({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    assert.equal(range.startDate?.toISOString(), "2026-03-01T00:00:00.000Z");
    assert.equal(range.endDate?.toISOString(), "2026-03-31T23:59:59.999Z");
    assert.throws(() =>
      parseDateRange({ startDate: "2026-04-02", endDate: "2026-04-01" }),
    );
  });

  it("normalizes page/offset pagination and Decimal-like money values", () => {
    assert.deepEqual(normalizePagination(2, 500, { maxLimit: 100 }), {
      page: 2,
      limit: 100,
      skip: 100,
    });
    assert.deepEqual(normalizeOffsetPagination(500, -5, { maxLimit: 100 }), {
      limit: 100,
      offset: 0,
    });
    assert.deepEqual(buildPaginationMeta(45, 2, 20), {
      total: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
    });

    const fakeDecimal = { toNumber: () => 19.995 };
    assert.equal(toNumber(fakeDecimal), 19.995);
    assert.equal(roundMoney(fakeDecimal), 20);
    assert.equal(toNullableNumber(null), null);
  });
});
