-- AlterTable
ALTER TABLE "product_orders" ADD COLUMN "fulfillmentError" TEXT,
ADD COLUMN "fulfillmentFailedAt" TIMESTAMP(3);
