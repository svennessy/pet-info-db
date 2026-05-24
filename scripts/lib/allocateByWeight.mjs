/**
 * Split `total` across items proportional to weight (largest remainder).
 * Mirrors src/data/allocateBreedPhotos.ts for .mjs harvest scripts.
 */
export function allocateByWeight(items, total) {
  if (!items.length || total <= 0) return {};

  const totalWeight = items.reduce((sum, b) => sum + b.weight, 0);
  if (totalWeight <= 0) return {};

  const rows = items.map((item) => {
    const exact = (total * item.weight) / totalWeight;
    const base = Math.floor(exact);
    return { slug: item.slug, base, remainder: exact - base };
  });

  let assigned = rows.reduce((sum, row) => sum + row.base, 0);
  const counts = Object.fromEntries(rows.map((row) => [row.slug, row.base]));

  const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder);
  for (const row of byRemainder) {
    if (assigned >= total) break;
    counts[row.slug]++;
    assigned++;
  }

  return counts;
}

export function buildBreedQuotas(breeds, total, boosts = {}) {
  const weighted = breeds.map((b) => ({
    slug: b.slug,
    weight: b.weight * (boosts[b.slug] ?? 1),
  }));
  const counts = allocateByWeight(weighted, total);
  return weighted.map((b) => ({
    slug: b.slug,
    target: counts[b.slug] ?? 0,
  }));
}

/** Default Pixabay harvest total (~55 × 20 breeds). */
export const CAT_PHOTO_TARGET = 1100;

export const CAT_PHOTO_WEIGHT_BOOSTS = {
  "domestic-shorthair": 4,
  "domestic-longhair": 3,
  "domestic-medium-hair": 3,
  "tabby-mix": 3,
  tuxedo: 2,
  calico: 2,
};
