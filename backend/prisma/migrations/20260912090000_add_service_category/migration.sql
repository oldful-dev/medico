-- Generic, reusable category model shared by multiple admin modules
-- (Home Essentials, Diagnostic & Fitness, Tours & Travel, ...). Not the
-- Store's existing `categories` table (that one FKs to `products` and is
-- scoped to the Wellness Store only) — this table has no FK to services;
-- Service.category is already a free string column. Unique per (module,
-- slug), not globally, since different modules may reuse the same slug.

CREATE TABLE "service_categories" (
    "id"        TEXT NOT NULL,
    "module"    TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "imageUrl"  TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_categories_module_slug_key" ON "service_categories"("module", "slug");
CREATE INDEX "service_categories_module_sortOrder_idx" ON "service_categories"("module", "sortOrder");
