import { OTHER_PET_KINDS } from "./otherPetKinds";
import { getTopCatBreedsForPets } from "./topCatBreeds";
import { getTopDogBreedsForPets } from "./topDogBreeds";
import { pickPetDisplayName, type PetSpeciesKind } from "./petNames";
import {
  foundUnknownNameRate,
  pickReportStatus,
  UNKNOWN_PET_NAME,
  type PetReportStatus,
} from "./petReportStatus";
import { createRng, pickWeighted } from "./userGenerator";

export type { PetSpeciesKind } from "./petNames";

export type BreedForAssignment = {
  slug: string;
  name: string;
  weight: number;
};

export type GeneratedPet = {
  name: string;
  species: PetSpeciesKind;
  reportStatus: PetReportStatus;
  breedLabel: string;
  dogBreedSlug: string | null;
  catBreedSlug: string | null;
  otherKind: string | null;
  ownerId: number;
};

const DOG_COUNT = 12_000;
const CAT_COUNT = 7_400;
const OTHER_COUNT = 600;
export const PET_COUNT = DOG_COUNT + CAT_COUNT + OTHER_COUNT;

/** Extra multipliers at generation time so shelter-style mixes dominate rare purebreds. */
const DOG_WEIGHT_BOOSTS: Record<string, number> = {
  "mixed-breed": 6,
  "bully-mix": 2,
  "shepherd-mix": 2,
  "husky-mix": 2,
  "terrier-mix": 2,
};

const CAT_WEIGHT_BOOSTS: Record<string, number> = {
  "domestic-shorthair": 4,
  "domestic-longhair": 3,
  "domestic-medium-hair": 3,
  "tabby-mix": 3,
  "tuxedo": 2,
  "calico": 2,
};

function boostBreeds(
  breeds: BreedForAssignment[],
  boosts: Record<string, number>,
): BreedForAssignment[] {
  return breeds.map((b) => ({
    ...b,
    weight: b.weight * (boosts[b.slug] ?? 1),
  }));
}

function shuffle<T>(items: T[], rng: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function buildSpeciesQueue(rng: () => number): PetSpeciesKind[] {
  const queue: PetSpeciesKind[] = [
    ...Array<"dog">(DOG_COUNT).fill("dog"),
    ...Array<"cat">(CAT_COUNT).fill("cat"),
    ...Array<"other">(OTHER_COUNT).fill("other"),
  ];
  shuffle(queue, rng);
  return queue;
}

function pickPetName(
  species: PetSpeciesKind,
  reportStatus: PetReportStatus,
  rng: () => number,
): string {
  if (reportStatus === "found" && rng() < foundUnknownNameRate(species)) {
    return UNKNOWN_PET_NAME;
  }
  return pickPetDisplayName(species, rng);
}

export function generatePets(
  ownerIds: number[],
  _dogBreeds: BreedForAssignment[],
  _catBreeds: BreedForAssignment[],
  seed = 43,
): GeneratedPet[] {
  if (ownerIds.length !== PET_COUNT) {
    throw new Error(
      `Expected ${PET_COUNT} owner ids, got ${ownerIds.length}`,
    );
  }

  const dogBreeds = getTopDogBreedsForPets();
  const catBreeds = getTopCatBreedsForPets();
  if (dogBreeds.length === 0 || catBreeds.length === 0) {
    throw new Error("Dog and cat breed lists are required");
  }

  const rng = createRng(seed);
  const speciesQueue = buildSpeciesQueue(rng);
  const owners = [...ownerIds];
  shuffle(owners, rng);

  const weightedDogs = boostBreeds(dogBreeds, DOG_WEIGHT_BOOSTS);
  const weightedCats = boostBreeds(catBreeds, CAT_WEIGHT_BOOSTS);

  const pets: GeneratedPet[] = [];

  for (let i = 0; i < PET_COUNT; i++) {
    const species = speciesQueue[i];
    const reportStatus = pickReportStatus(species, rng);
    const name = pickPetName(species, reportStatus, rng);

    if (species === "dog") {
      const picked = pickWeighted(weightedDogs, rng);
      pets.push({
        name,
        species,
        reportStatus,
        breedLabel: picked.name,
        dogBreedSlug: picked.slug,
        catBreedSlug: null,
        otherKind: null,
        ownerId: owners[i],
      });
    } else if (species === "cat") {
      const picked = pickWeighted(weightedCats, rng);
      pets.push({
        name,
        species,
        reportStatus,
        breedLabel: picked.name,
        dogBreedSlug: null,
        catBreedSlug: picked.slug,
        otherKind: null,
        ownerId: owners[i],
      });
    } else {
      const kind = pickWeighted(
        OTHER_PET_KINDS.map((k) => ({ name: k.kind, weight: k.weight })),
        rng,
      ).name;
      pets.push({
        name,
        species,
        reportStatus,
        breedLabel: kind,
        dogBreedSlug: null,
        catBreedSlug: null,
        otherKind: kind,
        ownerId: owners[i],
      });
    }
  }

  return pets;
}
