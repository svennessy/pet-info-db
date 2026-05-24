import type { DatasetBuildInfo, ImageLicense, ImageSource } from "./types.js";

/** One photo asset (stable id + URLs). */
export interface CatImage {
  id: string;
  url: string;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
  breedSlug: string;
  source: ImageSource;
  license: ImageLicense;
  searchQuery: string | null;
  candidScore: number | null;
}

/** Descriptive metadata linked to a {@link CatImage}. */
export interface CatMeta {
  id: string;
  imageId: string;
  tags: string[];
  mood: string | null;
  environment: string | null;
  titleRaw: string;
}

/** Group of images assigned together during pet seeding. */
export interface CatPhotoInstance {
  instanceKey: string;
  breedSlug: string;
  imageIds: string[];
  /** Legacy seed format (filename + public path). */
  images: Array<{ filename: string; path: string }>;
}

export interface CatDataset extends DatasetBuildInfo {
  byBreed: Record<string, string[]>;
  images: CatImage[];
  meta: CatMeta[];
  instances: CatPhotoInstance[];
}

/** Row shape written by {@link scripts/datasets/cat-fetch.mjs}. */
export interface CatManifestRow {
  id: string;
  breedSlug: string;
  imagePath: string;
  sourceUrl: string;
  title: string;
  license: string;
  attribution: string | null;
  searchQuery: string;
  candidScore: number;
  source: ImageSource;
}

/** Legacy index shape (existing `candidCatsIndex.json`). */
export interface CatLegacyIndex {
  builtAt: string;
  source: string;
  imageCount: number;
  instanceCount: number;
  byBreed: Record<string, string[]>;
  instances: Array<{
    instanceKey: string;
    breedSlug: string;
    images: Array<{ filename: string; path: string }>;
  }>;
}

export const CAT_PHOTOS_PER_INSTANCE = 4;
export const CAT_DATASET_SOURCE = "pixabay-candid";

const MOOD_KEYWORDS = [
  "cute",
  "playful",
  "sleepy",
  "curious",
  "calm",
  "relaxed",
  "happy",
  "angry",
  "scared",
] as const;

const ENVIRONMENT_KEYWORDS = [
  "indoor",
  "outdoor",
  "nature",
  "garden",
  "home",
  "park",
  "forest",
  "snow",
  "studio",
] as const;

export function parseTagsFromTitle(titleRaw: string): string[] {
  return titleRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function pickKeyword(
  tags: string[],
  keywords: readonly string[],
): string | null {
  for (const tag of tags) {
    if (keywords.includes(tag as (typeof keywords)[number])) return tag;
  }
  for (const tag of tags) {
    const hit = keywords.find((k) => tag.includes(k));
    if (hit) return hit;
  }
  return null;
}

export function manifestRowToCatImage(row: CatManifestRow): CatImage {
  return {
    id: row.id,
    url: row.imagePath,
    thumbnail: row.sourceUrl !== row.imagePath ? row.sourceUrl : null,
    width: null,
    height: null,
    breedSlug: row.breedSlug,
    source: row.source,
    license: { name: row.license, attribution: row.attribution },
    searchQuery: row.searchQuery ?? null,
    candidScore: row.candidScore ?? null,
  };
}

export function manifestRowToCatMeta(row: CatManifestRow): CatMeta {
  const tags = parseTagsFromTitle(row.title);
  return {
    id: `${row.id}-meta`,
    imageId: row.id,
    tags,
    mood: pickKeyword(tags, MOOD_KEYWORDS),
    environment: pickKeyword(tags, ENVIRONMENT_KEYWORDS),
    titleRaw: row.title,
  };
}

export function buildCatDatasetFromManifest(
  rows: CatManifestRow[],
  options?: { builtAt?: string; source?: string },
): CatDataset {
  const images = rows.map(manifestRowToCatImage);
  const meta = rows.map(manifestRowToCatMeta);
  const imageById = new Map(images.map((img) => [img.id, img]));

  const bySlug: Record<string, CatManifestRow[]> = {};
  for (const row of rows) {
    (bySlug[row.breedSlug] ??= []).push(row);
  }

  const byBreed: Record<string, string[]> = {};
  const instances: CatPhotoInstance[] = [];

  for (const [slug, slugRows] of Object.entries(bySlug)) {
    byBreed[slug] = [];
    // Batch up to 4 photos per instance — all share breedSlug (same type for carousels).
    for (let i = 0; i < slugRows.length; i += CAT_PHOTOS_PER_INSTANCE) {
      const chunk = slugRows.slice(i, i + CAT_PHOTOS_PER_INSTANCE);
      const bucketNum = Math.floor(i / CAT_PHOTOS_PER_INSTANCE) + 1;
      const instanceKey = `${slug}/${String(bucketNum).padStart(4, "0")}`;
      byBreed[slug].push(instanceKey);
      instances.push({
        instanceKey,
        breedSlug: slug,
        imageIds: chunk.map((r) => r.id),
        images: chunk.map((row) => {
          const img = imageById.get(row.id)!;
          return { filename: img.id, path: img.url };
        }),
      });
    }
  }

  return {
    builtAt: options?.builtAt ?? new Date().toISOString(),
    source: options?.source ?? CAT_DATASET_SOURCE,
    imageCount: images.length,
    instanceCount: instances.length,
    byBreed,
    images,
    meta,
    instances,
  };
}

export function catDatasetToLegacyIndex(dataset: CatDataset): CatLegacyIndex {
  return {
    builtAt: dataset.builtAt,
    source: dataset.source,
    imageCount: dataset.imageCount,
    instanceCount: dataset.instanceCount,
    byBreed: dataset.byBreed,
    instances: dataset.instances.map((inst) => ({
      instanceKey: inst.instanceKey,
      breedSlug: inst.breedSlug,
      images: inst.images,
    })),
  };
}

export function legacyIndexToSeedInstances(
  index: CatLegacyIndex,
): Array<{
  instanceKey: string;
  breedSlug: string;
  images: Array<{ filename: string; path: string }>;
}> {
  return index.instances;
}
