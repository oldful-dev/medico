-- AlterTable
-- 'CASH' (COD) or 'PREPAID' — recorded at checkout since a ProductOrder has
-- no guaranteed Payment row (COD orders never create one), and fulfillment
-- needs to know which payment_method to send Delhivery.
ALTER TABLE "product_orders" ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'PREPAID';
