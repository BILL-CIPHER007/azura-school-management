-- Institutional audit context.
CREATE TYPE "AuditSource" AS ENUM ('ADMIN', 'PROFESSOR', 'ALUNO', 'RESPONSAVEL', 'SYSTEM', 'CRON', 'WEBHOOK', 'PROVIDER');

ALTER TABLE "AuditLog"
  ADD COLUMN "actorRole" "UserRole",
  ADD COLUMN "source" "AuditSource" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "before" JSONB,
  ADD COLUMN "after" JSONB,
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "AuditLog_schoolId_action_createdAt_idx" ON "AuditLog"("schoolId", "action", "createdAt");
CREATE INDEX "AuditLog_schoolId_entity_createdAt_idx" ON "AuditLog"("schoolId", "entity", "createdAt");
CREATE INDEX "AuditLog_schoolId_source_createdAt_idx" ON "AuditLog"("schoolId", "source", "createdAt");
