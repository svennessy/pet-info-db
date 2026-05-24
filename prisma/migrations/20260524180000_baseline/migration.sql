-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('dog', 'cat', 'other');

-- CreateEnum
CREATE TYPE "PetReportStatus" AS ENUM ('lost', 'found');

-- CreateEnum
CREATE TYPE "BreedCommonality" AS ENUM ('very_common', 'common', 'uncommon', 'rare', 'very_rare');

-- CreateEnum
CREATE TYPE "BreedGroup" AS ENUM ('sporting', 'hound', 'working', 'terrier', 'toy', 'non_sporting', 'herding', 'misc', 'foundation');

-- CreateEnum
CREATE TYPE "CatBreedGroup" AS ENUM ('domestic', 'shorthair', 'longhair', 'semi_longhair', 'oriental', 'natural', 'rex', 'hairless', 'hybrid', 'misc');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "reportStatus" "PetReportStatus" NOT NULL DEFAULT 'lost',
    "breedLabel" TEXT NOT NULL,
    "dogBreedSlug" TEXT,
    "catBreedSlug" TEXT,
    "otherKind" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dog_breeds" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commonality" "BreedCommonality" NOT NULL,
    "weight" INTEGER NOT NULL,
    "group" "BreedGroup",

    CONSTRAINT "dog_breeds_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "pet_photos" (
    "id" SERIAL NOT NULL,
    "petId" INTEGER NOT NULL,
    "imagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "stanfordInstanceKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_breeds" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commonality" "BreedCommonality" NOT NULL,
    "weight" INTEGER NOT NULL,
    "group" "CatBreedGroup",

    CONSTRAINT "cat_breeds_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rankInState" INTEGER NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_cityId_idx" ON "users"("cityId");

-- CreateIndex
CREATE INDEX "users_lastName_idx" ON "users"("lastName");

-- CreateIndex
CREATE UNIQUE INDEX "pets_ownerId_key" ON "pets"("ownerId");

-- CreateIndex
CREATE INDEX "pets_species_idx" ON "pets"("species");

-- CreateIndex
CREATE INDEX "pets_reportStatus_idx" ON "pets"("reportStatus");

-- CreateIndex
CREATE INDEX "pets_breedLabel_idx" ON "pets"("breedLabel");

-- CreateIndex
CREATE INDEX "pets_dogBreedSlug_idx" ON "pets"("dogBreedSlug");

-- CreateIndex
CREATE INDEX "pets_catBreedSlug_idx" ON "pets"("catBreedSlug");

-- CreateIndex
CREATE INDEX "pets_otherKind_idx" ON "pets"("otherKind");

-- CreateIndex
CREATE INDEX "pets_createdAt_idx" ON "pets"("createdAt");

-- CreateIndex
CREATE INDEX "pets_species_reportStatus_idx" ON "pets"("species", "reportStatus");

-- CreateIndex
CREATE INDEX "pets_species_dogBreedSlug_idx" ON "pets"("species", "dogBreedSlug");

-- CreateIndex
CREATE INDEX "pets_species_catBreedSlug_idx" ON "pets"("species", "catBreedSlug");

-- CreateIndex
CREATE INDEX "pets_species_otherKind_idx" ON "pets"("species", "otherKind");

-- CreateIndex
CREATE INDEX "dog_breeds_commonality_idx" ON "dog_breeds"("commonality");

-- CreateIndex
CREATE INDEX "dog_breeds_weight_idx" ON "dog_breeds"("weight");

-- CreateIndex
CREATE INDEX "dog_breeds_name_idx" ON "dog_breeds"("name");

-- CreateIndex
CREATE INDEX "pet_photos_petId_idx" ON "pet_photos"("petId");

-- CreateIndex
CREATE INDEX "pet_photos_petId_sortOrder_idx" ON "pet_photos"("petId", "sortOrder");

-- CreateIndex
CREATE INDEX "pet_photos_stanfordInstanceKey_idx" ON "pet_photos"("stanfordInstanceKey");

-- CreateIndex
CREATE INDEX "pet_photos_createdAt_idx" ON "pet_photos"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pet_photos_petId_imagePath_key" ON "pet_photos"("petId", "imagePath");

-- CreateIndex
CREATE INDEX "cat_breeds_commonality_idx" ON "cat_breeds"("commonality");

-- CreateIndex
CREATE INDEX "cat_breeds_weight_idx" ON "cat_breeds"("weight");

-- CreateIndex
CREATE INDEX "cat_breeds_name_idx" ON "cat_breeds"("name");

-- CreateIndex
CREATE INDEX "cities_stateCode_idx" ON "cities"("stateCode");

-- CreateIndex
CREATE INDEX "cities_population_idx" ON "cities"("population");

-- CreateIndex
CREATE INDEX "cities_name_idx" ON "cities"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_dogBreedSlug_fkey" FOREIGN KEY ("dogBreedSlug") REFERENCES "dog_breeds"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_catBreedSlug_fkey" FOREIGN KEY ("catBreedSlug") REFERENCES "cat_breeds"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
