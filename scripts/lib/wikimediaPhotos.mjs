import { scoreCandid, sleep } from "./photoFetchUtils.mjs";

const API = "https://commons.wikimedia.org/w/api.php";

export async function fetchWikimediaBatch(query, offset = 0) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "50",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "900",
    origin: "*",
  });

  if (offset > 0) params.set("gsroffset", String(offset));

  const response = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": "react-ts-pet-db/1.0 (educational; contact local dev)" },
  });

  if (!response.ok) {
    throw new Error(`Wikimedia ${response.status} for "${query}"`);
  }

  const data = await response.json();
  const pages = data.query?.pages ?? {};
  const photos = [];

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;

    const title = page.title?.replace("File:", "") ?? "";
    const license =
      info.extmetadata?.LicenseShortName?.value?.replace(/<[^>]+>/g, "") ??
      "CC";

    photos.push({
      imageUrl: info.url,
      thumbnailUrl: info.thumburl ?? info.url,
      width: info.width ?? null,
      height: info.height ?? null,
      source: "wikimedia",
      license,
      attribution: `${title} via Wikimedia Commons (${license})`,
      searchQuery: query,
      candidScore: scoreCandid({ width: info.width, height: info.height, title }),
      title,
    });
  }

  return {
    photos: photos.sort((a, b) => b.candidScore - a.candidScore),
    continueOffset: data.continue?.gsroffset ?? null,
  };
}

export async function collectFromWikimedia({
  queries,
  needed,
  usedUrls,
  onPhoto,
  delayMs = 400,
}) {
  let collected = 0;

  for (const query of queries) {
    if (collected >= needed) break;

    let offset = 0;
    for (let round = 0; round < 15 && collected < needed; round++) {
      try {
        const { photos, continueOffset } = await fetchWikimediaBatch(query, offset);
        if (photos.length === 0) break;

        for (const photo of photos) {
          if (collected >= needed) break;
          if (usedUrls.has(photo.imageUrl)) continue;
          usedUrls.add(photo.imageUrl);
          await Promise.resolve(onPhoto(photo));
          collected++;
        }

        if (continueOffset == null) break;
        offset = continueOffset;
      } catch (error) {
        console.warn(`  Wikimedia warn: ${error.message}`);
        break;
      }

      await sleep(delayMs);
    }
  }

  return collected;
}
