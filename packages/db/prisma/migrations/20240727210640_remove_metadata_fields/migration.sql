/*
  Warnings:

  - You are about to drop the column `bio` on the `Author` table. All the data in the column will be lost.
  - You are about to drop the column `deathYear` on the `Author` table. All the data in the column will be lost.
  - You are about to drop the column `englishName` on the `Author` table. All the data in the column will be lost.
  - You are about to drop the column `arabicName` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `englishName` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the `Genre` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BookToGenre` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ocrContent` to the `Page` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_BookToGenre" DROP CONSTRAINT "_BookToGenre_A_fkey";

-- DropForeignKey
ALTER TABLE "_BookToGenre" DROP CONSTRAINT "_BookToGenre_B_fkey";

-- AlterTable
ALTER TABLE "Author" DROP COLUMN "bio",
DROP COLUMN "deathYear",
DROP COLUMN "englishName";

-- AlterTable
ALTER TABLE "Book" DROP COLUMN "arabicName",
DROP COLUMN "englishName";

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "ocrContent" TEXT NOT NULL,
ADD COLUMN     "ocrFootnotes" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- DropTable
DROP TABLE "Genre";

-- DropTable
DROP TABLE "_BookToGenre";
