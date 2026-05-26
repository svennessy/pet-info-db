import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DogBreed as DogBreedData } from "../src/data/dogBreedTypes.js";
import type { CatBreed as CatBreedData } from "../src/data/catBreedTypes.js";
import type { UsCity } from "../src/data/cityTypes.js";
import { DOG_BREEDS } from "../src/data/dogBreeds.js";
import { CAT_BREEDS } from "../src/data/catBreeds.js";
import { prisma } from "./db.js";
import type {
  BreedCommonality,
  BreedGroup,
  CatBreedGroup,
} from "../generated/prisma/client.js";

const BATCH = 50;
const __dirname = dirname(fileURLToPath(import.meta.url));

const US_CITIES = JSON.parse(
  readFileSync(join(__dirname, "../src/data/usCities.json"), "utf8"),
) as UsCity[];

function toDogRow(breed: DogBreedData) {
  return {
    slug: breed.id,
    name: breed.name,
    commonality: breed.commonality as BreedCommonality,
    weight: breed.weight,
    group: breed.group ? (breed.group as BreedGroup) : null,
  };
}

function toCatRow(breed: CatBreedData) {
  return {
    slug: breed.id,
    name: breed.name,
    commonality: breed.commonality as BreedCommonality,
    weight: breed.weight,
    group: breed.group ? (breed.group as CatBreedGroup) : null,
  };
}

async function main() {
  console.log(`Seeding ${DOG_BREEDS.length} dog breeds…`);
  for (let i = 0; i < DOG_BREEDS.length; i += BATCH) {
    const batch = DOG_BREEDS.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((breed) => {
        const row = toDogRow(breed);
        return prisma.dogBreed.upsert({
          where: { slug: row.slug },
          create: row,
          update: row,
        });
      }),
    );
    console.log(`  dogs ${Math.min(i + BATCH, DOG_BREEDS.length)} / ${DOG_BREEDS.length}`);
  }

  console.log(`Seeding ${CAT_BREEDS.length} cat breeds…`);
  for (let i = 0; i < CAT_BREEDS.length; i += BATCH) {
    const batch = CAT_BREEDS.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((breed) => {
        const row = toCatRow(breed);
        return prisma.catBreed.upsert({
          where: { slug: row.slug },
          create: row,
          update: row,
        });
      }),
    );
    console.log(`  cats ${Math.min(i + BATCH, CAT_BREEDS.length)} / ${CAT_BREEDS.length}`);
  }

  console.log(`Seeding ${US_CITIES.length} cities…`);
  for (let i = 0; i < US_CITIES.length; i += BATCH) {
    const batch = US_CITIES.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((city) =>
        prisma.city.upsert({
          where: { id: city.id },
          create: city,
          update: city,
        }),
      ),
    );
    console.log(`  cities ${Math.min(i + BATCH, US_CITIES.length)} / ${US_CITIES.length}`);
  }

  const [dogs, cats, cities] = await Promise.all([
    prisma.dogBreed.count(),
    prisma.catBreed.count(),
    prisma.city.count(),
  ]);
  console.log(`Done. ${dogs} dogs, ${cats} cats, ${cities} cities in database.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
