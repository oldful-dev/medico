-- Stable GCS object path for the invoice PDF, so pdfUrl (a signed URL that
-- expires after 7 days) can be re-signed later via getSignedInvoiceUrl()
-- instead of going stale with no way to recover it (the uploaded filename
-- is a random UUID, not derivable from invoiceNumber).
ALTER TABLE "invoices" ADD COLUMN "pdf_storage_path" TEXT;
