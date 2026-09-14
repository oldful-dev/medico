-- CreateTable
CREATE TABLE "app_messages" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'ANNOUNCEMENT',
    "ctaText" VARCHAR(30),
    "ctaRoute" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_messages_isActive_idx" ON "app_messages"("isActive");
