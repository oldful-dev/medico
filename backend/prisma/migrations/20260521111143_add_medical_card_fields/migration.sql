-- Add new fields to medical_cards table
ALTER TABLE "medical_cards" ADD COLUMN "primaryDoctor" TEXT,
ADD COLUMN "insuranceInfo" TEXT;
