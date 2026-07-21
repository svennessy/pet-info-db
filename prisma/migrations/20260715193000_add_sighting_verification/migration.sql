-- AlterTable
CREATE TYPE "SightingVerificationStatus" AS ENUM ('unverified', 'verified');

-- AlterTable
ALTER TABLE "pet_sightings"
ADD COLUMN "verificationStatus" "SightingVerificationStatus" NOT NULL DEFAULT 'unverified',
ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "pet_sightings_verificationStatus_idx" ON "pet_sightings"("verificationStatus");
