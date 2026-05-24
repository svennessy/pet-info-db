import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANDID_CAT_BREED_PROXIES,
  CANDID_CAT_FALLBACK_SLUG,
  DOMESTIC_CAT_SLUGS,
} from "../src/data/candidCatBreedProxies.js";
import { createRng, pickWeighted } from "../src/data/userGenerator.js";
import { PET_PHOTO_COUNT_WEIGHTS } from "../src/data/oxfordCatInstances.js";
import { prisma } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, "../src/data/candidCatsIndex.json");
const SEED = 45;

type CandidCatsIndex = {
  byBreed: Record<string, string[]>;
  instances: Array<{
    instanceKey: string;
    breedSlug: string;
    images: Array<{ filename: string; path: string }>;
  }>;
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

function resolvePool(
  slug: string,
  instancesByKey: Map<string, PhotoInstance>,
  instancesByBreed: Map<string, PhotoInstance[]>,
): PhotoInstance[] {
  const trySlugs = [slug, ...(CANDID_CAT_BREED_PROXIES[slug] ?? [])];
  if (DOMESTIC_CAT_SLUGS.has(slug)) {
    trySlugs.push(CANDID_CAT_FALLBACK_SLUG);
  }

  for (const s of trySlugs) {
    const pool =
      instancesByBreed.get(s)?.filter((i) => i.images.length > 0) ?? [];
    if (pool.length > 0) return pool;
  }

  return [...instancesByKey.values()].filter((i) => i.images.length > 0);
}

async function main() {
  let index: CandidCatsIndex;
  try {
    index = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as CandidCatsIndex;
  } catch {
    throw new Error(
      "Missing candidCatsIndex.json. Run: npm run setup:candid-cats",
    );
  }

  if (index.instances.length === 0) {
    throw new Error("Candid cat index has no instances.");
  }

  const instancesByKey = new Map<string, PhotoInstance>();
  const instancesByBreed = new Map<string, PhotoInstance[]>();

  for (const inst of index.instances) {
    const row: PhotoInstance = {
      instanceKey: inst.instanceKey,
      images: inst.images,
    };
    instancesByKey.set(inst.instanceKey, row);
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
  const usedInstances = new Set<string>();
  const batch: Array<{
    petId: number;
    imagePath: string;
    sortOrder: number;
    stanfordInstanceKey: string;
  }> = [];

  for (const pet of pets) {
    const slug = pet.catBreedSlug!;
    const pool = resolvePool(slug, instancesByKey, instancesByBreed);
    const instance = pickInstance(pool, usedInstances, rng);
    usedInstances.add(instance.instanceKey);

    const want = Math.min(pickPhotoCount(rng), instance.images.length);
    const chosen = shuffle(instance.images, rng).slice(0, want);

    chosen.forEach((img, sortOrder) => {
      batch.push({
        petId: pet.id,
        imagePath: img.path,
        sortOrder,
        stanfordInstanceKey: `pixabay:${instance.instanceKey}`,
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
