import { scoreCandid, sleep } from "./photoFetchUtils.mjs";

/**
 * Flickr CC-licensed photos (API key required).
 * License ids: 4=CC BY, 5=CC BY-SA, 6=CC BY-ND, 9=CC0, 10=Public Domain
 */
export async function fetchFlickrBatch(query, page, apiKey) {
  const params = new URLSearchParams({
    method: "flickr.photos.search",
    api_key: apiKey,
    text: `${query} dog`,
    license: "4,5,6,9,10",
    content_type: 1,
    media: "photos",
    per_page: "50",
    page: String(page),
    format: "json",
    nojsoncallback: "1",
    extras: "url_m,url_l,license,owner_name,o_dims",
  });

  const response = await fetch(
    `https://api.flickr.com/services/rest/?${params}`,
  );
  if (!response.ok) throw new Error(`Flickr ${response.status}`);

  const data = await response.json();
  if (data.stat !== "ok") {
    throw new Error(data.message ?? "Flickr API error");
  }

  return (data.photos?.photo ?? [])
    .map((row) => {
      const url = row.url_m || row.url_l;
      if (!url) return null;
      return {
        imageUrl: url,
        thumbnailUrl: row.url_m ?? url,
        width: row.width_o ? Number(row.width_o) : null,
        height: row.height_o ? Number(row.height_o) : null,
        source: "flickr",
        license: `Flickr license ${row.license ?? "CC"}`,
        attribution: row.ownername
          ? `${row.ownername} via Flickr (CC)`
          : "Flickr (CC)",
        searchQuery: query,
        candidScore: scoreCandid({
          width: row.width_o ? Number(row.width_o) : 800,
          height: row.height_o ? Number(row.height_o) : 600,
          title: row.title ?? "",
        }),
        title: row.title ?? "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.candidScore - a.candidScore);
}

export async function collectFromFlickr({
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
    for (let page = 1; page <= 8 && collected < needed; page++) {
      try {
        const batch = await fetchFlickrBatch(query, page, apiKey);
        if (batch.length === 0) break;
        for (const photo of batch) {
          if (collected >= needed) break;
          if (usedUrls.has(photo.imageUrl)) continue;
          usedUrls.add(photo.imageUrl);
          await Promise.resolve(onPhoto(photo));
          collected++;
        }
      } catch (error) {
        console.warn(`  Flickr warn: ${error.message}`);
        break;
      }
      await sleep(delayMs);
    }
  }

  return collected;
}
