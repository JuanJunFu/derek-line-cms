-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "webhookEventId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "category" TEXT,
    "region" TEXT,
    "storeId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "tags" TEXT[],
    "leadScore" TEXT NOT NULL DEFAULT 'COLD',
    "hotSince" TIMESTAMP(3),
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEvent_webhookEventId_key" ON "UserEvent"("webhookEventId");

-- CreateIndex
CREATE INDEX "UserEvent_userId_idx" ON "UserEvent"("userId");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_idx" ON "UserEvent"("eventType");

-- CreateIndex
CREATE INDEX "UserEvent_createdAt_idx" ON "UserEvent"("createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_category_idx" ON "UserEvent"("category");

-- CreateIndex
CREATE INDEX "UserEvent_region_idx" ON "UserEvent"("region");

-- CreateIndex
CREATE INDEX "UserEvent_storeId_idx" ON "UserEvent"("storeId");

-- CreateIndex
CREATE INDEX "UserProfile_leadScore_idx" ON "UserProfile"("leadScore");

-- CreateIndex
CREATE INDEX "UserProfile_lastActive_idx" ON "UserProfile"("lastActive");

-- CreateIndex
CREATE INDEX "UserProfile_isBlocked_idx" ON "UserProfile"("isBlocked");
