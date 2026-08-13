-- AlterTable
ALTER TABLE "service_charges" ADD COLUMN     "base_price" DOUBLE PRECISION,
ADD COLUMN     "pricing_text" TEXT,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'SERVICE',
ADD COLUMN     "service_id" TEXT;
