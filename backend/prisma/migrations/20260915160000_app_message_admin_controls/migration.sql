-- AlterTable
ALTER TABLE "app_messages" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "app_messages" ADD COLUMN "target_city_id" TEXT;
ALTER TABLE "app_messages" ADD COLUMN "starts_at" TIMESTAMP(3);
ALTER TABLE "app_messages" ADD COLUMN "ends_at" TIMESTAMP(3);

-- AlterTable: default status is now VIEWED (a message is recorded the
-- moment it's fetched, before any button press) — 0 existing rows, safe.
ALTER TABLE "app_message_dismissals" ALTER COLUMN "status" SET DEFAULT 'VIEWED';

-- AddForeignKey
ALTER TABLE "app_messages" ADD CONSTRAINT "app_messages_target_city_id_fkey" FOREIGN KEY ("target_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
