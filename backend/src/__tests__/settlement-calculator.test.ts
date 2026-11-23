import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculatePlatformCommission,
  calculateTeacherNetEarning,
} from "../services/shared/payment-utils";
import {
  computeTeacherSettlementsSummary,
  resolvePaymentCommissionBreakdown,
} from "../services/shared/settlement-calculator";

describe("payment commission and teacher settlement calculations", () => {
  it("preserves explicit 0% custom teacher commission rate instead of falling back to platform default", () => {
    assert.equal(calculatePlatformCommission(200, { commissionRate: 0 }, 10), 0);
    assert.equal(calculateTeacherNetEarning(200, { commissionRate: 0 }, 10), 200);
    assert.equal(
      calculatePlatformCommission(200, { commissionRate: null }, 10),
      20,
    );
    assert.equal(
      calculateTeacherNetEarning(200, { commissionRate: null }, 10),
      180,
    );
  });

  it("prefers stored payment commission breakdown and falls back cleanly for legacy rows", () => {
    assert.deepEqual(
      resolvePaymentCommissionBreakdown(
        { amount: 150, platformCommission: 15, teacherEarning: 135 },
        10,
      ),
      { amount: 150, platformCommission: 15, teacherEarning: 135 },
    );

    // 0% commission teacher: platformCommission is 0, teacherEarning is 150
    assert.deepEqual(
      resolvePaymentCommissionBreakdown(
        { amount: 150, platformCommission: 0, teacherEarning: 150 },
        10,
      ),
      { amount: 150, platformCommission: 0, teacherEarning: 150 },
    );

    // Legacy payment row where both stored fields were 0
    assert.deepEqual(
      resolvePaymentCommissionBreakdown(
        { amount: 150, platformCommission: 0, teacherEarning: 0 },
        10,
      ),
      { amount: 150, platformCommission: 15, teacherEarning: 135 },
    );
  });

  it("computes multi-teacher cart orders, proportional partial refunds, pending payouts, and full-dataset totals across pages", () => {
    const teachers = [
      {
        id: "tp-alice",
        userId: "u-alice",
        commissionRate: 0, // Promotional 0% commission teacher
        totalStudents: 12,
        courseCount: 2,
        user: { firstName: "Alice", lastName: "Tan", email: "alice@example.com" },
      },
      {
        id: "tp-bob",
        userId: "u-bob",
        commissionRate: null, // Uses default 10% platform commission
        totalStudents: 8,
        courseCount: 1,
        user: { firstName: "Bob", lastName: "Lim", email: "bob@example.com" },
      },
    ];

    const payments = [
      // Multi-item cart order ($100 Alice + $200 Bob = $300 total)
      {
        amount: 300,
        teacherEarning: 280,
        package: null,
        order: {
          items: [
            {
              finalPrice: 100,
              package: { course: { teacherProfileId: "tp-alice" } },
            },
            {
              finalPrice: 200,
              package: { course: { teacherProfileId: "tp-bob" } },
            },
          ],
        },
      },
      // Direct single-package payment ($50 Bob -> $45 net stored)
      {
        amount: 50,
        teacherEarning: 45,
        package: { course: { teacherProfileId: "tp-bob" } },
        order: null,
      },
    ];

    // Partial refund of $150 (50% of the $300 multi-item order):
    // Alice gross share = $50 (0% commission -> $50 deduction)
    // Bob gross share = $100 (10% commission -> $90 deduction)
    const refunds = [
      {
        amount: 150,
        order: {
          items: [
            {
              finalPrice: 100,
              package: { course: { teacherProfileId: "tp-alice" } },
            },
            {
              finalPrice: 200,
              package: { course: { teacherProfileId: "tp-bob" } },
            },
          ],
        },
      },
    ];

    const pendingPayouts = [{ userId: "u-bob", amount: 30 }];

    // Request page 1 with limit 1 to verify totals reflect ALL teachers, not just page 1
    const pageOne = computeTeacherSettlementsSummary({
      teachers,
      payments,
      refunds,
      pendingPayouts,
      defaultCommissionRate: 10,
      page: 1,
      limit: 1,
    });

    assert.equal(pageOne.settlements.length, 1);
    assert.deepEqual(pageOne.settlements[0], {
      teacherProfileId: "tp-alice",
      teacherName: "Alice Tan",
      teacherEmail: "alice@example.com",
      totalEarnings: 100,
      totalRefundDeductions: 50,
      pendingPayouts: 0,
      netSettlement: 50,
      totalStudents: 12,
      courseCount: 2,
      commissionRate: 0,
    });

    // Bob: earnings = 180 + 45 = 225, refund deduction = 90, pending payout = 30 -> net = 105
    // Full-dataset totals: earnings = 100 + 225 = 325, refunds = 50 + 90 = 140, net = 50 + 105 = 155
    assert.deepEqual(pageOne.totals, {
      totalEarnings: 325,
      totalRefundDeductions: 140,
      totalNetSettlement: 155,
    });
    assert.deepEqual(pageOne.pagination, {
      total: 2,
      page: 1,
      limit: 1,
      totalPages: 2,
    });
  });
});
