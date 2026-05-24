/** Slug → Oxford cat class when no exact match in Oxford-IIIT (12 breeds). */
export const OXFORD_CAT_SLUG_PROXY: Record<string, string> = {
  "domestic-shorthair": "British_Shorthair",
  "domestic-longhair": "Persian",
  "domestic-medium-hair": "Maine_Coon",
  "tabby-mix": "British_Shorthair",
  tuxedo: "Bombay",
  calico: "Persian",
  torbie: "Abyssinian",
  "american-shorthair": "British_Shorthair",
  "scottish-fold": "British_Shorthair",
  "exotic-shorthair": "Persian",
  "devon-rex": "Sphynx",
  siamese: "Siamese",
  "maine-coon": "Maine_Coon",
  ragdoll: "Ragdoll",
  persian: "Persian",
  bengal: "Bengal",
  "russian-blue": "Russian_Blue",
  "british-shorthair": "British_Shorthair",
  sphynx: "Sphynx",
  abyssinian: "Abyssinian",
};

export const OXFORD_CAT_FALLBACK_CLASS = "British_Shorthair";
