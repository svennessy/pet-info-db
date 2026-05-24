import { scoreCandid, sleep } from "./photoFetchUtils.mjs";

/** In-memory cache: one Pixabay HTTP request per (query, page, species). */
const pixabayCache = Object.create(null);

/** Canonical key for dedup (largeImageURL / webformatURL may differ only by query string). */
export function normalizePixabayImageUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function createPixabaySeenUrls(initialUrls = []) {
  const seen = new Set();
  for (const url of initialUrls) {
    const key = normalizePixabayImageUrl(url);
    if (key) seen.add(key);
  }
  return seen;
}

export function isPixabayUrlSeen(seen, url) {
  return seen.has(normalizePixabayImageUrl(url));
}

export function markPixabayUrlSeen(seen, url) {
  const key = normalizePixabayImageUrl(url);
  if (key) seen.add(key);
}

function filterBatchBySeen(batch, seenUrls) {
  if (!seenUrls?.size) return batch;
  return batch.filter((photo) => !isPixabayUrlSeen(seenUrls, photo.imageUrl));
}

function pixabayCacheKey(query, page, apiKey, species) {
  const q = species === "cat" ? query : `${query} dog`;
  return `${apiKey}|${species}|${page}|${q}`;
}

export function clearPixabayCache() {
  for (const key of Object.keys(pixabayCache)) {
    delete pixabayCache[key];
  }
}

export function getPixabayCacheSize() {
  return Object.keys(pixabayCache).length;
}

async function fetchPixabayBatchUncached(query, page, apiKey, { species = "dog" } = {}) {
  const q = species === "cat" ? query : `${query} dog`;
  const params = new URLSearchParams({
    key: apiKey,
    q,
    image_type: "photo",
    orientation: "horizontal",
    category: "animals",
    per_page: "50",
    page: String(page),
    safesearch: "true",
  });

  const response = await fetch(`https://pixabay.com/api/?${params}`);
  if (!response.ok) throw new Error(`Pixabay ${response.status}`);

  const data = await response.json();
  const pageSeen = new Set();
  const photos = [];

  for (const row of data.hits ?? []) {
    if (row.type !== "photo") continue;
    const url = row.largeImageURL || row.webformatURL;
    if (!url) continue;

    const key = normalizePixabayImageUrl(url);
    if (!key || pageSeen.has(key)) continue;
    pageSeen.add(key);

    photos.push({
        imageUrl: url,
        thumbnailUrl: row.previewURL ?? url,
        width: row.imageWidth ?? null,
        height: row.imageHeight ?? null,
        pixabayType: row.type ?? "photo",
        source: "pixabay",
        license: "Pixabay License",
        attribution: row.user ? `${row.user} via Pixabay` : "Pixabay",
        searchQuery: query,
        candidScore: scoreCandid({
          width: row.imageWidth,
          height: row.imageHeight,
          title: row.tags ?? "",
        }),
        title: row.tags ?? "",
      });
  }

  return photos.sort((a, b) => b.candidScore - a.candidScore);
}

export async function fetchPixabayBatch(query, page, apiKey, options = {}) {
  const { species = "dog", seenUrls } = options;
  const key = pixabayCacheKey(query, page, apiKey, species);
  let data = pixabayCache[key];
  if (!data) {
    data = await fetchPixabayBatchUncached(query, page, apiKey, options);
    pixabayCache[key] = data;
  }
  return filterBatchBySeen(data, seenUrls);
}

export async function fetchPixabayCatBatch(query, page, apiKey, seenUrls) {
  return fetchPixabayBatch(query, page, apiKey, { species: "cat", seenUrls });
}

export async function collectFromPixabay({  queries,
  needed,
  usedUrls,
  onPhoto,
  apiKey,
  delayMs = 500,
}) {
  if (!apiKey) return 0;
  let collected = 0;

  for (const query of queries) {
    if (collected >= needed) break;
    for (let page = 1; page <= 5 && collected < needed; page++) {
      try {
        const batch = await fetchPixabayBatch(query, page, apiKey, { seenUrls: usedUrls });
        if (batch.length === 0) break;
        for (const photo of batch) {
          if (collected >= needed) break;
          if (isPixabayUrlSeen(usedUrls, photo.imageUrl)) continue;
          markPixabayUrlSeen(usedUrls, photo.imageUrl);
          await Promise.resolve(onPhoto(photo));
          collected++;
        }
      } catch (error) {
        console.warn(`  Pixabay warn: ${error.message}`);
        break;
      }
      await sleep(delayMs);
    }
  }

  return collected;
}
