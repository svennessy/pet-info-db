-- Add denormalized coords on pets for fast map/API reads (no owner→city join).

ALTER TABLE "pets" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

UPDATE "pets" AS p
SET
  "latitude" = c."latitude",
  "longitude" = c."longitude"
FROM "users" AS u
INNER JOIN "cities" AS c ON c."id" = u."cityId"
WHERE p."ownerId" = u."id";

ALTER TABLE "pets" ALTER COLUMN "latitude" SET NOT NULL;
ALTER TABLE "pets" ALTER COLUMN "longitude" SET NOT NULL;

CREATE INDEX "pets_latitude_longitude_idx" ON "pets"("latitude", "longitude");
