-- CreateEnum
CREATE TYPE "CollectionActionType" AS ENUM ('CONTACT', 'CONTACTED', 'NOTE', 'PAYMENT_PROMISE');

-- CreateEnum
CREATE TYPE "CollectionChannel" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentPromiseStatus" AS ENUM ('OPEN', 'FULFILLED', 'OVERDUE', 'CANCELED');

-- CreateTable
CREATE TABLE "CollectionAction" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "type" "CollectionActionType" NOT NULL,
    "channel" "CollectionChannel",
    "note" TEXT,
    "promisedDate" TIMESTAMP(3),
    "promiseStatus" "PaymentPromiseStatus",
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionAction_schoolId_chargeId_createdAt_idx" ON "CollectionAction"("schoolId", "chargeId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionAction_schoolId_type_createdAt_idx" ON "CollectionAction"("schoolId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionAction_schoolId_promiseStatus_promisedDate_idx" ON "CollectionAction"("schoolId", "promiseStatus", "promisedDate");

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAction" ADD CONSTRAINT "CollectionAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
