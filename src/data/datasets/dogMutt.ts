import { existsSync, readdirSync } from "node:fs";
import { publicMuttImagePath } from "../mixedBreedDogPhotos.js";
import type { DatasetBuildInfo, ImageLicense, ImageSource } from "./types.js";
import { parseTagsFromTitle } from "./cat.js";

export interface DogMuttImage {
  id: string;
  url: string;
  thumbnail: string | null;
  source: ImageSource;
  license: ImageLicense;
  searchQuery: string | null;
}

export interface DogMuttMeta {
  id: string;
  imageId: string;
  tags: string[];
  mood: string | null;
  environment: string | null;
  titleRaw: string;
}

export interface DogMuttPhotoInstance {
  instanceKey: string;
  imageIds: string[];
  images: Array<{ filename: string; path: string }>;
}

export interface DogMuttDataset extends DatasetBuildInfo {
  images: DogMuttImage[];
  meta: DogMuttMeta[];
  instances: DogMuttPhotoInstance[];
}

export interface DogMuttManifestRow {
  id: string;
  imagePath: string;
  sourceUrl: string;
  title: string;
  license: string;
  attribution: string | null;
  searchQuery: string;
  source?: ImageSource;
}

export interface DogMuttLegacyIndex {
  builtAt: string;
  source: string;
  imageCount: number;
  instanceCount: number;
  instances: Array<{
    instanceKey: string;
    images: Array<{ filename: string; path: string }>;
  }>;
}

export const MUTT_DATASET_SOURCE_WIKIMEDIA = "wikimedia-commons";
export const MUTT_DATASET_SOURCE_LOCAL = "local";

export function manifestRowToDogMuttImage(row: DogMuttManifestRow): DogMuttImage {
  return {
    id: row.id,
    url: row.imagePath,
    thumbnail: row.sourceUrl !== row.imagePath ? row.sourceUrl : null,
    source: row.source ?? "wikimedia",
    license: { name: row.license, attribution: row.attribution },
    searchQuery: row.searchQuery ?? null,
  };
}

export function manifestRowToDogMuttMeta(row: DogMuttManifestRow): DogMuttMeta {
  const titleRaw = row.title ?? row.id;
  const tags = parseTagsFromTitle(titleRaw);
  return {
    id: `${row.id}-meta`,
    imageId: row.id,
    tags,
    mood: null,
    environment: null,
    titleRaw,
  };
}

export const MUTT_PHOTOS_PER_INSTANCE = 4;

/** One Wikimedia URL per row; batch into instances for carousels. */
export function buildDogMuttDatasetFromManifest(
  rows: DogMuttManifestRow[],
  options?: { builtAt?: string; source?: string },
): DogMuttDataset {
  const images = rows.map(manifestRowToDogMuttImage);
  const meta = rows.map(manifestRowToDogMuttMeta);
  const instances: DogMuttPhotoInstance[] = [];

  for (let i = 0; i < rows.length; i += MUTT_PHOTOS_PER_INSTANCE) {
    const chunk = rows.slice(i, i + MUTT_PHOTOS_PER_INSTANCE);
    const bucketNum = Math.floor(i / MUTT_PHOTOS_PER_INSTANCE) + 1;
    const instanceKey = `mutt/${String(bucketNum).padStart(5, "0")}`;
    instances.push({
      instanceKey,
      imageIds: chunk.map((r) => r.id),
      images: chunk.map((row) => ({
        filename: row.title ?? row.id,
        path: row.imagePath,
      })),
    });
  }

  return {
    builtAt: options?.builtAt ?? new Date().toISOString(),
    source: options?.source ?? MUTT_DATASET_SOURCE_WIKIMEDIA,
    imageCount: images.length,
    instanceCount: instances.length,
    images,
    meta,
    instances,
  };
}

export function buildDogMuttDatasetFromLocalImages(
  imagesDir: string,
  options?: { builtAt?: string },
): DogMuttDataset {
  if (!existsSync(imagesDir)) {
    throw new Error(`Missing mutt images directory: ${imagesDir}`);
  }

  const files = readdirSync(imagesDir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort();

  const rows: DogMuttManifestRow[] = files.map((filename) => {
    const stem = filename.replace(/\.jpe?g$/i, "");
    const path = publicMuttImagePath(filename);
    return {
      id: stem,
      imagePath: path,
      sourceUrl: path,
      title: filename,
      license: "local",
      attribution: null,
      searchQuery: "",
      source: "local",
    };
  });

  return buildDogMuttDatasetFromManifest(rows, {
    builtAt: options?.builtAt,
    source: MUTT_DATASET_SOURCE_LOCAL,
  });
}

export function muttDatasetToLegacyIndex(
  dataset: DogMuttDataset,
): DogMuttLegacyIndex {
  return {
    builtAt: dataset.builtAt,
    source: dataset.source,
    imageCount: dataset.imageCount,
    instanceCount: dataset.instanceCount,
    instances: dataset.instances.map((inst) => ({
      instanceKey: inst.instanceKey,
      images: inst.images,
    })),
  };
}
