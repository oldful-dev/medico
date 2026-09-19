-- CreateEnum
CREATE TYPE "MedicalTourismStatus" AS ENUM ('NEW', 'PAYMENT_PENDING', 'PAID', 'UNDER_REVIEW', 'CONTACTED', 'DOCUMENTS_REQUESTED', 'CONSULTATION_SCHEDULED', 'CLOSED');

-- CreateTable
CREATE TABLE "medical_tourism_enquiries" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "MedicalTourismStatus" NOT NULL DEFAULT 'NEW',
    "assignedCoordinatorId" TEXT,
    "internalNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_tourism_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_tourism_enquiries_bookingId_key" ON "medical_tourism_enquiries"("bookingId");

-- AddForeignKey
ALTER TABLE "medical_tourism_enquiries" ADD CONSTRAINT "medical_tourism_enquiries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_tourism_enquiries" ADD CONSTRAINT "medical_tourism_enquiries_assignedCoordinatorId_fkey" FOREIGN KEY ("assignedCoordinatorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
