-- AlterTable
ALTER TABLE "app_messages" ADD COLUMN "requiresAgreement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "app_messages" ADD COLUMN "version" VARCHAR(20) NOT NULL DEFAULT '1';

-- CreateTable
CREATE TABLE "app_message_dismissals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "app_message_id" TEXT NOT NULL,
    "message_version" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DISMISSED_ONCE',
    "first_dismissed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_message_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_message_dismissals_user_id_app_message_id_message_ver_key" ON "app_message_dismissals"("user_id", "app_message_id", "message_version");

-- AddForeignKey
ALTER TABLE "app_message_dismissals" ADD CONSTRAINT "app_message_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_message_dismissals" ADD CONSTRAINT "app_message_dismissals_app_message_id_fkey" FOREIGN KEY ("app_message_id") REFERENCES "app_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
