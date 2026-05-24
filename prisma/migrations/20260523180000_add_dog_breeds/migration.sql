-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BreedCommonality" AS ENUM ('very_common', 'common', 'uncommon', 'rare', 'very_rare');

-- CreateEnum
CREATE TYPE "BreedGroup" AS ENUM ('sporting', 'hound', 'working', 'terrier', 'toy', 'non_sporting', 'herding', 'misc', 'foundation');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
