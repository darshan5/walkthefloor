-- AlterTable
ALTER TABLE "EquipmentType" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checkTypes" JSONB NOT NULL DEFAULT '[]',
    "complianceRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategory_name_key" ON "EquipmentCategory"("name");

-- CreateIndex
CREATE INDEX "EquipmentType_categoryId_idx" ON "EquipmentType"("categoryId");

-- AddForeignKey
ALTER TABLE "EquipmentType" ADD CONSTRAINT "EquipmentType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
