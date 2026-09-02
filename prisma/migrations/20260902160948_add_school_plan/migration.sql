-- CreateEnum
CREATE TYPE "SchoolPlan" AS ENUM ('ESSENCIAL', 'PROFISSIONAL');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "plan" "SchoolPlan" NOT NULL DEFAULT 'ESSENCIAL';
