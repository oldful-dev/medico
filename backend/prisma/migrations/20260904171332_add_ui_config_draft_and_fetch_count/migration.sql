-- AlterTable
ALTER TABLE "ui_configs" ADD COLUMN "draftJson" JSONB,
ADD COLUMN "fetchCount" INTEGER NOT NULL DEFAULT 0;
