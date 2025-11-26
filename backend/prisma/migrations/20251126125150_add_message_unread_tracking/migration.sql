/*
  Warnings:

  - You are about to drop the column `read_at_map` on the `message_threads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "message_threads" DROP COLUMN "read_at_map";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "read_at" TIMESTAMP(3);
