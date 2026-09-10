-- CreateEnum
CREATE TYPE "BillingAutomationRunStatus" AS ENUM ('SUCCESS', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingAutomationTrigger" AS ENUM ('CRON', 'MANUAL');

-- AlterTable
ALTER TABLE "BillingRule"
ADD COLUMN "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "generationDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "lastGeneratedCompetence" TEXT,
ADD COLUMN "nextGenerationAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BillingAutomationRun" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "billingRuleId" TEXT,
    "competence" TEXT NOT NULL,
    "trigger" "BillingAutomationTrigger" NOT NULL DEFAULT 'CRON',
    "status" "BillingAutomationRunStatus" NOT NULL,
    "eligibleStudents" INTEGER NOT NULL DEFAULT 0,
    "generatedCharges" INTEGER NOT NULL DEFAULT 0,
    "existingCharges" INTEGER NOT NULL DEFAULT 0,
    "skippedStudents" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingRule_schoolId_autoGenerate_generationDay_idx" ON "BillingRule"("schoolId", "autoGenerate", "generationDay");

-- CreateIndex
CREATE INDEX "BillingAutomationRun_schoolId_createdAt_idx" ON "BillingAutomationRun"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingAutomationRun_schoolId_billingRuleId_createdAt_idx" ON "BillingAutomationRun"("schoolId", "billingRuleId", "createdAt");

-- AddForeignKey
ALTER TABLE "BillingAutomationRun" ADD CONSTRAINT "BillingAutomationRun_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAutomationRun" ADD CONSTRAINT "BillingAutomationRun_billingRuleId_fkey" FOREIGN KEY ("billingRuleId") REFERENCES "BillingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAutomationRun" ADD CONSTRAINT "BillingAutomationRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheck
ALTER TABLE "BillingRule" ADD CONSTRAINT "BillingRule_generationDay_check" CHECK ("generationDay" BETWEEN 1 AND 31);
