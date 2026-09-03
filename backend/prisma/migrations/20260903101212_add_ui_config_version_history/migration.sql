-- CreateTable
CREATE TABLE "ui_config_versions" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ui_config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ui_config_versions_configKey_createdAt_idx" ON "ui_config_versions"("configKey", "createdAt");
