import { OTHER_PETS_WITH_PHOTOS } from "./otherPetKinds";
import { getTopCatBreedsForPets } from "./topCatBreeds";
import { getTopDogBreedsForPets } from "./topDogBreeds";
import { pickPetDisplayName, type PetSpeciesKind } from "./petNames";
import {
  foundUnknownNameRate,
  pickReportStatus,
  UNKNOWN_PET_NAME,
  type PetReportStatus,
} from "./petReportStatus";
import { buildShuffledBreedQueue, shuffleInPlace } from "./allocateBreedPhotos";
import { petLatLongFromCity } from "./petLocation.js";
import { createRng, pickWeighted } from "./userGenerator";

export type OwnerCityCoords = {
  ownerId: number;
  cityId: string;
  latitude: number;
  longitude: number;
};

export type { PetSpeciesKind } from "./petNames";

export type BreedForAssignment = {
  slug: string;
  name: string;
  weight: number;
};

function generatePetDescription(
  name: string,
  species: PetSpeciesKind,
  breedLabel: string,
  reportStatus: PetReportStatus,
): string {
  if (reportStatus === "lost") {
    return `${name} is a ${breedLabel} ${species} reported missing by the owner. Last seen near their neighborhood. If spotted, please report the sighting.`;
  }

  if (name === UNKNOWN_PET_NAME) {
    return `This ${breedLabel} ${species} was reported found by a community member. The pet's name is currently unknown.`;
  }

  return `${name} is a ${breedLabel} ${species} that was reported found and is being reunited with its owner.`;
}

