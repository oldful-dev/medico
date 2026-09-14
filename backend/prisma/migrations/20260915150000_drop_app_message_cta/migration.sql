-- AlterTable
-- Spec 6.3 mandates exactly OK/Dismiss or Agree/Dismiss buttons — no room
-- for a third CTA-navigation button, so this dropped-early field is removed
-- before it ever had any real rows.
ALTER TABLE "app_messages" DROP COLUMN "ctaText";
ALTER TABLE "app_messages" DROP COLUMN "ctaRoute";
