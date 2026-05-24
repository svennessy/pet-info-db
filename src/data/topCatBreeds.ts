import { CAT_BREEDS } from "./catBreeds";

type BreedForAssignment = {
  slug: string;
  name: string;
  weight: number;
};

/** Pets use only the top N popular cat breeds (by weight). */
export const TOP_CAT_BREED_LIMIT = 20;

/** Slugs used for pet generation — top 20 by weight, with rare-breed weight folded in. */
export function getTopCatBreedsForPets(): BreedForAssignment[] {
  const sorted = [...CAT_BREEDS].sort((a, b) => b.weight - a.weight);
  const top = sorted.slice(0, TOP_CAT_BREED_LIMIT);
  const restWeight = sorted
    .slice(TOP_CAT_BREED_LIMIT)
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
export function getTopCatBreedFilterOptions(): Array<{
  slug: string;
  name: string;
}> {
  return getTopCatBreedsForPets()
    .map((b) => ({ slug: b.slug, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isTopCatBreedSlug(slug: string): boolean {
  return getTopCatBreedsForPets().some((b) => b.slug === slug);
}
