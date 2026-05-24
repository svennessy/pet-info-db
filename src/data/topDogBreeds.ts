import { DOG_BREEDS } from "./dogBreeds";

type BreedForAssignment = {
  slug: string;
  name: string;
  weight: number;
};

/** Pets use only the top N popular dog breeds (by weight). */
export const TOP_DOG_BREED_LIMIT = 100;

/**
 * Breeds kept in the catalog but excluded from pets and Dog Photos filters.
 * Top 100 is taken by rank first, then these are removed — no backfill from rank 101+.
 */
export const EXCLUDED_FROM_PET_DOG_BREEDS = new Set([
  "bearded-collie",
  "belgian-sheepdog",
  "bull-terrier",
  "shar-pei",
  "dachshund",
  "finnish-spitz",
  "goldendoodle",
  "havanese",
  "jack-russell-terrier",
]);

/** Slugs used for pet generation — top 100 by weight minus excluded, with rare-breed weight folded in. */
export function getTopDogBreedsForPets(): BreedForAssignment[] {
  const sorted = [...DOG_BREEDS].sort((a, b) => b.weight - a.weight);
  const top = sorted
    .slice(0, TOP_DOG_BREED_LIMIT)
    .filter((b) => !EXCLUDED_FROM_PET_DOG_BREEDS.has(b.id));
  const restWeight = sorted
    .slice(TOP_DOG_BREED_LIMIT)
    .reduce((sum, b) => sum + b.weight, 0);
  const topWeightSum = top.reduce((sum, b) => sum + b.weight, 0);
  const scale = topWeightSum > 0 ? (topWeightSum + restWeight) / topWeightSum : 1;

  return top.map((b) => ({
    slug: b.id,
    name: b.name,
    weight: b.weight * scale,
  }));
}

/** Dropdown/filter options: assignable pet breeds, A–Z. */
export function getTopDogBreedFilterOptions(): Array<{
  slug: string;
  name: string;
}> {
  return getTopDogBreedsForPets()
    .map((b) => ({ slug: b.slug, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isTopDogBreedSlug(slug: string): boolean {
  return getTopDogBreedsForPets().some((b) => b.slug === slug);
}
