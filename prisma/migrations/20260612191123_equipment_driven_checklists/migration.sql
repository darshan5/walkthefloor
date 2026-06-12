-- DropForeignKey
ALTER TABLE "TaskCompletion" DROP CONSTRAINT "TaskCompletion_taskId_fkey";

-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "categoryFilters" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "TaskCompletion" ADD COLUMN     "instanceTaskId" TEXT,
ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "InstanceTask" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "locationEquipmentId" TEXT,
    "sourceTaskId" TEXT,
    "title" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstanceTask_instanceId_idx" ON "InstanceTask"("instanceId");

-- CreateIndex
CREATE INDEX "TaskCompletion_instanceTaskId_idx" ON "TaskCompletion"("instanceTaskId");

-- AddForeignKey
ALTER TABLE "InstanceTask" ADD CONSTRAINT "InstanceTask_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChecklistInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceTask" ADD CONSTRAINT "InstanceTask_locationEquipmentId_fkey" FOREIGN KEY ("locationEquipmentId") REFERENCES "LocationEquipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceTask" ADD CONSTRAINT "InstanceTask_sourceTaskId_fkey" FOREIGN KEY ("sourceTaskId") REFERENCES "ChecklistTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ChecklistTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_instanceTaskId_fkey" FOREIGN KEY ("instanceTaskId") REFERENCES "InstanceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
