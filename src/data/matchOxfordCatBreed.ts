import type { CatBreed } from "./catBreedTypes";
import {
  OXFORD_CAT_CLASSES,
  type OxfordCatClass,
} from "./oxfordCatInstances";
import {
  OXFORD_CAT_FALLBACK_CLASS,
  OXFORD_CAT_SLUG_PROXY,
} from "./oxfordCatBreedProxies";

export function normalizeCatBreedLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function oxfordClassFromSlug(slug: string): string | null {
  const proxy = OXFORD_CAT_SLUG_PROXY[slug];
  if (proxy && OXFORD_CAT_CLASSES.includes(proxy as OxfordCatClass)) {
    return proxy;
  }
  return null;
}

function oxfordClassFromName(name: string): string | null {
  const normalized = normalizeCatBreedLabel(name);
  for (const cls of OXFORD_CAT_CLASSES) {
    const label = normalizeCatBreedLabel(cls.replace(/_/g, " "));
    if (normalized === label || normalized.includes(label) || label.includes(normalized)) {
      return cls;
    }
  }
  return null;
}

export function matchBreedToOxfordCatClass(
  breed: Pick<CatBreed, "id" | "name">,
): string {
  return (
    oxfordClassFromSlug(breed.id) ??
    oxfordClassFromName(breed.name) ??
    OXFORD_CAT_FALLBACK_CLASS
  );
}
