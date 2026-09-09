-- Reward coupons (referral welcome / referrer bonus) must be redeemable only by
-- their intended user — otherwise a leaked code lets anyone claim someone else's
-- reward. validateCoupon enforces this.

ALTER TABLE "coupons" ADD COLUMN "reservedForUserId" TEXT;
CREATE INDEX "coupons_reservedForUserId_idx" ON "coupons"("reservedForUserId");
