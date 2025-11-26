import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to recalculate actual student counts for all teachers
 * This fixes the issue where totalStudents was incremented for each purchase
 * instead of counting unique students
 */
async function main() {
  try {
    console.log('=== Recalculating teacher student counts ===\n');

    // Get all teachers
    const teachers = await prisma.teacherProfile.findMany({
      select: { id: true, userId: true },
    });

    console.log(`Found ${teachers.length} teachers to process...\n`);

    let updated = 0;
    let errors = 0;

    for (const teacher of teachers) {
      try {
        // Calculate actual unique students for this teacher
        const enrollments = await prisma.enrollment.findMany({
          where: {
            package: {
              course: {
                teacherProfileId: teacher.id,
              },
            },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        });

        const actualStudentCount = enrollments.length;

        // Update the teacher profile with the actual count
        await prisma.teacherProfile.update({
          where: { id: teacher.id },
          data: {
            totalStudents: actualStudentCount,
          },
        });

        console.log(`✓ Teacher ${teacher.userId}: ${actualStudentCount} unique students`);
        updated++;
      } catch (err) {
        console.error(`✗ Error processing teacher ${teacher.userId}:`, (err as Error).message);
        errors++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Successfully updated: ${updated} teachers`);
    console.log(`Errors: ${errors} teachers`);
    console.log(`\nRecalculation completed!`);
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

