import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRng, pickWeighted } from "../src/data/userGenerator.js";
import { STANFORD_FALLBACK_CLASS } from "../src/data/matchStanfordBreed.js";
import { BREED_STANFORD_PHOTO_CLASS } from "../src/data/stanfordMixedBreedPool.js";
import {
  isMixedBreedDogSlug,
  type MixedBreedDogsIndex,
} from "../src/data/mixedBreedDogPhotos.js";
import { PET_PHOTO_COUNT_WEIGHTS } from "../src/data/stanfordDogInstances.js";
import { prisma } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STANFORD_INDEX_PATH = join(__dirname, "../src/data/stanfordDogsIndex.json");
const MUTT_INDEX_PATH = join(__dirname, "../src/data/mixedBreedDogsIndex.json");
const SEED = 44;

type StanfordIndex = {
  byClass: Record<string, string[]>;
  instances: Array<{
    instanceKey: string;
    stanfordClass: string;
    images: Array<{ filename: string; path: string }>;
  }>;
  slugToClass: Record<string, string>;
};

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

async function main() {
  const index = JSON.parse(
    readFileSync(STANFORD_INDEX_PATH, "utf8"),
  ) as StanfordIndex;

  let muttIndex: MixedBreedDogsIndex;
  try {
    muttIndex = JSON.parse(
      readFileSync(MUTT_INDEX_PATH, "utf8"),
    ) as MixedBreedDogsIndex;
  } catch {
    throw new Error(
      "Missing mixedBreedDogsIndex.json. Run: npm run setup:mixed-breed-dogs && npm run build:mixed-breed-index",
    );
  }

  if (muttIndex.instances.length === 0) {
    throw new Error(
      "No mutt photos found. Run: npm run setup:mixed-breed-dogs -- --target 2500",
    );
  }

  const instancesByClass = new Map<string, StanfordIndex["instances"]>();
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
      instancesByClass.get(stanfordClass)?.filter(
        (i) => i.images.length > 0,
      ) ?? [];

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

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
