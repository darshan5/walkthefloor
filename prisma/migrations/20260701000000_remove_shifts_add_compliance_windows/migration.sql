-- DropTable
DROP TABLE IF EXISTS "Shift";

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN "complianceEarlyMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "SystemSettings" ADD COLUMN "complianceLateMinutes" INTEGER NOT NULL DEFAULT 60;
