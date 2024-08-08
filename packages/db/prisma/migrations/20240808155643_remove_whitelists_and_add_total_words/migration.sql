/*
  Warnings:

  - You are about to drop the `UserWhitelist` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[bookId,pdfPageNumber]` on the table `Page` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "totalWords" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "UserWhitelist";

-- CreateIndex
CREATE INDEX "Page_totalWords_idx" ON "Page"("totalWords");

-- CreateIndex
CREATE UNIQUE INDEX "Page_bookId_pdfPageNumber_key" ON "Page"("bookId", "pdfPageNumber");
