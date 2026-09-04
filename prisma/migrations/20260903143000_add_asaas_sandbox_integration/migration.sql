-- CreateEnum
ALTER TYPE "ChargeStatus" ADD VALUE 'REFUNDED';

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ASAAS');

-- CreateEnum
CREATE TYPE "ExternalBillingType" AS ENUM ('PIX', 'BOLETO');

-- AlterTable
ALTER TABLE "Charge"
ADD COLUMN "provider" "PaymentProvider",
ADD COLUMN "externalPaymentId" TEXT,
ADD COLUMN "billingType" "ExternalBillingType",
ADD COLUMN "invoiceUrl" TEXT,
ADD COLUMN "externalStatus" TEXT,
ADD COLUMN "syncError" TEXT;

-- CreateTable
CREATE TABLE "GuardianExternalCustomer" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianExternalCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsaasWebhookEvent" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,

    CONSTRAINT "AsaasWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Charge_externalPaymentId_key" ON "Charge"("externalPaymentId");

-- CreateIndex
CREATE INDEX "Charge_schoolId_provider_externalStatus_idx" ON "Charge"("schoolId", "provider", "externalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianExternalCustomer_schoolId_guardianId_provider_key" ON "GuardianExternalCustomer"("schoolId", "guardianId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianExternalCustomer_provider_externalCustomerId_key" ON "GuardianExternalCustomer"("provider", "externalCustomerId");

-- CreateIndex
CREATE INDEX "GuardianExternalCustomer_schoolId_provider_idx" ON "GuardianExternalCustomer"("schoolId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AsaasWebhookEvent_externalEventId_key" ON "AsaasWebhookEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "AsaasWebhookEvent_externalPaymentId_idx" ON "AsaasWebhookEvent"("externalPaymentId");

-- CreateIndex
CREATE INDEX "AsaasWebhookEvent_receivedAt_idx" ON "AsaasWebhookEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "GuardianExternalCustomer" ADD CONSTRAINT "GuardianExternalCustomer_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianExternalCustomer" ADD CONSTRAINT "GuardianExternalCustomer_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
