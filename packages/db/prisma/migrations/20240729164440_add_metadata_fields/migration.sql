-- AlterTable
ALTER TABLE "Author" ADD COLUMN     "airtableId" TEXT,
ADD COLUMN     "englishName" TEXT;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "airtableId" TEXT,
ADD COLUMN     "arabicName" TEXT,
ADD COLUMN     "englishName" TEXT;
