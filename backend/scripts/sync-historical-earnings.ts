import prisma from '../src/config/database';

/**
 * Script to sync historical teacher earnings to the new wallet system
 * 
 * This script handles the data migration from the old payment system to the new wallet system.
 * It ensures that teachers who made sales before the wallet feature was implemented
 * have their earnings properly reflected in their wallets.
 * 
 * Process:
 * 1. Find all completed payments (from before wallet feature)
 * 2. Group earnings by teacher
 * 3. Create wallets for teachers who don't have one
 * 4. Update wallet balances with historical earnings
 * 5. Create transaction records for audit trail
 * 6. Verify the sync was successful
 */

interface TeacherEarnings {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  totalEarnings: number;
  paymentCount: number;
  firstPaymentDate: Date | null;
  lastPaymentDate: Date | null;
}

async function syncHistoricalEarnings() {
  console.log('🚀 Starting historical teacher earnings sync to wallet system...\n');

  try {
    // Step 1: Get all completed payments
    console.log('📊 Step 1: Fetching completed payments...');
    const completedPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { not: null },
        teacherEarning: { gt: 0 },
      },
      include: {
        package: {
          include: {
            course: {
              include: {
                teacherProfile: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: 'asc',
      },
    });

    console.log(`✅ Found ${completedPayments.length} completed payments\n`);

    if (completedPayments.length === 0) {
      console.log('ℹ️  No completed payments found. Nothing to sync.\n');
      return;
    }

    // Step 2: Group earnings by teacher
    console.log('📈 Step 2: Grouping earnings by teacher...');
    const teacherEarningsMap = new Map<string, TeacherEarnings>();

    for (const payment of completedPayments) {
      const teacher = payment.package?.course?.teacherProfile?.user;
      if (!teacher) continue;

      const teacherId = teacher.id;
      const existing = teacherEarningsMap.get(teacherId);

      if (existing) {
        existing.totalEarnings += payment.teacherEarning;
        existing.paymentCount += 1;
        if (payment.paidAt && (!existing.lastPaymentDate || payment.paidAt > existing.lastPaymentDate)) {
          existing.lastPaymentDate = payment.paidAt;
        }
      } else {
        teacherEarningsMap.set(teacherId, {
          teacherId,
          teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
          teacherEmail: teacher.email,
          totalEarnings: payment.teacherEarning,
          paymentCount: 1,
          firstPaymentDate: payment.paidAt,
          lastPaymentDate: payment.paidAt,
        });
      }
    }

    console.log(`✅ Found earnings for ${teacherEarningsMap.size} teachers\n`);

    // Step 3: Process each teacher
    console.log('💼 Step 3: Processing teacher wallets...\n');
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let totalAmountSynced = 0;

    for (const [teacherId, earnings] of teacherEarningsMap.entries()) {
      try {
        console.log(`Processing: ${earnings.teacherName} (${earnings.teacherEmail})`);
        console.log(`  └─ Total Earnings: $${earnings.totalEarnings.toFixed(2)}`);
        console.log(`  └─ Payment Count: ${earnings.paymentCount}`);
        console.log(`  └─ Period: ${earnings.firstPaymentDate?.toLocaleDateString()} to ${earnings.lastPaymentDate?.toLocaleDateString()}`);

        // Check if wallet already exists
        let wallet = await prisma.wallet.findUnique({
          where: { userId: teacherId },
        });

        if (!wallet) {
          console.log('  └─ Creating new wallet...');
          wallet = await prisma.wallet.create({
            data: {
              userId: teacherId,
              availableBalance: 0,
              pendingPayout: 0,
              currency: 'USD',
            },
          });
        }

        const currentBalance = wallet.availableBalance;

        // Check if already synced (to avoid duplicate syncs)
        const existingTransaction = await prisma.walletTransaction.findFirst({
          where: {
            walletId: wallet.id,
            source: 'COURSE_SALE',
            metadata: {
              path: ['syncedFrom'],
              equals: 'historical_payments',
            },
          },
        });

        if (existingTransaction && currentBalance > 0) {
          console.log('  └─ ⏭️  Already synced. Skipping...\n');
          skippedCount++;
          continue;
        }

        // Update wallet with historical earnings
        console.log(`  └─ Updating wallet balance...`);
        const updatedWallet = await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: {
              increment: earnings.totalEarnings,
            },
          },
        });

        // Create transaction record for audit trail
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: earnings.totalEarnings,
            type: 'CREDIT',
            source: 'COURSE_SALE',
            metadata: {
              syncedFrom: 'historical_payments',
              paymentCount: earnings.paymentCount,
              syncedAt: new Date().toISOString(),
              note: 'Historical earnings synced from payment records',
              firstPaymentDate: earnings.firstPaymentDate?.toISOString(),
              lastPaymentDate: earnings.lastPaymentDate?.toISOString(),
            },
          },
        });

        console.log(
          `  └─ ✅ Success! Balance: $${currentBalance.toFixed(2)} → $${updatedWallet.availableBalance.toFixed(2)}\n`
        );
        
        successCount++;
        totalAmountSynced += earnings.totalEarnings;
      } catch (error) {
        console.error(`  └─ ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
        errorCount++;
      }
    }

    // Step 4: Summary
    console.log('═'.repeat(70));
    console.log('📋 SYNC SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total Teachers with Earnings: ${teacherEarningsMap.size}`);
    console.log(`  ├─ Successfully Synced: ${successCount}`);
    console.log(`  ├─ Skipped (Already Synced): ${skippedCount}`);
    console.log(`  └─ Errors: ${errorCount}`);
    console.log(`\nTotal Payments Processed: ${completedPayments.length}`);
    console.log(`Total Amount Synced: $${totalAmountSynced.toFixed(2)}`);
    console.log('═'.repeat(70));

    // Step 5: Verification
    console.log('\n✔️  Step 4: Verification...\n');
    const walletsWithBalance = await prisma.wallet.findMany({
      where: {
        availableBalance: {
          gt: 0,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        transactions: {
          where: {
            source: 'COURSE_SALE',
          },
        },
      },
      orderBy: {
        availableBalance: 'desc',
      },
    });

    console.log(`[object Object] with synced earnings (${walletsWithBalance.length} total):\n`);
    let totalVerifiedBalance = 0;
    for (const wallet of walletsWithBalance) {
      console.log(
        `  • ${wallet.user?.firstName} ${wallet.user?.lastName}`
      );
      console.log(`    Email: ${wallet.user?.email}`);
      console.log(`    Balance: $${wallet.availableBalance.toFixed(2)}`);
      console.log(`    Transactions: ${wallet.transactions.length}`);
      console.log('');
      totalVerifiedBalance += wallet.availableBalance;
    }

    console.log('═'.repeat(70));
    console.log(`✅ Total Verified Balance: $${totalVerifiedBalance.toFixed(2)}`);
    console.log('═'.repeat(70));

    console.log('\n🎉 Sync completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('  1. Verify the wallet balances in the admin dashboard');
    console.log('  2. Teachers can now see their earnings in their wallet');
    console.log('  3. Teachers can request payouts from their available balance\n');

  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncHistoricalEarnings();

