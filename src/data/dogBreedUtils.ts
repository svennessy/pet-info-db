import { DOG_BREEDS } from "./dogBreeds";
import {
  COMMONALITY_LABELS,
  COMMONALITY_ORDER,
} from "./breedCommonality";
import type { BreedCommonality } from "./breedCommonality";
import type { DogBreed } from "./dogBreedTypes";

export { COMMONALITY_LABELS, COMMONALITY_ORDER };

export function getDogBreedById(id: string): DogBreed | undefined {
  return DOG_BREEDS.find((breed) => breed.id === id);
}

export function sortBreedsByCommonality(
  breeds: readonly DogBreed[],
  direction: "asc" | "desc" = "desc",
): DogBreed[] {
  const rank = (c: BreedCommonality) => COMMONALITY_ORDER.indexOf(c);

  return [...breeds].sort((a, b) => {
    const byCommonality =
      direction === "desc"
        ? rank(b.commonality) - rank(a.commonality)
        : rank(a.commonality) - rank(b.commonality);

    if (byCommonality !== 0) return byCommonality;
    return b.weight - a.weight || a.name.localeCompare(b.name);
  });
}

export function sortBreedsByWeight(
  breeds: readonly DogBreed[],
  direction: "asc" | "desc" = "desc",
): DogBreed[] {
  return [...breeds].sort((a, b) =>
    direction === "desc" ? b.weight - a.weight : a.weight - b.weight,
  );
}

export function filterBreedsByCommonality(
  breeds: readonly DogBreed[],
  commonality: BreedCommonality,
): DogBreed[] {
  return breeds.filter((breed) => breed.commonality === commonality);
}

/** Pick a breed using weight — for seeding random pets. */
export function pickWeightedDogBreed(rng: () => number = Math.random): DogBreed {
  const totalWeight = DOG_BREEDS.reduce((sum, breed) => sum + breed.weight, 0);
  let roll = rng() * totalWeight;

  for (const breed of DOG_BREEDS) {
    roll -= breed.weight;
    if (roll <= 0) return breed;
  }

  return DOG_BREEDS[DOG_BREEDS.length - 1];
}

export function getBreedStats() {
  const byCommonality = COMMONALITY_ORDER.reduce(
    (acc, tier) => {
      acc[tier] = DOG_BREEDS.filter((b) => b.commonality === tier).length;
      return acc;
    },
    {} as Record<BreedCommonality, number>,
  );

  return {
    total: DOG_BREEDS.length,
    byCommonality,
    totalWeight: DOG_BREEDS.reduce((sum, b) => sum + b.weight, 0),
  };
}
