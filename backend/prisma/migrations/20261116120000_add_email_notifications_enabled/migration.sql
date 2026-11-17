-- "Email Notifications" (transactional emails) and "Promotional Offers" were both
-- stored in emailMarketingEnabled, so the two app toggles moved together.
-- emailMarketingEnabled now means promotional offers only; this column holds the
-- independent Email Notifications preference. Default true keeps existing users'
-- transactional emails flowing exactly as before.
ALTER TABLE "users" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
