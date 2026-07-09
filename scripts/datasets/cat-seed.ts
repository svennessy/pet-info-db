/**
 * Layer 3 — Seed: assign processed cat photos to pets in the database.
 */

// takes: cat pets already in db
// processed cat photo dataset
// creates petPhoto records 

import { readFileSync } from "node:fs";
import {
  CANDID_CAT_BREED_PROXIES,
  CANDID_CAT_FALLBACK_SLUG,
  DOMESTIC_CAT_SLUGS,
} from "../../src/data/candidCatBreedProxies.js";
import {
  legacyIndexToSeedInstances,
  type CatLegacyIndex,
} from "../../src/data/datasets/cat.js";
import { CAT_LEGACY_INDEX_PATH } from "../../src/data/datasets/paths.js";
import { buildShuffledCountQueue } from "../../src/data/allocateBreedPhotos.js";
import { createRng } from "../../src/data/userGenerator.js";
import { PET_PHOTO_COUNT_WEIGHTS } from "../../src/data/stanfordDogInstances.js";
import { prisma } from "../../prisma/db.js";

const SEED = 45;

type PhotoInstance = {
  instanceKey: string;
  breedSlug: string;
  images: Array<{ filename: string; path: string }>;
};

type CarouselSlide = {
  imagePath: string;
  instanceKey: string;
};

// used to pick how many photos to assign to each pet
const PHOTO_COUNT_OPTIONS = PET_PHOTO_COUNT_WEIGHTS.map((row) => ({
  value: row.count,
  weight: row.weight,
}));

