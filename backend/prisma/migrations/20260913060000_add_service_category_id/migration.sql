-- Lets an admin place a Service into a specific ServiceCategory (e.g. put
-- "Blood Sugar Test" under the "Health Checkups" category), not just tag it
-- with a whole-module string like "DIAGNOSTICS_FITNESS". No FK constraint,
-- same loose-coupling pattern already used elsewhere in this schema (e.g.
-- ServiceCharge.serviceCategory) — a plain nullable reference column, kept
-- consistent by the admin API rather than enforced at the DB level.

ALTER TABLE "services" ADD COLUMN "categoryId" TEXT;

CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");
