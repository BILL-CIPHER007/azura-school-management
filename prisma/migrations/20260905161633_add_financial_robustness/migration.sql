-- CreateEnum
CREATE TYPE "FinancialEventSource" AS ENUM ('ADMIN', 'WEBHOOK', 'RECONCILIATION', 'SYSTEM');

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChargeFinancialEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "userId" TEXT,
    "source" "FinancialEventSource" NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "ChargeStatus",
    "nextStatus" "ChargeStatus",
    "previousExternalStatus" TEXT,
    "nextExternalStatus" TEXT,
    "message" TEXT,
    "externalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChargeFinancialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChargeFinancialEvent_schoolId_chargeId_createdAt_idx" ON "ChargeFinancialEvent"("schoolId", "chargeId", "createdAt");

-- CreateIndex
CREATE INDEX "ChargeFinancialEvent_chargeId_createdAt_idx" ON "ChargeFinancialEvent"("chargeId", "createdAt");

-- CreateIndex
CREATE INDEX "ChargeFinancialEvent_externalEventId_idx" ON "ChargeFinancialEvent"("externalEventId");

-- AddForeignKey
ALTER TABLE "ChargeFinancialEvent" ADD CONSTRAINT "ChargeFinancialEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeFinancialEvent" ADD CONSTRAINT "ChargeFinancialEvent_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeFinancialEvent" ADD CONSTRAINT "ChargeFinancialEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ClassDiaryEntry_schoolId_classroomId_subjectId_teacherId_date_k" RENAME TO "ClassDiaryEntry_schoolId_classroomId_subjectId_teacherId_da_key";
