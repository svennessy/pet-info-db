-- DropIndex
DROP INDEX "pets_ownerId_key";

-- CreateIndex
CREATE INDEX "pets_ownerId_idx" ON "pets"("ownerId");
