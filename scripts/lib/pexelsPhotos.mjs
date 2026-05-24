import { pickImageUrl, scoreCandid, sleep } from "./photoFetchUtils.mjs";

export async function fetchPexelsBatch(query, page, apiKey) {
  const params = new URLSearchParams({
    query: `${query} dog candid`,
    per_page: "40",
    page: String(page),
    orientation: "landscape",
  });

  const response = await fetch(
    `https://api.pexels.com/v1/search?${params}`,
    { headers: { Authorization: apiKey } },
  );

  if (!response.ok) {
    throw new Error(`Pexels ${response.status}`);
  }

  const data = await response.json();
  return (data.photos ?? [])
    .map((row) => {
      const url = row.src?.medium || row.src?.large;
      if (!url) return null;
      return {
        imageUrl: url,
        thumbnailUrl: row.src?.small ?? url,
        width: row.width ?? null,
        height: row.height ?? null,
        source: "pexels",
        license: "Pexels License",
        attribution: row.photographer
          ? `${row.photographer} via Pexels`
          : "Pexels",
        searchQuery: query,
        candidScore: scoreCandid({
          width: row.width,
          height: row.height,
          title: row.alt ?? "",
        }),
        title: row.alt ?? "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.candidScore - a.candidScore);
}

export async function collectFromPexels({
  queries,
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
        const batch = await fetchPexelsBatch(query, page, apiKey);
        if (batch.length === 0) break;
        for (const photo of batch) {
          if (collected >= needed) break;
          if (usedUrls.has(photo.imageUrl)) continue;
          usedUrls.add(photo.imageUrl);
          await Promise.resolve(onPhoto(photo));
          collected++;
        }
      } catch (error) {
        console.warn(`  Pexels warn: ${error.message}`);
        break;
      }
      await sleep(delayMs);
    }
  }

  return collected;
}
