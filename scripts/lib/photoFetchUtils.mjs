/** Shared helpers for license-free dog photo harvesting. */

export const CANDID_QUERY_SUFFIXES = [
  "smartphone photo",
  "phone picture",
  "backyard",
  "candid",
  "snap",
  "selfie",
  "home pet",
  "family dog",
];

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/**
 * Prefer smaller, casual-looking shots over studio/show photos.
 */
export function scoreCandid({ width, height, title = "" }) {
  let score = 0;
  const w = width ?? 1000;
  const t = title.toLowerCase();

  if (w >= 320 && w <= 1400) score += 4;
  else if (w <= 2200) score += 2;
  else if (w > 3200) score -= 3;

  if (/phone|snap|candid|backyard|selfie|iphone|android|blurry|grainy/i.test(t)) {
    score += 3;
  }
  if (
    /studio|show dog|show cat|cat show|champion|pedigree|professional|portrait session|kennel club|cfa|tica/i.test(
      t,
    )
  ) {
    score -= 4;
  }
  if (/midjourney|dall.?e|stable diffusion|ai generated|ai art/i.test(t)) {
    score -= 6;
  }

  if (height && width) {
    const ratio = width / height;
    if (ratio > 0.55 && ratio < 1.85) score += 1;
  }

  return score;
}

export function buildSearchQueries(breedName, group) {
  const base = breedName.replace(/\s*\([^)]*\)/g, "").trim();
  const queries = new Set([
    `${base} dog`,
    `dog ${base}`,
    `${base} pet dog`,
  ]);

  if (group) {
    queries.add(`${group.replace(/_/g, " ")} dog ${base}`);
  }

  for (const suffix of CANDID_QUERY_SUFFIXES) {
    queries.add(`${base} dog ${suffix}`);
  }

  return [...queries];
}

export function buildCatSearchQueries(breedName, group, extraQueries = []) {
  const base = breedName.replace(/\s*\([^)]*\)/g, "").trim();
  const queries = new Set([
    `${base} cat`,
    `cat ${base}`,
    `${base} pet cat`,
    `${base} kitten`,
  ]);

  if (group) {
    queries.add(`${group.replace(/_/g, " ")} cat ${base}`);
  }

  for (const suffix of CANDID_QUERY_SUFFIXES) {
    queries.add(`${base} cat ${suffix}`);
  }

  for (const q of extraQueries) {
    queries.add(q);
  }

  return [...queries];
}

export function pickImageUrl(result) {
  return (
    result.url ||
    result.imageUrl ||
    result.image_url ||
    result.largeImageURL ||
    result.webformatURL ||
    null
  );
}

export function pickThumbnail(result, fallback) {
  return (
    result.thumbnail ||
    result.thumbnailUrl ||
    result.previewURL ||
    result.thumbUrl ||
    fallback
  );
}
