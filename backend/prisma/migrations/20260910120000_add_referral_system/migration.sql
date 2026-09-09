-- Referral system: per-user code + referral ledger.
-- Rewards are issued as single-use coupons (reuses the coupon engine), so no
-- wallet table is needed. Config lives in a UIConfig row (seeded on first read).

CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'VOID');

ALTER TABLE "users"
  ADD COLUMN "referralCode" TEXT,
  ADD COLUMN "referredById" TEXT;

-- Backfill a code for every existing user: AYX + 6 chars of the uuid (hex),
-- uppercased. Collisions are astronomically unlikely at this scale; the UNIQUE
-- index below would surface any, and the app regenerates on conflict anyway.
UPDATE "users"
SET "referralCode" = 'AYX' || UPPER(SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 6))
WHERE "referralCode" IS NULL;

CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

ALTER TABLE "users"
  ADD CONSTRAINT "users_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "referrals" (
    "id"               TEXT NOT NULL,
    "referrerId"       TEXT NOT NULL,
    "refereeId"        TEXT NOT NULL,
    "status"           "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "codeUsed"         TEXT NOT NULL,
    "refereePaymentId" TEXT,
    "referrerCouponId" TEXT,
    "refereeCouponId"  TEXT,
    "rewardValue"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voidReason"       TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt"      TIMESTAMP(3),
    "rewardedAt"       TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_refereeId_key" ON "referrals"("refereeId");
CREATE INDEX "referrals_referrerId_status_idx" ON "referrals"("referrerId", "status");

ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_refereeId_fkey"
  FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
