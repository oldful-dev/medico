-- CreateTable
CREATE TABLE "status_transition_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT,
    "forced" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_transition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_transition_logs_entityType_entityId_createdAt_idx" ON "status_transition_logs"("entityType", "entityId", "createdAt");
