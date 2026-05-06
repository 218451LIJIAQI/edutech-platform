/**
 * Prisma seed script for the EduTech Platform.
 *
 * This project intentionally uses an empty baseline database.
 * No default users, courses, payments, or test data are inserted.
 */

async function main() {
  console.info(
    "Prisma seed skipped: empty baseline database is intentional; no default seed data is configured.",
  );
}

main().catch((error) => {
  console.error("Prisma seed script failed unexpectedly.");
  console.error(error);
  process.exitCode = 1;
});
