/**
 * Layer 3 — Seed: assign Stanford + mutt photos to dog pets in the database.
 */
import { readFileSync } from "node:fs";
import { createRng, pickWeighted } from "../../src/data/userGenerator.js";
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
  images: Array<{ filename: string; path: string }>;
};

const PHOTO_COUNT_OPTIONS = PET_PHOTO_COUNT_WEIGHTS.map((row) => ({
  name: String(row.count),
  weight: row.weight,
}));

function pickPhotoCount(rng: () => number): number {
  return Number.parseInt(pickWeighted(PHOTO_COUNT_OPTIONS, rng).name, 10);
}

function shuffle<T>(items: T[], rng: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickInstance(
  pool: PhotoInstance[],
  usedInstances: Set<string>,
  rng: () => number,
): PhotoInstance {
  const withImages = pool.filter((i) => i.images.length > 0);
  const available = withImages.filter((i) => !usedInstances.has(i.instanceKey));
  const pickFrom = available.length > 0 ? available : withImages;
  return pickFrom[Math.floor(rng() * pickFrom.length)];
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
      `Missing mutt index. Run: npm run dataset:dog:mutt:fetch && npm run dataset:dog:mutt:process`,
    );
  }

  if (muttIndex.instances.length === 0) {
    throw new Error(
      "No mutt photos found. Run: npm run dataset:dog:mutt:fetch -- --target 2500",
    );
  }

  const instancesByClass = new Map<string, DogStanfordLegacyIndex["instances"]>();
  for (const inst of index.instances) {
    const list = instancesByClass.get(inst.stanfordClass) ?? [];
    list.push(inst);
    instancesByClass.set(inst.stanfordClass, list);
  }

  const muttPool = muttIndex.instances.filter((i) => i.images.length > 0);

  const pets = await prisma.pet.findMany({
    where: { species: "dog", dogBreedSlug: { not: null } },
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
    where: { pet: { species: "dog" } },
  });

  const rng = createRng(SEED);
  const usedStanfordInstances = new Set<string>();
  const usedMuttInstances = new Set<string>();
  const batch: Array<{
    petId: number;
    imagePath: string;
    sortOrder: number;
    stanfordInstanceKey: string;
  }> = [];

  for (const pet of pets) {
    const slug = pet.dogBreedSlug!;
    const useMuttPhotos = isMixedBreedDogSlug(slug);

    if (useMuttPhotos) {
      const instance = pickInstance(muttPool, usedMuttInstances, rng);
      usedMuttInstances.add(instance.instanceKey);

      const want = Math.min(pickPhotoCount(rng), instance.images.length);
      const chosen = shuffle(instance.images, rng).slice(0, want);

      chosen.forEach((img, sortOrder) => {
        batch.push({
          petId: pet.id,
          imagePath: img.path,
          sortOrder,
          stanfordInstanceKey: `mutt:${instance.instanceKey}`,
        });
      });
      continue;
    }

    const stanfordClass =
      BREED_STANFORD_PHOTO_CLASS[slug] ??
      index.slugToClass[slug] ??
      STANFORD_FALLBACK_CLASS;
    let pool =
      instancesByClass.get(stanfordClass)?.filter((i) => i.images.length > 0) ??
      [];

    if (pool.length === 0) {
      pool = index.instances.filter((i) => i.images.length > 0);
    }

    const instance = pickInstance(pool, usedStanfordInstances, rng);
    usedStanfordInstances.add(instance.instanceKey);

    const want = Math.min(pickPhotoCount(rng), instance.images.length);
    const chosen = shuffle(instance.images, rng).slice(0, want);

    chosen.forEach((img, sortOrder) => {
      batch.push({
        petId: pet.id,
        imagePath: img.path,
        sortOrder,
        stanfordInstanceKey: instance.instanceKey,
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
