/** Slugs assigned mutt photos (Wikimedia), not Stanford purebreds. */
export function isMixedBreedDogSlug(slug: string): boolean {
  return slug === "mixed-breed" || slug.endsWith("-mix");
}

export function publicMuttImagePath(filename: string): string {
  return `/mixed-breed-dogs/images/${filename}`;
}

export type MixedBreedDogsIndex = {
  builtAt: string;
  imageCount: number;
  instanceCount: number;
  instances: Array<{
    instanceKey: string;
    images: Array<{ filename: string; path: string }>;
  }>;
};
