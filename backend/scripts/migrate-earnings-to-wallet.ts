#!/usr/bin/env ts-node
/**
 * Data Migration Script: Sync Historical Teacher Earnings to Wallet System
 * 
 * Purpose:
 * - Sync all historical completed payments to the new wallet system
 * - Create wallet entries for all teachers
 * - Calculate and populate available balance from historical earnings (net of refunds)
 * - Create a single audit transaction per teacher (idempotent)
 * 
 * Idempotency:
 * - Uses referenceId = 'HIST_SYNC_V1' on wallet transaction
 * - If such a transaction already exists for a wallet, that teacher is skipped
 * 
 * Usage:
 *  cd backend
 *  npx ts-node scripts/migrate-earnings-to-wallet.ts
 *  # or
 *  npx tsx scripts/migrate-earnings-to-wallet.ts
 */

import prisma from '../src/config/database';

interface TeacherEarnings {
  teacherId: string;
  teacherName: string;
  email: string;
  totalEarnings: number;      // Sum of teacherEarning from completed payments
  totalRefundedPortion: number; // Portion of teacherEarning reduced due to completed refunds
  netEarnings: number;        // totalEarnings - totalRefundedPortion (never < 0)
  paymentCount: number;
  firstPaymentDate: Date | null;
  lastPaymentDate: Date | null;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TEACHER EARNINGS MIGRATION TO WALLET SYSTEM (HIST_SYNC_V1)');
  console.log('='.repeat(80) + '\n');

