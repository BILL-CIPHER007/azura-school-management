-- AlterTable
ALTER TABLE "CollectionAction" ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryStatus" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "recipient" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT;

-- CreateIndex
CREATE INDEX "CollectionAction_schoolId_deliveryStatus_createdAt_idx" ON "CollectionAction"("schoolId", "deliveryStatus", "createdAt");
