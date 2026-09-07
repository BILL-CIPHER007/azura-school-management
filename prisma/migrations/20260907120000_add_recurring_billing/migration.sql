-- CreateEnum
CREATE TYPE "BillingTargetScope" AS ENUM ('SCHOOL', 'CLASSROOM');

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN "billingRuleId" TEXT;
ALTER TABLE "Charge" ADD COLUMN "billingBatchId" TEXT;
ALTER TABLE "Charge" ADD COLUMN "competence" TEXT;

-- CreateTable
CREATE TABLE "BillingRule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classroomId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "targetScope" "BillingTargetScope" NOT NULL DEFAULT 'SCHOOL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingBatch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "billingRuleId" TEXT NOT NULL,
    "competence" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "eligibleStudents" INTEGER NOT NULL DEFAULT 0,
    "skippedStudents" INTEGER NOT NULL DEFAULT 0,
    "existingCharges" INTEGER NOT NULL DEFAULT 0,
    "generatedCharges" INTEGER NOT NULL DEFAULT 0,
    "amountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Charge_schoolId_billingRuleId_competence_idx" ON "Charge"("schoolId", "billingRuleId", "competence");

-- CreateIndex
CREATE INDEX "Charge_schoolId_billingBatchId_idx" ON "Charge"("schoolId", "billingBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_schoolId_studentId_billingRuleId_competence_key" ON "Charge"("schoolId", "studentId", "billingRuleId", "competence");

-- CreateIndex
CREATE INDEX "BillingRule_schoolId_isActive_idx" ON "BillingRule"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "BillingRule_schoolId_classroomId_idx" ON "BillingRule"("schoolId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingBatch_schoolId_billingRuleId_competence_key" ON "BillingBatch"("schoolId", "billingRuleId", "competence");

-- CreateIndex
CREATE INDEX "BillingBatch_schoolId_competence_idx" ON "BillingBatch"("schoolId", "competence");

-- CreateIndex
CREATE INDEX "BillingBatch_schoolId_createdAt_idx" ON "BillingBatch"("schoolId", "createdAt");

-- AddCheckConstraint
ALTER TABLE "BillingRule" ADD CONSTRAINT "BillingRule_dueDay_check" CHECK ("dueDay" BETWEEN 1 AND 31);

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_billingRuleId_fkey" FOREIGN KEY ("billingRuleId") REFERENCES "BillingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_billingBatchId_fkey" FOREIGN KEY ("billingBatchId") REFERENCES "BillingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRule" ADD CONSTRAINT "BillingRule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRule" ADD CONSTRAINT "BillingRule_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingBatch" ADD CONSTRAINT "BillingBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingBatch" ADD CONSTRAINT "BillingBatch_billingRuleId_fkey" FOREIGN KEY ("billingRuleId") REFERENCES "BillingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingBatch" ADD CONSTRAINT "BillingBatch_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
