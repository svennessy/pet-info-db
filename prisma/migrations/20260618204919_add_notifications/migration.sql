-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('pet_sighting', 'pet_resolved');

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "petId" INTEGER,
    "sightingId" INTEGER,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_profileId_idx" ON "notifications"("profileId");

-- CreateIndex
CREATE INDEX "notifications_profileId_readAt_idx" ON "notifications"("profileId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_petId_idx" ON "notifications"("petId");

-- CreateIndex
CREATE INDEX "notifications_sightingId_idx" ON "notifications"("sightingId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sightingId_fkey" FOREIGN KEY ("sightingId") REFERENCES "pet_sightings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
