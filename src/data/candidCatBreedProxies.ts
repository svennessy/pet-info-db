/** Close relatives only — never fall back to generic domestic for purebreds. */
export const CANDID_CAT_BREED_PROXIES: Record<string, readonly string[]> = {
  "domestic-longhair": ["domestic-shorthair"],
  "domestic-medium-hair": ["domestic-shorthair"],
  "tabby-mix": ["domestic-shorthair"],
  torbie: ["calico", "tabby-mix"],
  "exotic-shorthair": ["persian"],
  "devon-rex": ["sphynx"],
  "scottish-fold": ["british-shorthair"],
};

/** Only domestic-pattern breeds may use this pool. */
export const CANDID_CAT_FALLBACK_SLUG = "domestic-shorthair";

export const DOMESTIC_CAT_SLUGS = new Set([
  "domestic-shorthair",
  "domestic-longhair",
  "domestic-medium-hair",
  "tabby-mix",
  "tuxedo",
  "calico",
  "torbie",
]);
