-- CreateEnum
CREATE TYPE "PageOcrStatus" AS ENUM ('UNPROCESSED', 'PROCESSING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "ocrStatus" "PageOcrStatus" NOT NULL DEFAULT 'COMPLETED';