  try {
    // STEP 1: Fetch all completed payments with order + refunds
    console.log('📊 STEP 1: Fetching completed payments with order/refunds...');
    const completedPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { not: null },
      },
      include: {
        order: {
          include: {
            refunds: true,
          },
        },
        package: {
          include: {
            course: {
              include: {
                teacherProfile: {
                  include: {
                    user: {
                      select: { id: true, firstName: true, lastName: true, email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    console.log(`   ✓ Found ${completedPayments.length} completed payments\n`);
    if (completedPayments.length === 0) {
      console.log('   ℹ️  No completed payments found. Nothing to migrate.\n');
      return;
    }

    // STEP 2: Group by teacher and compute net of completed refunds
    console.log('👥 STEP 2: Grouping net earnings by teacher (net of completed refunds)...');
    const teacherEarningsMap = new Map<string, TeacherEarnings>();

    for (const payment of completedPayments) {
      const teacher = payment.package?.course?.teacherProfile?.user;
      if (!teacher) continue; // skip if we cannot resolve teacher

      // Compute refund ratio for this payment based on its order's completed refunds
      const orderTotal = payment.order?.totalAmount || 0;
      const completedRefundTotal = (payment.order?.refunds || [])
        .filter(r => r.status === 'COMPLETED')
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      let ratio = 0;
      if (orderTotal > 0 && completedRefundTotal > 0) {
        ratio = Math.min(1, completedRefundTotal / orderTotal);
      }

      const adjustedTeacherEarning = Math.max(0, payment.teacherEarning * (1 - ratio));
      const refundedPortion = Math.max(0, payment.teacherEarning - adjustedTeacherEarning);

      const existing = teacherEarningsMap.get(teacher.id);
      if (existing) {
        existing.totalEarnings += payment.teacherEarning;
        existing.totalRefundedPortion += refundedPortion;
        existing.netEarnings += adjustedTeacherEarning;
        existing.paymentCount += 1;
        if (payment.paidAt && (!existing.lastPaymentDate || payment.paidAt > existing.lastPaymentDate)) {
          existing.lastPaymentDate = payment.paidAt;
        }
      } else {
        teacherEarningsMap.set(teacher.id, {
          teacherId: teacher.id,
          teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
          email: teacher.email,
          totalEarnings: payment.teacherEarning,
          totalRefundedPortion: refundedPortion,
          netEarnings: adjustedTeacherEarning,
          paymentCount: 1,
          firstPaymentDate: payment.paidAt,
          lastPaymentDate: payment.paidAt,
        });
      }
    }

    const teacherEarnings = Array.from(teacherEarningsMap.values());
    console.log(`   ✓ Computed earnings for ${teacherEarnings.length} teachers\n`);

    // STEP 3: Show summary
    console.log('💰 EARNINGS SUMMARY (NET OF REFUNDS):');
    console.log('   ' + '-'.repeat(74));
    let totalNet = 0;
    for (const e of teacherEarnings) {
      console.log(`   • ${e.teacherName} <${e.email}>`);
      console.log(`     Gross: $${e.totalEarnings.toFixed(2)} | Refunded: $${e.totalRefundedPortion.toFixed(2)} | Net: $${e.netEarnings.toFixed(2)}`);
      console.log(`     Payments: ${e.paymentCount} | Period: ${e.firstPaymentDate?.toLocaleDateString()} - ${e.lastPaymentDate?.toLocaleDateString()}`);
      console.log('');
      totalNet += e.netEarnings;
    }
    console.log('   ' + '-'.repeat(74));
    console.log(`   TOTAL NET TO SYNC: $${totalNet.toFixed(2)} across ${teacherEarnings.length} teachers\n`);

    // STEP 4: Ensure wallets and sync (idempotent by referenceId)
    console.log('💳 STEP 3: Creating/updating wallets (idempotent)...');
    const REF_ID = 'HIST_SYNC_V1';
    let walletsCreated = 0;
    let walletsSynced = 0;
    const errors: Array<{ teacher: string; error: string } > = [];

    for (const e of teacherEarnings) {
      try {
        // Skip if nothing to sync
        if (e.netEarnings <= 0) {
          console.log(`   • ${e.teacherName}: Net = $0.00, skipping.`);
          continue;
        }

        // Ensure wallet exists
        let wallet = await prisma.wallet.findUnique({ where: { userId: e.teacherId } });
        if (!wallet) {
          wallet = await prisma.wallet.create({ data: { userId: e.teacherId, availableBalance: 0, pendingPayout: 0, currency: 'USD' } });
          walletsCreated++;
        }

        // Idempotency: check if historical sync already applied
        const existingHistTxn = await prisma.walletTransaction.findFirst({
          where: { walletId: wallet.id, referenceId: REF_ID },
        });
        if (existingHistTxn) {
          console.log(`   • ${e.teacherName}: already synced (ref=${REF_ID}), skipping.`);
          continue;
        }

        const prev = wallet.availableBalance;
        const updated = await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { increment: e.netEarnings },
            transactions: {
              create: {
                amount: e.netEarnings,
                type: 'CREDIT',
                source: 'COURSE_SALE',
                referenceId: REF_ID,
                metadata: {
                  syncedFrom: 'historical_payments',
                  version: 'v1',
                  paymentCount: e.paymentCount,
                  gross: e.totalEarnings,
                  refundedPortion: e.totalRefundedPortion,
                  net: e.netEarnings,
                  firstPaymentDate: e.firstPaymentDate?.toISOString(),
                  lastPaymentDate: e.lastPaymentDate?.toISOString(),
                  syncedAt: new Date().toISOString(),
                },
              },
            },
          },
        });
        walletsSynced++;
        console.log(`   ✓ ${e.teacherName}: $${prev.toFixed(2)} → $${updated.availableBalance.toFixed(2)} (net +$${e.netEarnings.toFixed(2)})`);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push({ teacher: `${e.teacherName} <${e.email}>`, error: errMsg });
        console.log(`   ✗ ${e.teacherName}: ERROR - ${errMsg}`);
      }
    }

    // STEP 5: Verification
    console.log(`\n✅ STEP 4: Verification...`);
    const verified = await prisma.walletTransaction.count({ where: { referenceId: REF_ID } });
    console.log(`   • Historical sync transactions created: ${verified}`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Teachers processed: ${teacherEarnings.length}`);
    console.log(`Wallets created:   ${walletsCreated}`);
    console.log(`Wallets synced:     ${walletsSynced}`);
    console.log(`Total NET synced:  $${totalNet.toFixed(2)}`);
    console.log(`Errors:            ${errors.length}`);
    if (errors.length) {
      console.log('\nErrors:');
      for (const e of errors) console.log(` - ${e.teacher}: ${e.error}`);
    }
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

