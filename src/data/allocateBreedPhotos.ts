export type BreedWeight = {
  slug: string;
  weight: number;
};

export type WeightedValue = {
  value: number;
  weight: number;
};

/**
 * Split `total` across items proportional to weight (largest remainder).
 */
export function allocateByWeight(
  items: readonly BreedWeight[],
  total: number,
): Record<string, number> {
  if (items.length === 0 || total <= 0) return {};

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

/** @deprecated Use allocateByWeight — kept for existing dog photo harvest. */
export function allocatePhotosByWeight(
  breeds: readonly BreedWeight[],
  totalPhotos: number,
): Record<string, number> {
  return allocateByWeight(breeds, totalPhotos);
}

export function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Exact breed quotas expanded into a queue (optionally shuffled).
 */
export function buildShuffledBreedQueue(
  breeds: readonly BreedWeight[],
  total: number,
  boosts: Record<string, number> = {},
  rng?: () => number,
): string[] {
  const weighted = breeds.map((b) => ({
    slug: b.slug,
    weight: b.weight * (boosts[b.slug] ?? 1),
  }));
  const counts = allocateByWeight(weighted, total);
  const queue: string[] = [];
  for (const breed of weighted) {
    const n = counts[breed.slug] ?? 0;
    for (let i = 0; i < n; i++) queue.push(breed.slug);
  }
  if (rng) shuffleInPlace(queue, rng);
  return queue;
}

export type BreedQuota = {
  slug: string;
  target: number;
};

/** Per-breed exact targets for harvest loops. */
export function buildBreedQuotas(
  breeds: readonly BreedWeight[],
  total: number,
  boosts: Record<string, number> = {},
): BreedQuota[] {
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

/**
 * Exact photo-count quotas (e.g. 1–4 photos per pet) as a shuffled queue.
 */
export function buildShuffledCountQueue(
  options: readonly WeightedValue[],
  total: number,
  rng: () => number,
): number[] {
  const items = options.map((o) => ({
    slug: String(o.value),
    weight: o.weight,
  }));
  const counts = allocateByWeight(items, total);
  const queue: number[] = [];
  for (const opt of options) {
    const n = counts[String(opt.value)] ?? 0;
    for (let i = 0; i < n; i++) queue.push(opt.value);
  }
  shuffleInPlace(queue, rng);
  return queue;
}

export const DOG_PHOTO_TARGET = 36_000;

/** Default Pixabay harvest total (~55 photos × 20 cat breeds). */
export const CAT_PHOTO_TARGET = 1_100;

/** Same boosts used when seeding pets — domestic mixes dominate photo harvest too. */
export const CAT_PHOTO_WEIGHT_BOOSTS: Record<string, number> = {
  "domestic-shorthair": 4,
  "domestic-longhair": 3,
  "domestic-medium-hair": 3,
  "tabby-mix": 3,
  tuxedo: 2,
  calico: 2,
};
