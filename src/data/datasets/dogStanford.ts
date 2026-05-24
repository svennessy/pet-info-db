import {
  existsSync,
  readdirSync,
  type Dirent,
} from "node:fs";
import { join } from "node:path";
import { DOG_BREEDS } from "../dogBreeds.js";
import {
  buildStanfordClassLookup,
  matchBreedToStanfordClass,
} from "../matchStanfordBreed.js";
import {
  instanceKeyForFilename,
  publicImagePath,
  stanfordLabelFromFolder,
} from "../stanfordDogInstances.js";
import type { DatasetBuildInfo, ImageSource } from "./types.js";
import { parseTagsFromTitle } from "./cat.js";

export interface DogStanfordImage {
  id: string;
  url: string;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
  stanfordClass: string;
  filename: string;
  source: ImageSource;
}

export interface DogStanfordMeta {
  id: string;
  imageId: string;
  tags: string[];
  mood: string | null;
  environment: string | null;
  titleRaw: string;
}

export interface DogStanfordPhotoInstance {
  instanceKey: string;
  stanfordClass: string;
  imageIds: string[];
  images: Array<{ filename: string; path: string }>;
}

export interface DogStanfordDataset extends DatasetBuildInfo {
  bucketSize: number;
  classCount: number;
  byClass: Record<string, string[]>;
  slugToClass: Record<string, string>;
  images: DogStanfordImage[];
  meta: DogStanfordMeta[];
  instances: DogStanfordPhotoInstance[];
}

export interface DogStanfordLegacyIndex {
  builtAt: string;
  bucketSize: number;
  classCount: number;
  instanceCount: number;
  imageCount: number;
  byClass: Record<string, string[]>;
  instances: Array<{
    instanceKey: string;
    stanfordClass: string;
    images: Array<{ filename: string; path: string }>;
  }>;
  slugToClass: Record<string, string>;
}

export const STANFORD_DATASET_SOURCE = "stanford-dogs";
export const STANFORD_BUCKET_SIZE = 4;

export function buildStanfordDatasetFromImagesDir(
  imagesDir: string,
  options?: { builtAt?: string; bucketSize?: number },
): DogStanfordDataset {
  if (!existsSync(imagesDir)) {
    throw new Error(`Missing Stanford Images directory: ${imagesDir}`);
  }

  const bucketSize = options?.bucketSize ?? STANFORD_BUCKET_SIZE;
  const classFolders = readdirSync(imagesDir, { withFileTypes: true })
    .filter((d: Dirent) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const byLabel = buildStanfordClassLookup(classFolders);
  const instanceMap = new Map<string, DogStanfordPhotoInstance>();
  const byClass: Record<string, string[]> = {};
  const images: DogStanfordImage[] = [];
  const meta: DogStanfordMeta[] = [];

  for (const classFolder of classFolders) {
    const classPath = join(imagesDir, classFolder);
    const files = readdirSync(classPath).filter((f) => /\.jpe?g$/i.test(f));
    byClass[classFolder] = [];
    const label = stanfordLabelFromFolder(classFolder);

    for (const filename of files) {
      const key = instanceKeyForFilename(classFolder, filename, bucketSize);
      const imageId = `${classFolder}/${filename}`;
      const url = publicImagePath(classFolder, filename);

      images.push({
        id: imageId,
        url,
        thumbnail: null,
        width: null,
        height: null,
        stanfordClass: classFolder,
        filename,
        source: "stanford",
      });

      const tags = parseTagsFromTitle(label);
      meta.push({
        id: `${imageId}-meta`,
        imageId,
        tags,
        mood: null,
        environment: null,
        titleRaw: label,
      });

      if (!instanceMap.has(key)) {
        instanceMap.set(key, {
          instanceKey: key,
          stanfordClass: classFolder,
          imageIds: [],
          images: [],
        });
        byClass[classFolder].push(key);
      }

      const inst = instanceMap.get(key)!;
      inst.imageIds.push(imageId);
      inst.images.push({ filename, path: url });
    }
  }

  for (const folder of classFolders) {
    byClass[folder] = [...new Set(byClass[folder])];
  }

  const instances = [...instanceMap.values()].filter((i) => i.images.length > 0);

  const slugToClass: Record<string, string> = {};
  for (const breed of DOG_BREEDS) {
    slugToClass[breed.id] = matchBreedToStanfordClass(
      breed,
      byLabel,
      classFolders,
    );
  }

  const imageCount = instances.reduce((s, i) => s + i.images.length, 0);

  return {
    builtAt: options?.builtAt ?? new Date().toISOString(),
    source: STANFORD_DATASET_SOURCE,
    imageCount,
    instanceCount: instances.length,
    bucketSize,
    classCount: classFolders.length,
    byClass,
    slugToClass,
    images,
    meta,
    instances,
  };
}

export function stanfordDatasetToLegacyIndex(
  dataset: DogStanfordDataset,
): DogStanfordLegacyIndex {
  return {
    builtAt: dataset.builtAt,
    bucketSize: dataset.bucketSize,
    classCount: dataset.classCount,
    instanceCount: dataset.instanceCount,
    imageCount: dataset.imageCount,
    byClass: dataset.byClass,
    slugToClass: dataset.slugToClass,
    instances: dataset.instances.map((inst) => ({
      instanceKey: inst.instanceKey,
      stanfordClass: inst.stanfordClass,
      images: inst.images,
    })),
  };
}
