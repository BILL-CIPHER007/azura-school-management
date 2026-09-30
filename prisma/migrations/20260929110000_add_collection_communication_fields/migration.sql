ALTER TABLE "CollectionAction"
  ADD COLUMN "communicationType" TEXT,
  ADD COLUMN "messageTemplate" TEXT,
  ADD COLUMN "messageBody" TEXT;

CREATE INDEX "CollectionAction_schoolId_communicationType_createdAt_idx"
  ON "CollectionAction"("schoolId", "communicationType", "createdAt");