export type GeneratedPet = {
  name: string;
  description: string | null;
  species: PetSpeciesKind;
  reportStatus: PetReportStatus;
  breedLabel: string;
  dogBreedSlug: string | null;
  catBreedSlug: string | null;
  otherKind: string | null;
  ownerId: number;
  latitude: number;
  longitude: number;
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

export const CAT_WEIGHT_BOOSTS: Record<string, number> = {
  "domestic-shorthair": 4,
  "domestic-longhair": 3,
  "domestic-medium-hair": 3,
  "tabby-mix": 3,
  tuxedo: 2,
  calico: 2,
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

// creates 12,000 dogs, 7,400 cats, and 600 other pets
// then randomly distributes species
function buildSpeciesQueue(rng: () => number): PetSpeciesKind[] {
  const queue: PetSpeciesKind[] = [
    ...Array<"dog">(DOG_COUNT).fill("dog"),
    ...Array<"cat">(CAT_COUNT).fill("cat"),
    ...Array<"other">(OTHER_COUNT).fill("other"),
  ];
  shuffleInPlace(queue, rng);
  return queue;
}

function pickPetName(
  species: PetSpeciesKind,
  reportStatus: PetReportStatus,
  rng: () => number,
): string {
  // usually found pet names are unknown
  if (reportStatus === "found" && rng() < foundUnknownNameRate(species)) {
    return UNKNOWN_PET_NAME;
  }
  return pickPetDisplayName(species, rng);
}

function breedBySlug(
  breeds: BreedForAssignment[],
): Map<string, BreedForAssignment> {
  return new Map(breeds.map((b) => [b.slug, b]));
}

// how pets end up near owner's city
// flow is: owner city coords -> petLatLongFromCity() -> small random offset -> pet location
function coordsForOwner(
  ownerCoords: Map<number, OwnerCityCoords>,
  ownerId: number,
  seed: number,
): { latitude: number; longitude: number } {
  const city = ownerCoords.get(ownerId);
  if (!city) {
    throw new Error(`Missing city coords for owner ${ownerId}`);
  }
  return petLatLongFromCity(
    city.latitude,
    city.longitude,
    ownerId,
    seed,
    city.cityId,
  );
}

export function generatePets(
  ownerIds: number[],
  ownerCoords: OwnerCityCoords[],
  _dogBreeds: BreedForAssignment[],
  _catBreeds: BreedForAssignment[],
  seed = 43,
): GeneratedPet[] {
  if (ownerIds.length !== PET_COUNT) {
    throw new Error(
      `Expected ${PET_COUNT} owner ids, got ${ownerIds.length}`,
    );
  }

  const ownerCoordsById = new Map(
    ownerCoords.map((row) => [row.ownerId, row]),
  );
  if (ownerCoordsById.size !== PET_COUNT) {
    throw new Error(
      `Expected coords for ${PET_COUNT} owners, got ${ownerCoordsById.size}`,
    );
  }

  const dogBreeds = getTopDogBreedsForPets();
  const catBreeds = getTopCatBreedsForPets();
  if (dogBreeds.length === 0 || catBreeds.length === 0) {
    throw new Error("Dog and cat breed lists are required");
  }

  // random number generator for pet generation
  // means same seed, same pets, same locations, same names every time
  const rng = createRng(seed);
  const speciesQueue = buildSpeciesQueue(rng);
  // shuffle owner ids to randomly distribute pets
  const owners = [...ownerIds];
  shuffleInPlace(owners, rng);

  const weightedDogs = boostBreeds(dogBreeds, DOG_WEIGHT_BOOSTS);
  const catBreedQueue = buildShuffledBreedQueue(
    catBreeds,
    CAT_COUNT,
    CAT_WEIGHT_BOOSTS,
    rng,
  );
  const catBySlug = breedBySlug(catBreeds);
  let catIdx = 0;

  const pets: GeneratedPet[] = [];

  for (let i = 0; i < PET_COUNT; i++) {
    const species = speciesQueue[i];
    const reportStatus = pickReportStatus(species, rng);
    const name = pickPetName(species, reportStatus, rng);
    const description = generatePetDescription(
      name,
      species,
      species === "other" ? "pet" : "",
      reportStatus,
    );
    const ownerId = owners[i];
    const { latitude, longitude } = coordsForOwner(
      ownerCoordsById,
      ownerId,
      seed,
    );

    // if dog, pick a dog breed (weighted random)
    if (species === "dog") {
      const picked = pickWeighted(weightedDogs, rng);
      pets.push({
        name,
        description: generatePetDescription(
          name,
          species,
          picked.name,
          reportStatus,
        ),
        species,
        reportStatus,
        breedLabel: picked.name,
        dogBreedSlug: picked.slug,
        catBreedSlug: null,
        otherKind: null,
        ownerId,
        latitude,
        longitude,
      });
    } else if (species === "cat") {
      // pick a cat breed (pre-built shuffled queue)
      const slug = catBreedQueue[catIdx++];
      const picked = catBySlug.get(slug);
      if (!picked) throw new Error(`Unknown cat breed slug: ${slug}`);
      pets.push({
        name,
        description: generatePetDescription(
          name,
          species,
          picked.name,
          reportStatus,
        ),
        species,
        reportStatus,
        breedLabel: picked.name,
        dogBreedSlug: null,
        catBreedSlug: picked.slug,
        otherKind: null,
        ownerId,
        latitude,
        longitude,
      });
    } else {
      const kind = pickWeighted(
        OTHER_PETS_WITH_PHOTOS.map((k) => ({ name: k.kind, weight: k.weight })),
        rng,
      ).name;
      pets.push({
        name,
        description: generatePetDescription(
          name,
          species,
          kind,
          reportStatus,
        ),
        species,
        reportStatus,
        breedLabel: kind,
        dogBreedSlug: null,
        catBreedSlug: null,
        otherKind: kind,
        ownerId,
        latitude,
        longitude,
      });
    }
  }

  return pets;
}

// final generated pet looks like:
// {
//   name: "Buddy",
//   species: "dog",
//   reportStatus: "lost",
//   breedLabel: "Golden Retriever",
//   dogBreedSlug: "golden-retriever",
//   catBreedSlug: null,
//   otherKind: null,
//   ownerId: 1,
//   latitude: 40.7128,
//   longitude: -74.0060,
// }