-- Admin-curated selection of Redcliffe blood test package codes to show
-- first in the app's "Featured" tab. Stores only the code + display order —
-- actual test data (price, parameters, description) always comes live from
-- Redcliffe, never snapshotted here, so it can't drift out of sync.

CREATE TABLE "featured_lab_packages" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_lab_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "featured_lab_packages_code_key" ON "featured_lab_packages"("code");
CREATE INDEX "featured_lab_packages_isActive_sortOrder_idx" ON "featured_lab_packages"("isActive", "sortOrder");
