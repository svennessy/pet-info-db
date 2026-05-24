/** Oxford-IIIT Pet Dataset cat breed folder names (filename prefix). */
export const OXFORD_CAT_CLASSES = [
  "Abyssinian",
  "Bengal",
  "Birman",
  "Bombay",
  "British_Shorthair",
  "Egyptian_Mau",
  "Maine_Coon",
  "Persian",
  "Ragdoll",
  "Russian_Blue",
  "Siamese",
  "Sphynx",
] as const;

export type OxfordCatClass = (typeof OXFORD_CAT_CLASSES)[number];

/** Parse `British_Shorthair_101.jpg` → breed + instance id. */
export function parseOxfordCatFilename(filename: string): {
  breedClass: OxfordCatClass;
  instanceId: string;
} | null {
  const match = filename.match(/^(.+)_(\d+)\.jpe?g$/i);
  if (!match) return null;
  const breedClass = match[1] as OxfordCatClass;
  if (!OXFORD_CAT_CLASSES.includes(breedClass)) return null;
  return { breedClass, instanceId: match[2] };
}

export function oxfordCatInstanceKey(breedClass: string, instanceId: string): string {
  return `${breedClass}/${instanceId}`;
}

export function publicOxfordCatImagePath(filename: string): string {
  return `/oxford-cats/images/${filename}`;
}

/** 1–4 photos per pet (same weights as dogs). */
export const PET_PHOTO_COUNT_WEIGHTS: readonly { count: number; weight: number }[] =
  [
    { count: 1, weight: 18 },
    { count: 2, weight: 32 },
    { count: 3, weight: 32 },
    { count: 4, weight: 18 },
  ];
