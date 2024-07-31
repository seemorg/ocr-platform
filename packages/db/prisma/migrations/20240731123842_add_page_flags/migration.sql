-- CreateEnum
CREATE TYPE "PageFlag" AS ENUM ('NEEDS_ADDITIONAL_REVIEW');

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "flags" "PageFlag"[];
