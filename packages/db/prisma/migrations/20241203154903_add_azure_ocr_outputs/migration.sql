-- CreateTable
CREATE TABLE "AzureOcrOutput" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AzureOcrOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AzureOcrOutput_pageId_key" ON "AzureOcrOutput"("pageId");

-- AddForeignKey
ALTER TABLE "AzureOcrOutput" ADD CONSTRAINT "AzureOcrOutput_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
