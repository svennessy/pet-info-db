-- CreateTable
CREATE TABLE "pet_sightings" (
    "id" SERIAL NOT NULL,
    "petId" INTEGER NOT NULL,
    "reporterEmail" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "locationLabel" TEXT,
    "notes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_sightings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pet_sightings_petId_idx" ON "pet_sightings"("petId");

-- CreateIndex
CREATE INDEX "pet_sightings_createdAt_idx" ON "pet_sightings"("createdAt");

-- CreateIndex
CREATE INDEX "pet_sightings_latitude_longitude_idx" ON "pet_sightings"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "pet_sightings" ADD CONSTRAINT "pet_sightings_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
