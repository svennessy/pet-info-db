import { scoreCandid, sleep } from "./photoFetchUtils.mjs";

export async function fetchPixabayBatch(query, page, apiKey, { species = "dog" } = {}) {
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
  return (data.hits ?? [])
    .filter((row) => row.type === "photo")
    .map((row) => {
      const url = row.largeImageURL || row.webformatURL;
      if (!url) return null;
      return {
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
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.candidScore - a.candidScore);
}

export async function fetchPixabayCatBatch(query, page, apiKey) {
  return fetchPixabayBatch(query, page, apiKey, { species: "cat" });
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
        const batch = await fetchPixabayBatch(query, page, apiKey);
        if (batch.length === 0) break;
        for (const photo of batch) {
          if (collected >= needed) break;
          if (usedUrls.has(photo.imageUrl)) continue;
          usedUrls.add(photo.imageUrl);
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
