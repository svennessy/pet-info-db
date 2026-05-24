export type BreedWeight = {
  slug: string;
  weight: number;
};

/**
 * Split `totalPhotos` across breeds proportional to weight (largest remainder).
 */
export function allocatePhotosByWeight(
  breeds: readonly BreedWeight[],
  totalPhotos: number,
): Record<string, number> {
  if (breeds.length === 0) return {};

  const totalWeight = breeds.reduce((sum, b) => sum + b.weight, 0);
  const rows = breeds.map((breed) => {
    const exact = (totalPhotos * breed.weight) / totalWeight;
    const base = Math.floor(exact);
    return { slug: breed.slug, base, remainder: exact - base };
  });

  let assigned = rows.reduce((sum, row) => sum + row.base, 0);
  const counts = Object.fromEntries(rows.map((row) => [row.slug, row.base]));

  const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder);
  for (const row of byRemainder) {
    if (assigned >= totalPhotos) break;
    counts[row.slug]++;
    assigned++;
  }

  return counts;
}

export const DOG_PHOTO_TARGET = 36_000;
