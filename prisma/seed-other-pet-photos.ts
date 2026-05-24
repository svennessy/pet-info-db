import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OTHER_PET_PHOTO_KIND_LABELS } from "../src/data/otherPetPhotoKinds.js";
import { otherKindToPhotoSlug } from "../src/data/otherPetPhotoKinds.js";
import { createRng, pickWeighted } from "../src/data/userGenerator.js";
import { PET_PHOTO_COUNT_WEIGHTS } from "../src/data/oxfordCatInstances.js";
import { prisma } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, "../src/data/otherPetPhotosIndex.json");
const SEED = 46;

type OtherPetPhotosIndex = {
  instances: Array<{
    instanceKey: string;
    kindSlug: string;
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

async function main() {
  let index: OtherPetPhotosIndex;
  try {
    index = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as OtherPetPhotosIndex;
  } catch {
    throw new Error(
      "Missing otherPetPhotosIndex.json. Run: npm run setup:other-pet-photos",
    );
  }

  if (index.instances.length === 0) {
    throw new Error("Other pet photo index has no instances.");
  }

  const instancesByKind = new Map<string, PhotoInstance[]>();
  for (const inst of index.instances) {
    const row: PhotoInstance = {
      instanceKey: inst.instanceKey,
      images: inst.images,
    };
    const list = instancesByKind.get(inst.kindSlug) ?? [];
    list.push(row);
    instancesByKind.set(inst.kindSlug, list);
  }

  const pets = await prisma.pet.findMany({
    where: {
      species: "other",
      otherKind: { in: [...OTHER_PET_PHOTO_KIND_LABELS] },
    },
    select: { id: true, otherKind: true },
    orderBy: { id: "asc" },
  });

  if (pets.length === 0) {
    throw new Error("No bird/rabbit pets found. Run npm run db:seed:pets first.");
  }

  console.log(`Assigning bird & bunny photos to ${pets.length} pets…`);
  await prisma.petPhoto.deleteMany({
    where: {
      pet: {
        species: "other",
        otherKind: { in: [...OTHER_PET_PHOTO_KIND_LABELS] },
      },
    },
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
    const slug = otherKindToPhotoSlug(pet.otherKind!);
    if (!slug) continue;

    const pool = instancesByKind.get(slug)?.filter((i) => i.images.length > 0) ?? [];
    if (pool.length === 0) continue;

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
  }

  const [photoCount, petsWithPhotos] = await Promise.all([
    prisma.petPhoto.count({
      where: {
        pet: {
          species: "other",
          otherKind: { in: [...OTHER_PET_PHOTO_KIND_LABELS] },
        },
      },
    }),
    prisma.pet.count({
      where: {
        species: "other",
        otherKind: { in: [...OTHER_PET_PHOTO_KIND_LABELS] },
        photos: { some: {} },
      },
    }),
  ]);

  console.log(`Done. ${photoCount} photos on ${petsWithPhotos} birds & bunnies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
