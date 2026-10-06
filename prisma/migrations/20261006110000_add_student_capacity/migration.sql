-- Separate functional plan from contracted student capacity.
CREATE TYPE "StudentCapacity" AS ENUM ('UP_TO_200', 'UP_TO_300', 'UP_TO_500', 'CUSTOM');

ALTER TABLE "School"
  ADD COLUMN "studentCapacity" "StudentCapacity" NOT NULL DEFAULT 'UP_TO_200';

UPDATE "School"
SET "studentCapacity" = CASE
  WHEN "plan" = 'PROFISSIONAL' THEN 'UP_TO_500'::"StudentCapacity"
  ELSE 'UP_TO_200'::"StudentCapacity"
END;
