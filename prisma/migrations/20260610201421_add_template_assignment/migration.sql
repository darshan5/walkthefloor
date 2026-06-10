-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "assignmentType" TEXT NOT NULL DEFAULT 'book';

-- CreateTable
CREATE TABLE "TemplateLocationAssignment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateLocationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateLocationAssignment_locationId_idx" ON "TemplateLocationAssignment"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateLocationAssignment_templateId_locationId_key" ON "TemplateLocationAssignment"("templateId", "locationId");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_assignmentType_idx" ON "ChecklistTemplate"("assignmentType");

-- AddForeignKey
ALTER TABLE "TemplateLocationAssignment" ADD CONSTRAINT "TemplateLocationAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateLocationAssignment" ADD CONSTRAINT "TemplateLocationAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
