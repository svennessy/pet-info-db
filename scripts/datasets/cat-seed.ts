/**
 * Layer 3 — Seed: assign processed cat photos to pets in the database.
 */
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
import { PET_PHOTO_COUNT_WEIGHTS } from "../../src/data/oxfordCatInstances.js";
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

  const pets = await prisma.pet.findMany({
    where: { species: "cat", catBreedSlug: { not: null } },
    select: { id: true, catBreedSlug: true },
    orderBy: { id: "asc" },
  });

  if (pets.length === 0) {
    throw new Error("No cat pets found. Run npm run db:seed:pets first.");
  }

  console.log(`Assigning candid cat photos to ${pets.length} cats…`);
  await prisma.petPhoto.deleteMany({
    where: { pet: { species: "cat" } },
  });

  const rng = createRng(SEED);
  const photoCountQueue = buildShuffledCountQueue(
    PHOTO_COUNT_OPTIONS,
    pets.length,
    rng,
  );
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
    const pool = resolveBreedPool(slug, instancesByBreed);
    if (pool.length === 0) {
      skippedNoPool++;
      continue;
    }

    const want = pickPhotoCount(photoCountQueue, petIndex);
    const slides = collectBreedMatchedCarousel(
      pool,
      want,
      usedInstances,
      rng,
    );

    slides.forEach((slide, sortOrder) => {
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
