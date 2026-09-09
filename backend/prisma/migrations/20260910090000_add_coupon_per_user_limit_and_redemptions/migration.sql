-- Dynamic promotions/coupons: per-user usage limit + a redemption ledger.
-- Redemptions are the source of truth for usage — written only on a successful
-- payment, so an abandoned/failed payment can no longer burn a coupon.

ALTER TABLE "coupons" ADD COLUMN "perUserLimit" INTEGER;

CREATE TABLE "coupon_redemptions" (
    "id"        TEXT NOT NULL,
    "couponId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "discount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_redemptions_paymentId_key" ON "coupon_redemptions"("paymentId");
CREATE INDEX "coupon_redemptions_couponId_userId_idx" ON "coupon_redemptions"("couponId", "userId");

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_redemptions"
  ADD CONSTRAINT "coupon_redemptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