function pickPhotoCount(countQueue: number[], index: number): number {
  return countQueue[index] ?? 1;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Allowed photo pools for this pet breed (exact slug, proxies, domestic fallback only). */
function resolveBreedPool(
  petBreedSlug: string,
  instancesByBreed: Map<string, PhotoInstance[]>,
): PhotoInstance[] {
  const trySlugs = [
    petBreedSlug,
    ...(CANDID_CAT_BREED_PROXIES[petBreedSlug] ?? []),
  ];
  // meaning if not enough longhair photos, use domestic-medium photos as fallback instead of bengal
  if (DOMESTIC_CAT_SLUGS.has(petBreedSlug)) {
    trySlugs.push(CANDID_CAT_FALLBACK_SLUG);
  }

  const pool: PhotoInstance[] = [];
  const seen = new Set<string>();
  for (const slug of trySlugs) {
    for (const inst of instancesByBreed.get(slug) ?? []) {
      if (inst.images.length === 0 || seen.has(inst.instanceKey)) continue;
      seen.add(inst.instanceKey);
      pool.push(inst);
    }
  }
  return pool;
}

/**
 * Build a carousel from instances that match the pet's breed type only.
 * May use multiple instances of the same breed when one batch has fewer than `want` photos.
 */
// input: breed pool, desired photo count, used instance tracker
// output: carousel slides
function collectBreedMatchedCarousel(
  pool: PhotoInstance[],
  want: number,
  usedInstances: Set<string>,
  rng: () => number,
): CarouselSlide[] {
  if (pool.length === 0 || want <= 0) return [];

  const withImages = pool.filter((i) => i.images.length > 0);
  const fresh = withImages.filter((i) => !usedInstances.has(i.instanceKey));
  const pickFrom = fresh.length > 0 ? fresh : withImages;

  const slides: CarouselSlide[] = [];
  for (const inst of shuffle(pickFrom, rng)) {
    if (slides.length >= want) break;
    for (const img of shuffle(inst.images, rng)) {
      if (slides.length >= want) break;
      slides.push({ imagePath: img.path, instanceKey: inst.instanceKey });
    }
    usedInstances.add(inst.instanceKey);
  }

  return slides;
}

export async function seedCatPetPhotos() {
  let index: CatLegacyIndex;
  try {
    index = JSON.parse(readFileSync(CAT_LEGACY_INDEX_PATH, "utf8")) as CatLegacyIndex;
  } catch {
    throw new Error(
      `Missing legacy cat index. Run: npm run dataset:cat:process`,
    );
  }

  const instances = legacyIndexToSeedInstances(index);
  if (instances.length === 0) {
    throw new Error("Cat index has no instances.");
  }

  const instancesByBreed = new Map<string, PhotoInstance[]>();

  for (const inst of instances) {
    const row: PhotoInstance = {
      instanceKey: inst.instanceKey,
      breedSlug: inst.breedSlug,
      images: inst.images,
    };
    const list = instancesByBreed.get(inst.breedSlug) ?? [];
    list.push(row);
    instancesByBreed.set(inst.breedSlug, list);
  }

  // get all cat pets from db with breed slug
  const pets = await prisma.pet.findMany({
    where: {
      species: "cat",
      catBreedSlug: { not: null },
      // Keep real user-posted pets (auth owners use phone "profile-<id>").
      owner: { NOT: { phone: { startsWith: "profile-" } } },
    },
    select: { id: true, catBreedSlug: true },
    orderBy: { id: "asc" },
  });

  if (pets.length === 0) {
    throw new Error("No cat pets found. Run npm run db:seed:pets first.");
  }

  console.log(`Assigning candid cat photos to ${pets.length} cats…`);
  // delete seeded cat photos only (keep user-posted)
  await prisma.petPhoto.deleteMany({
    where: {
      pet: {
        species: "cat",
        owner: { NOT: { phone: { startsWith: "profile-" } } },
      },
    },
  });

  const rng = createRng(SEED);
  const photoCountQueue = buildShuffledCountQueue(
    PHOTO_COUNT_OPTIONS,
    pets.length,
    rng,
  );
  // used to track which photos have already been used to avoid duplicates
  const usedInstances = new Set<string>();
  const batch: Array<{
    petId: number;
    imagePath: string;
    sortOrder: number;
    stanfordInstanceKey: string;
  }> = [];

  let skippedNoPool = 0;

  for (const [petIndex, pet] of pets.entries()) {
    const slug = pet.catBreedSlug!;
    // find breed pool
    const pool = resolveBreedPool(slug, instancesByBreed);
    if (pool.length === 0) {
      skippedNoPool++;
      continue;
    }

    // choose photo count
    const want = pickPhotoCount(photoCountQueue, petIndex);
    // build carousel
    const slides = collectBreedMatchedCarousel(
      pool,
      want,
      usedInstances,
      rng,
    );

    slides.forEach((slide, sortOrder) => {
      // create db rows
      // ie: { petId: 1, imagePath: "/candid-cats/images/1.jpg", sortOrder: 0, stanfordInstanceKey: "pixabay:1234567890" }
      batch.push({
        petId: pet.id,
        imagePath: slide.imagePath,
        sortOrder,
        stanfordInstanceKey: `pixabay:${slide.instanceKey}`,
      });
    });
  }

  const BATCH = 500;
  for (let i = 0; i < batch.length; i += BATCH) {
    await prisma.petPhoto.createMany({
      data: batch.slice(i, i + BATCH),
      skipDuplicates: true,
    });
    console.log(`  ${Math.min(i + BATCH, batch.length)} / ${batch.length}`);
  }

  const [photoCount, catsWithPhotos] = await Promise.all([
    prisma.petPhoto.count({ where: { pet: { species: "cat" } } }),
    prisma.pet.count({
      where: { species: "cat", photos: { some: {} } },
    }),
  ]);

  const byCount = await prisma.$queryRaw<
    Array<{ photos: number; cats: bigint }>
  >`
    SELECT x.c AS photos, COUNT(*)::bigint AS cats
    FROM (
      SELECT "petId", COUNT(*)::int AS c FROM pet_photos GROUP BY "petId"
    ) x
    INNER JOIN pets p ON p.id = x."petId"
    WHERE p.species = 'cat'
    GROUP BY x.c
    ORDER BY x.c
  `;

  console.log(
    `Done. ${photoCount} photos on ${catsWithPhotos} cats. Distribution:`,
    byCount.map((r) => ({ photos: r.photos, cats: Number(r.cats) })),
  );
  if (skippedNoPool > 0) {
    console.warn(`  ${skippedNoPool} cats had no breed-matched photo pool.`);
  }
}

async function main() {
  await seedCatPetPhotos();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


// flow breakdown:
// pet generation
// breed distribution
// location distribution
// photo count distribution
// breed matched carousels
// instance reuse control
// db seeding