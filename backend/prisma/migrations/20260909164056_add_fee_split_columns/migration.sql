-- Separate Service Fee vs Ayuxa Booking Fee (+ Delivery Fee, Tax)
-- Persist the customer-facing 4-part split on every paid record so invoices
-- and reports show identical, non-mixed numbers. See src/utils/feeBreakdown.js.

-- ── bookings ──────────────────────────────────────────────────────────────
ALTER TABLE "bookings"
  ADD COLUMN "service_fee"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ayuxa_booking_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_fee"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "fee_breakdown"     JSONB;

-- ── lab_orders ────────────────────────────────────────────────────────────
ALTER TABLE "lab_orders"
  ADD COLUMN "service_fee"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ayuxa_booking_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_fee"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount"        DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ── product_orders ────────────────────────────────────────────────────────
ALTER TABLE "product_orders"
  ADD COLUMN "service_fee"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ayuxa_booking_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_fee"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount"        DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ── invoices ──────────────────────────────────────────────────────────────
ALTER TABLE "invoices"
  ADD COLUMN "service_fee"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "ayuxa_booking_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_fee"      DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ── Backfill product_orders from existing clean columns ───────────────────
UPDATE "product_orders"
   SET "service_fee"  = COALESCE("subtotal", 0),
       "delivery_fee"  = COALESCE("shippingCharge", 0),
       "tax_amount"    = COALESCE("tax", 0)
 WHERE "service_fee" = 0 AND ("subtotal" > 0 OR "shippingCharge" > 0);

-- ── Backfill bookings: assume historic flat ₹349 Ayuxa fee (₹299 + ₹50) ───
-- Legacy rows only. New rows get the real split from the checkout calc.
UPDATE "bookings"
   SET "ayuxa_booking_fee" = LEAST(349, GREATEST(0, COALESCE("amount", 0))),
       "service_fee"        = GREATEST(0, COALESCE("amount", 0) - LEAST(349, GREATEST(0, COALESCE("amount", 0))))
 WHERE "service_fee" = 0 AND "amount" > 0;
