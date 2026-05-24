import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../../..");

/** Raw rows from the fetch layer (one file per dataset). */
export const CAT_MANIFEST_PATH = join(ROOT, "data/candid-cats/manifest.json");

/** Normalized dataset (images + meta + instances). */
export const CAT_DATASET_PATH = join(ROOT, "data/candid-cats/dataset.json");

/** Legacy index consumed by the app and seed layer (instances + byBreed). */
export const CAT_LEGACY_INDEX_PATH = join(ROOT, "src/data/candidCatsIndex.json");

export const OTHER_MANIFEST_PATH = join(ROOT, "data/other-pet-photos/manifest.json");
export const OTHER_DATASET_PATH = join(ROOT, "data/other-pet-photos/dataset.json");
export const OTHER_LEGACY_INDEX_PATH = join(
  ROOT,
  "src/data/otherPetPhotosIndex.json",
);

export const STANFORD_IMAGES_DIR = join(ROOT, "data/stanford-dogs/Images");
export const STANFORD_DATASET_PATH = join(ROOT, "data/stanford-dogs/dataset.json");
export const STANFORD_LEGACY_INDEX_PATH = join(
  ROOT,
  "src/data/stanfordDogsIndex.json",
);

export const MUTT_MANIFEST_PATH = join(ROOT, "data/mixed-breed-dogs/manifest.json");
export const MUTT_IMAGES_DIR = join(ROOT, "data/mixed-breed-dogs/images");
export const MUTT_DATASET_PATH = join(ROOT, "data/mixed-breed-dogs/dataset.json");
export const MUTT_LEGACY_INDEX_PATH = join(
  ROOT,
  "src/data/mixedBreedDogsIndex.json",
);
