// creates fake lost/found pet records
// flow is:
// existing users + dog breed table + cat breed table
// generatePets() 
// delete old pets
// insert new pets
// print summary stats

// decides every pet's name/species/location and how many should exist
import { generatePets, PET_COUNT } from "../src/data/petGenerator.js";
// breed selection helpers for logging and assignable breed limits
import {
  getTopCatBreedsForPets,
  TOP_CAT_BREED_LIMIT,
} from "../src/data/topCatBreeds.js";
import {
  getTopDogBreedsForPets,
  TOP_DOG_BREED_LIMIT,
} from "../src/data/topDogBreeds.js";
import { prisma } from "./db.js";

// insert in chunks of 500
const BATCH = 500;
// seed for random number generation
const SEED = 43;

async function main() {
  const [userCount, dogBreeds, catBreeds] = await Promise.all([
    // how many users exist?
    // what dog breeds exist?
    // what cat breeds exist?
    prisma.user.count(),
    prisma.dogBreed.findMany({
      select: { slug: true, name: true, weight: true },
      orderBy: { slug: "asc" },
    }),
    prisma.catBreed.findMany({
      select: { slug: true, name: true, weight: true },
      orderBy: { slug: "asc" },
    }),
  ]);

  // check if we have enough users
  if (userCount < PET_COUNT) {
    throw new Error(
      `Need at least ${PET_COUNT} users (have ${userCount}). Run npm run db:seed:users first.`,
    );
  }
  // check if we have enough breeds
  if (dogBreeds.length === 0 || catBreeds.length === 0) {
    throw new Error("Breed tables are empty. Run npm run db:seed first.");
  }

  // grabs first PET_COUNT users from db and their coordinates
  // every fake pet placed near owner's city
  const ownerRows = await prisma.user.findMany({
    select: {
      id: true,
      city: { select: { latitude: true, longitude: true } },
    },
    orderBy: { id: "asc" },
    take: PET_COUNT,
  });

  const ownerIds = ownerRows.map((u) => u.id);
  // ie: [{ ownerId: 1, latitude: 40.7128, longitude: -74.0060 }
  // generator uses this to create pet coordinates near owner's city
  const ownerCoords = ownerRows.map((u) => ({
    ownerId: u.id,
    latitude: u.city.latitude,
    longitude: u.city.longitude,
  }));

  // used for logging and assignable breed limits
  // ie: generating 20000 pets... dogs: top X, cats: top Y
  const petDogBreeds = getTopDogBreedsForPets();
  const petCatBreeds = getTopCatBreedsForPets();
  console.log(
    `Generating ${PET_COUNT} pets (60% dog, 37% cat, 3% other) — dogs: top ${TOP_DOG_BREED_LIMIT} (${petDogBreeds.length} assignable), cats: top ${TOP_CAT_BREED_LIMIT} (${petCatBreeds.length} assignable); ${catBreeds.length} cat breeds in DB…`,
  );
  // generates PET_COUNT pets
  // every pet has a name/species/location and is assigned a breed
  // ie: { name: "Buddy", species: "dog", latitude: 40.7128, longitude: -74.0060, breedLabel: "Golden Retriever", dogBreedSlug: "golden-retriever" }
  // actual logic lives in src/data/petGenerator.ts
  const generated = generatePets(ownerIds, ownerCoords, dogBreeds, catBreeds, SEED);

  console.log("Clearing existing pets…");
  // deletes all existing pets
  await prisma.pet.deleteMany();

  console.log("Inserting pets…");
  // divides reseed into smaller batches for faster insertion
  for (let i = 0; i < generated.length; i += BATCH) {
    const batch = generated.slice(i, i + BATCH);
    await prisma.pet.createMany({ data: batch });
    console.log(
      `  pets ${Math.min(i + BATCH, generated.length)} / ${generated.length}`,
    );
  }

  const [total, bySpecies, byReportStatus, topDogBreeds, topCatBreeds] =
    await Promise.all([
    // how many pets in db?
    prisma.pet.count(),
    // group by species and count how many of each
    prisma.pet.groupBy({
      by: ["species"],
      _count: { _all: true },
      orderBy: { species: "asc" },
    }),
    prisma.pet.groupBy({
      by: ["reportStatus"],
      _count: { _all: true },
      orderBy: { reportStatus: "asc" },
    }),
    // shows top generated breeds
    prisma.pet.groupBy({
      by: ["dogBreedSlug"],
      where: { species: "dog" },
      _count: { _all: true },
      orderBy: { _count: { dogBreedSlug: "desc" } },
      take: 5,
    }),
    prisma.pet.groupBy({
      by: ["catBreedSlug"],
      where: { species: "cat" },
      _count: { _all: true },
      orderBy: { _count: { catBreedSlug: "desc" } },
      take: 5,
    }),
  ]);

  console.log(`Done. ${total} pets in database.`);
  console.log("By species:", bySpecies);
  console.log("By report status:", byReportStatus);
  console.log("Top dog breeds:", topDogBreeds);
  console.log("Top cat breeds:", topCatBreeds);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  // after script finishes, disconnect from db
  .finally(() => prisma.$disconnect());
