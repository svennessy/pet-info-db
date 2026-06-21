-- CreateTable
CREATE TABLE "favorite_pets" (
    "id" SERIAL NOT NULL,
    "profileId" TEXT NOT NULL,
    "petId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_pets_profileId_idx" ON "favorite_pets"("profileId");

-- CreateIndex
CREATE INDEX "favorite_pets_petId_idx" ON "favorite_pets"("petId");

-- CreateIndex
CREATE INDEX "favorite_pets_createdAt_idx" ON "favorite_pets"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_pets_profileId_petId_key" ON "favorite_pets"("profileId", "petId");

-- AddForeignKey
ALTER TABLE "favorite_pets" ADD CONSTRAINT "favorite_pets_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_pets" ADD CONSTRAINT "favorite_pets_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
