import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDateRange,
  parseNullableString,
  parseOptionalBoolean,
  parseOptionalEnum,
  parsePositiveAmount,
  parseQueryNonNegativeInt,
  parseQueryPositiveInt,
  parseRequiredString,
  parseStringArray,
} from "../utils/http";
import {
  extractUploadPathFromUrlOrPath,
  isTrustedLocalUploadCandidate,
  validateUrlOrUploadPathForFolders,
} from "../utils/url-or-path";
import { buildProtectedAssetDescriptor } from "../utils/protected-asset";
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

  it("rounds positive currency amounts to cents before enforcing min 0.01 and max bounds", () => {
    assert.equal(parsePositiveAmount("12.345", "amount"), 12.35);
    assert.throws(
      () => parsePositiveAmount("0.004", "amount"),
      /must be at least 0\.01/i,
    );
    assert.throws(
      () => parsePositiveAmount(100.006, "amount", { max: 100 }),
      /must not exceed 100/i,
    );
    assert.equal(parsePositiveAmount(100.004, "amount", { max: 100 }), 100);
    assert.equal(parsePositiveAmount(99.995, "amount", { max: 100 }), 100);
  });

  it("parses booleans, enums, string arrays, and date-only end-of-day ranges", () => {
    assert.equal(parseOptionalBoolean("true", "isActive"), true);
    assert.equal(parseOptionalBoolean("0", "isActive"), false);
    assert.equal(
      parseOptionalEnum("hot", ["hot", "new", "weekly"] as const, "tab"),
      "hot",
    );
    assert.equal(
      parseOptionalBoolean(undefined, "isActive", {
        rejectNull: true,
        rejectBlank: true,
      }),
      undefined,
    );
    assert.throws(
      () =>
        parseOptionalBoolean(null, "isActive", {
          rejectNull: true,
          rejectBlank: true,
        }),
      /cannot be null/i,
    );
    assert.throws(
      () =>
        parseOptionalBoolean("   ", "isActive", {
          rejectNull: true,
          rejectBlank: true,
        }),
      /cannot be empty/i,
    );
    assert.throws(
      () =>
        parseOptionalEnum(null, ["LIVE", "RECORDED"] as const, "type", {
          rejectNull: true,
          rejectBlank: true,
        }),
      /cannot be null/i,
    );
    assert.throws(
      () =>
        parseOptionalEnum("", ["LIVE", "RECORDED"] as const, "type", {
          rejectNull: true,
          rejectBlank: true,
        }),
      /cannot be empty/i,
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

  it("extracts upload paths safely while stripping query/hash and preserving third-party origins", () => {
    const prevApiUrl = process.env.API_URL;
    process.env.API_URL = "https://api.flexilearn.example.com/api/v1";
    try {
      assert.equal(
        extractUploadPathFromUrlOrPath(
          "/uploads/materials/syllabus%20v1.pdf?download=1#page=2",
        ),
        "materials/syllabus v1.pdf",
      );
      assert.equal(
        extractUploadPathFromUrlOrPath(
          "http://localhost:3000/uploads/avatars/teacher.png?v=2",
        ),
        "avatars/teacher.png",
      );
      assert.equal(
        extractUploadPathFromUrlOrPath(
          "https://api.flexilearn.example.com/uploads/thumbnails/course.webp",
        ),
        "thumbnails/course.webp",
      );
      assert.equal(
        extractUploadPathFromUrlOrPath(
          "https://cdn.thirdparty.org/uploads/thumbnails/course.webp",
        ),
        null,
      );
      assert.equal(
        extractUploadPathFromUrlOrPath("/Uploads/Materials/lecture.pdf"),
        "materials/lecture.pdf",
      );
      assert.equal(
        extractUploadPathFromUrlOrPath("/uploads/materials/../secrets.txt"),
        null,
      );
      assert.equal(
        isTrustedLocalUploadCandidate(
          "http://localhost:3000/Uploads/verifications/secret.pdf",
        ),
        true,
      );

      const checkAvatars = validateUrlOrUploadPathForFolders(
        "Invalid avatar URL",
        ["avatars"],
      );
      assert.throws(
        () =>
          checkAvatars(
            "http://localhost:3000/uploads/verifications/id-card.pdf",
          ),
        /Invalid avatar URL/,
      );
      assert.throws(
        () => checkAvatars("/Uploads/verifications/id-card.pdf"),
        /Invalid avatar URL/,
      );
      assert.throws(
        () =>
          buildProtectedAssetDescriptor(
            "http://localhost:3000/uploads/avatars/../secrets.txt",
            { allowedFolders: ["avatars"] },
          ),
        /Invalid upload file path/i,
      );
    } finally {
      if (prevApiUrl === undefined) {
        delete process.env.API_URL;
      } else {
        process.env.API_URL = prevApiUrl;
      }
    }
  });
});
