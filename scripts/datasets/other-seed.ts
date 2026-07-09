/**
 * Layer 3 — Seed bird & bunny photos onto pets in the database.
 */
import { readFileSync } from "node:fs";
import type { OtherPetLegacyIndex } from "../../src/data/datasets/otherPet.js";
import { OTHER_LEGACY_INDEX_PATH } from "../../src/data/datasets/paths.js";
import {
  OTHER_PET_PHOTO_KIND_LABELS,
  photoPoolSlugForPet,
} from "../../src/data/otherPetPhotoKinds.js";
import { buildShuffledCountQueue } from "../../src/data/allocateBreedPhotos.js";
import { createRng } from "../../src/data/userGenerator.js";
import { PET_PHOTO_COUNT_WEIGHTS } from "../../src/data/stanfordDogInstances.js";
import { prisma } from "../../prisma/db.js";

const SEED = 46;

type PhotoInstance = {
  instanceKey: string;
  kindSlug: string;
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

function resolveKindPool(
  poolSlug: string,
  instancesByKind: Map<string, PhotoInstance[]>,
): PhotoInstance[] {
  return (
    instancesByKind.get(poolSlug)?.filter((i) => i.images.length > 0) ?? []
  );
}

/** All carousel slides from one instance (same query batch = same look). */
function collectSameLookCarousel(
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

export async function seedOtherPetPhotos() {
  let index: OtherPetLegacyIndex;
  try {
    index = JSON.parse(
      readFileSync(OTHER_LEGACY_INDEX_PATH, "utf8"),
    ) as OtherPetLegacyIndex;
  } catch {
    throw new Error(
      `Missing legacy other-pet index. Run: npm run dataset:other:process`,
    );
  }

  if (index.instances.length === 0) {
    throw new Error("Other pet index has no instances.");
  }

  const instancesByKind = new Map<string, PhotoInstance[]>();
  for (const inst of index.instances) {
    const row: PhotoInstance = {
      instanceKey: inst.instanceKey,
      kindSlug: inst.kindSlug,
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
      // Keep real user-posted pets (auth owners use phone "profile-<id>").
      owner: { NOT: { phone: { startsWith: "profile-" } } },
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
  const usedInstances = new Set<string>();
  const batch: Array<{
    petId: number;
    imagePath: string;
    sortOrder: number;
    stanfordInstanceKey: string;
  }> = [];

  let skippedNoPool = 0;

  for (const [petIndex, pet] of pets.entries()) {
    const poolSlug = photoPoolSlugForPet(pet.otherKind!, pet.id);
    if (!poolSlug) continue;

    const pool = resolveKindPool(poolSlug, instancesByKind);
    if (pool.length === 0) {
      skippedNoPool++;
      continue;
    }

    const want = pickPhotoCount(photoCountQueue, petIndex);
    const slides = collectSameLookCarousel(pool, want, usedInstances, rng);

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
  if (skippedNoPool > 0) {
    console.warn(`  ${skippedNoPool} pets had no matching photo pool.`);
  }
}

async function main() {
  await seedOtherPetPhotos();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
