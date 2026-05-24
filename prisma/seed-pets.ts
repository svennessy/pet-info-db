import { generatePets, PET_COUNT } from "../src/data/petGenerator.js";
import {
  getTopCatBreedsForPets,
  TOP_CAT_BREED_LIMIT,
} from "../src/data/topCatBreeds.js";
import {
  getTopDogBreedsForPets,
  TOP_DOG_BREED_LIMIT,
} from "../src/data/topDogBreeds.js";
import { prisma } from "./db.js";

const BATCH = 500;
const SEED = 43;

async function main() {
  const [userCount, dogBreeds, catBreeds] = await Promise.all([
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

  if (userCount < PET_COUNT) {
    throw new Error(
      `Need at least ${PET_COUNT} users (have ${userCount}). Run npm run db:seed:users first.`,
    );
  }
  if (dogBreeds.length === 0 || catBreeds.length === 0) {
    throw new Error("Breed tables are empty. Run npm run db:seed first.");
  }

  const ownerRows = await prisma.user.findMany({
    select: {
      id: true,
      city: { select: { latitude: true, longitude: true } },
    },
    orderBy: { id: "asc" },
    take: PET_COUNT,
  });

  const ownerIds = ownerRows.map((u) => u.id);
  const ownerCoords = ownerRows.map((u) => ({
    ownerId: u.id,
    latitude: u.city.latitude,
    longitude: u.city.longitude,
  }));

  const petDogBreeds = getTopDogBreedsForPets();
  const petCatBreeds = getTopCatBreedsForPets();
  console.log(
    `Generating ${PET_COUNT} pets (60% dog, 37% cat, 3% other) — dogs: top ${TOP_DOG_BREED_LIMIT} (${petDogBreeds.length} assignable), cats: top ${TOP_CAT_BREED_LIMIT} (${petCatBreeds.length} assignable); ${catBreeds.length} cat breeds in DB…`,
  );
  const generated = generatePets(ownerIds, ownerCoords, dogBreeds, catBreeds, SEED);

  console.log("Clearing existing pets…");
  await prisma.pet.deleteMany();

  console.log("Inserting pets…");
  for (let i = 0; i < generated.length; i += BATCH) {
    const batch = generated.slice(i, i + BATCH);
    await prisma.pet.createMany({ data: batch });
    console.log(
      `  pets ${Math.min(i + BATCH, generated.length)} / ${generated.length}`,
    );
  }

  const [total, bySpecies, byReportStatus, topDogBreeds, topCatBreeds] =
    await Promise.all([
    prisma.pet.count(),
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
  .finally(() => prisma.$disconnect());
