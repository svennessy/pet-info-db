import type { DatasetBuildInfo, ImageLicense, ImageSource } from "./types.js";

export interface OtherPetImage {
  id: string;
  url: string;
  thumbnail: string | null;
  kindSlug: string;
  otherKind: string;
  source: ImageSource;
  license: ImageLicense;
  searchQuery: string | null;
}

export interface OtherPetMeta {
  id: string;
  imageId: string;
  tags: string[];
  mood: string | null;
  environment: string | null;
  titleRaw: string;
}

export interface OtherPetPhotoInstance {
  instanceKey: string;
  kindSlug: string;
  imageIds: string[];
  images: Array<{ filename: string; path: string }>;
}

export interface OtherPetDataset extends DatasetBuildInfo {
  byKind: Record<string, string[]>;
  images: OtherPetImage[];
  meta: OtherPetMeta[];
  instances: OtherPetPhotoInstance[];
}

export interface OtherPetManifestRow {
  id: string;
  kindSlug: string;
  otherKind: string;
  imagePath: string;
  sourceUrl: string;
  title: string;
  license: string;
  attribution: string | null;
  searchQuery: string;
  source: ImageSource;
}

export interface OtherPetLegacyIndex {
  builtAt: string;
  source: string;
  imageCount: number;
  instanceCount: number;
  byKind: Record<string, string[]>;
  instances: Array<{
    instanceKey: string;
    kindSlug: string;
    images: Array<{ filename: string; path: string }>;
  }>;
}

export const OTHER_PHOTOS_PER_INSTANCE = 4;
export const OTHER_DATASET_SOURCE = "pixabay-birds-bunnies";

import { parseTagsFromTitle } from "./cat.js";

export function manifestRowToOtherPetImage(row: OtherPetManifestRow): OtherPetImage {
  return {
    id: row.id,
    url: row.imagePath,
    thumbnail: row.sourceUrl !== row.imagePath ? row.sourceUrl : null,
    kindSlug: row.kindSlug,
    otherKind: row.otherKind,
    source: row.source,
    license: { name: row.license, attribution: row.attribution },
    searchQuery: row.searchQuery ?? null,
  };
}

export function manifestRowToOtherPetMeta(row: OtherPetManifestRow): OtherPetMeta {
  const tags = parseTagsFromTitle(row.title);
  return {
    id: `${row.id}-meta`,
    imageId: row.id,
    tags,
    mood: null,
    environment: null,
    titleRaw: row.title,
  };
}

export function buildOtherPetDatasetFromManifest(
  rows: OtherPetManifestRow[],
  options?: { builtAt?: string; source?: string },
): OtherPetDataset {
  const images = rows.map(manifestRowToOtherPetImage);
  const meta = rows.map(manifestRowToOtherPetMeta);

  const byPool: Record<string, OtherPetManifestRow[]> = {};
  for (const row of rows) {
    const poolKey = `${row.kindSlug}::${row.searchQuery ?? "generic"}`;
    (byPool[poolKey] ??= []).push(row);
  }

  const byKind: Record<string, string[]> = {};
  const instances: OtherPetPhotoInstance[] = [];

  for (const [poolKey, poolRows] of Object.entries(byPool)) {
    const kindSlug = poolKey.split("::")[0];
    if (!byKind[kindSlug]) byKind[kindSlug] = [];

    for (let i = 0; i < poolRows.length; i += OTHER_PHOTOS_PER_INSTANCE) {
      const chunk = poolRows.slice(i, i + OTHER_PHOTOS_PER_INSTANCE);
      const bucketNum = Math.floor(i / OTHER_PHOTOS_PER_INSTANCE) + 1;
      const querySlug = poolKey.replace(/[^a-z0-9]+/gi, "-").slice(0, 48);
      const instanceKey = `${kindSlug}/${querySlug}/${String(bucketNum).padStart(4, "0")}`;
      byKind[kindSlug].push(instanceKey);
      instances.push({
        instanceKey,
        kindSlug,
        imageIds: chunk.map((r) => r.id),
        images: chunk.map((row) => ({
          filename: row.id,
          path: row.imagePath,
        })),
      });
    }
  }

  return {
    builtAt: options?.builtAt ?? new Date().toISOString(),
    source: options?.source ?? OTHER_DATASET_SOURCE,
    imageCount: images.length,
    instanceCount: instances.length,
    byKind,
    images,
    meta,
    instances,
  };
}

export function otherPetDatasetToLegacyIndex(
  dataset: OtherPetDataset,
): OtherPetLegacyIndex {
  return {
    builtAt: dataset.builtAt,
    source: dataset.source,
    imageCount: dataset.imageCount,
    instanceCount: dataset.instanceCount,
    byKind: dataset.byKind,
    instances: dataset.instances.map((inst) => ({
      instanceKey: inst.instanceKey,
      kindSlug: inst.kindSlug,
      images: inst.images,
    })),
  };
}
