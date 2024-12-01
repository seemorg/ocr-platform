/*
  Warnings:

  - A unique constraint covering the columns `[usulBookId,pdfUrl]` on the table `Book` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "usulBookId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Book_usulBookId_pdfUrl_key" ON "Book"("usulBookId", "pdfUrl");
