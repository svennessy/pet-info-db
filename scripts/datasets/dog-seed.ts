/**
 * Layer 3 — Seed: assign Stanford + mutt photos to dog pets in the database.
 */
import { readFileSync } from "node:fs";
import { buildShuffledCountQueue } from "../../src/data/allocateBreedPhotos.js";
import { createRng } from "../../src/data/userGenerator.js";
import { STANFORD_FALLBACK_CLASS } from "../../src/data/matchStanfordBreed.js";
import { BREED_STANFORD_PHOTO_CLASS } from "../../src/data/stanfordMixedBreedPool.js";
import { isMixedBreedDogSlug } from "../../src/data/mixedBreedDogPhotos.js";
import type { DogMuttLegacyIndex } from "../../src/data/datasets/dogMutt.js";
import type { DogStanfordLegacyIndex } from "../../src/data/datasets/dogStanford.js";
import {
  MUTT_LEGACY_INDEX_PATH,
  STANFORD_LEGACY_INDEX_PATH,
} from "../../src/data/datasets/paths.js";
import { PET_PHOTO_COUNT_WEIGHTS } from "../../src/data/stanfordDogInstances.js";
import { prisma } from "../../prisma/db.js";

const SEED = 44;

type PhotoInstance = {
  instanceKey: string;
  stanfordClass?: string;
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

function resolveStanfordPool(
  slug: string,
  index: DogStanfordLegacyIndex,
  instancesByClass: Map<string, PhotoInstance[]>,
): PhotoInstance[] {
  const stanfordClass =
    BREED_STANFORD_PHOTO_CLASS[slug] ??
    index.slugToClass[slug] ??
    STANFORD_FALLBACK_CLASS;

  return (
    instancesByClass.get(stanfordClass)?.filter((i) => i.images.length > 0) ??
    []
  );
}

/**
 * Carousel from a single Stanford instance — same individual as the cover (sortOrder 0).
 */
function collectSameDogCarousel(
  pool: PhotoInstance[],
  want: number,
  usedInstances: Set<string>,
  rng: () => number,
): CarouselSlide[] {
  if (pool.length === 0 || want <= 0) return [];

  const fresh = pool.filter(
    (i) => i.images.length > 0 && !usedInstances.has(i.instanceKey),
  );
  const pickFrom = fresh.length > 0 ? fresh : pool.filter((i) => i.images.length > 0);

  const preferMulti = pickFrom.filter((i) => i.images.length >= Math.min(want, 2));
  const candidates = preferMulti.length > 0 ? preferMulti : pickFrom;

  const instance = candidates[Math.floor(rng() * candidates.length)];
  usedInstances.add(instance.instanceKey);

  const chosen = shuffle(instance.images, rng).slice(
    0,
    Math.min(want, instance.images.length),
  );

  return chosen.map((img) => ({
    imagePath: img.path,
    instanceKey: instance.instanceKey,
  }));
}

function collectMuttCarousel(
  pool: PhotoInstance[],
  want: number,
  usedInstances: Set<string>,
  rng: () => number,
): CarouselSlide[] {
  if (pool.length === 0 || want <= 0) return [];

  const fresh = pool.filter(
    (i) => i.images.length > 0 && !usedInstances.has(i.instanceKey),
  );
  const pickFrom = fresh.length > 0 ? fresh : pool.filter((i) => i.images.length > 0);

  const instance = pickFrom[Math.floor(rng() * pickFrom.length)];
  usedInstances.add(instance.instanceKey);

  const chosen = shuffle(instance.images, rng).slice(
    0,
    Math.min(want, instance.images.length),
  );

  return chosen.map((img) => ({
    imagePath: img.path,
    instanceKey: instance.instanceKey,
  }));
}

export async function seedDogPetPhotos() {
  let index: DogStanfordLegacyIndex;
  let muttIndex: DogMuttLegacyIndex;

  try {
    index = JSON.parse(
      readFileSync(STANFORD_LEGACY_INDEX_PATH, "utf8"),
    ) as DogStanfordLegacyIndex;
  } catch {
    throw new Error(
      `Missing Stanford index. Run: npm run dataset:dog:stanford:process`,
    );
  }

  try {
    muttIndex = JSON.parse(
      readFileSync(MUTT_LEGACY_INDEX_PATH, "utf8"),
    ) as DogMuttLegacyIndex;
  } catch {
    throw new Error(
      "Missing mutt index. Run: npm run dataset:dog:mutt:fetch && npm run dataset:dog:mutt:process",
    );
  }

  if (muttIndex.instances.length === 0) {
    throw new Error(
      "No mutt photos found. Run: npm run dataset:dog:mutt:fetch -- --target 2500",
    );
  }

  const instancesByClass = new Map<string, PhotoInstance[]>();
  for (const inst of index.instances) {
    const row: PhotoInstance = {
      instanceKey: inst.instanceKey,
      stanfordClass: inst.stanfordClass,
      images: inst.images,
    };
    const list = instancesByClass.get(inst.stanfordClass) ?? [];
    list.push(row);
    instancesByClass.set(inst.stanfordClass, list);
  }

  const muttPool: PhotoInstance[] = muttIndex.instances
    .filter((i) => i.images.length > 0)
    .map((inst) => ({
      instanceKey: inst.instanceKey,
      images: inst.images,
    }));

  const pets = await prisma.pet.findMany({
    where: {
      species: "dog",
      dogBreedSlug: { not: null },
      // Keep real user-posted pets (auth owners use phone "profile-<id>").
      owner: { NOT: { phone: { startsWith: "profile-" } } },
    },
    select: { id: true, dogBreedSlug: true },
    orderBy: { id: "asc" },
  });

  if (pets.length === 0) {
    throw new Error("No dog pets found. Run npm run db:seed:pets first.");
  }

  const muttPetCount = pets.filter((p) =>
    isMixedBreedDogSlug(p.dogBreedSlug!),
  ).length;

  console.log(
    `Assigning photos to ${pets.length} dogs (${muttPetCount} mixed-breed / *-mix → Wikimedia mutts)…`,
  );
  await prisma.petPhoto.deleteMany({
    where: {
      pet: {
        species: "dog",
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
  const usedStanfordInstances = new Set<string>();
  const usedMuttInstances = new Set<string>();
  const batch: Array<{
    petId: number;
    imagePath: string;
    sortOrder: number;
    stanfordInstanceKey: string;
  }> = [];

  let skippedNoPool = 0;

  for (const [petIndex, pet] of pets.entries()) {
    const slug = pet.dogBreedSlug!;
    const useMuttPhotos = isMixedBreedDogSlug(slug);
    const want = useMuttPhotos
      ? 1
      : pickPhotoCount(photoCountQueue, petIndex);

    const slides = useMuttPhotos
      ? collectMuttCarousel(muttPool, want, usedMuttInstances, rng)
      : collectSameDogCarousel(
          resolveStanfordPool(slug, index, instancesByClass),
          want,
          usedStanfordInstances,
          rng,
        );

    if (slides.length === 0) {
      skippedNoPool++;
      continue;
    }

    slides.forEach((slide, sortOrder) => {
      batch.push({
        petId: pet.id,
        imagePath: slide.imagePath,
        sortOrder,
        stanfordInstanceKey: useMuttPhotos
          ? `mutt:${slide.instanceKey}`
          : slide.instanceKey,
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

  const [photoCount, petsWithPhotos] = await Promise.all([
    prisma.petPhoto.count({ where: { pet: { species: "dog" } } }),
    prisma.pet.count({
      where: { species: "dog", photos: { some: {} } },
    }),
  ]);

  const byCount = await prisma.$queryRaw<
    Array<{ photos: number; dogs: bigint }>
  >`
    SELECT x.c AS photos, COUNT(*)::bigint AS dogs
    FROM (
      SELECT "petId", COUNT(*)::int AS c FROM pet_photos GROUP BY "petId"
    ) x
    INNER JOIN pets p ON p.id = x."petId"
    WHERE p.species = 'dog'
    GROUP BY x.c
    ORDER BY x.c
  `;

  console.log(
    `Done. ${photoCount} photos on ${petsWithPhotos} dogs. Distribution:`,
    byCount.map((r) => ({ photos: r.photos, dogs: Number(r.dogs) })),
  );
  if (skippedNoPool > 0) {
    console.warn(`  ${skippedNoPool} dogs had no breed-matched photo pool.`);
  }
}

async function main() {
  await seedDogPetPhotos();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
