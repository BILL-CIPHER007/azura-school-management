-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BOLETIM', 'HISTORICO_ESCOLAR', 'DECLARACAO_MATRICULA');

-- CreateTable
CREATE TABLE "DocumentPolicy" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "studentCanDownload" BOOLEAN NOT NULL DEFAULT true,
    "guardianCanDownload" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPolicy_schoolId_documentType_key" ON "DocumentPolicy"("schoolId", "documentType");

-- AddForeignKey
ALTER TABLE "DocumentPolicy" ADD CONSTRAINT "DocumentPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
