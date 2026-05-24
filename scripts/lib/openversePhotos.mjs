import { pickImageUrl, pickThumbnail, scoreCandid, sleep } from "./photoFetchUtils.mjs";

const API = "https://api.openverse.org/v1/images/";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const clientId = process.env.OPENVERSE_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENVERSE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch("https://api.openverse.org/v1/auth_tokens/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) return null;

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedToken;
}

export async function fetchOpenverseBatch(query, page, pageSize = 50) {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    page_size: String(pageSize),
    mature: "false",
  });

  const headers = {
    "User-Agent": "react-ts-pet-db/1.0 (educational project)",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`Openverse ${response.status} for "${query}"`);
  }

  const data = await response.json();
  const results = data.results ?? [];

  return results
    .map((row) => {
      const url = pickImageUrl(row);
      if (!url) return null;
      return {
        imageUrl: url,
        thumbnailUrl: pickThumbnail(row, url),
        width: row.width ?? null,
        height: row.height ?? null,
        source: "openverse",
        license: row.license ?? "unknown",
        attribution: row.creator
          ? `${row.creator} (${row.license ?? "CC"}) via Openverse`
          : `Openverse (${row.license ?? "CC"})`,
        searchQuery: query,
        candidScore: scoreCandid({
          width: row.width,
          height: row.height,
          title: row.title ?? "",
        }),
        title: row.title ?? "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.candidScore - a.candidScore);
}

export async function collectFromOpenverse({
  queries,
  needed,
  usedUrls,
  onPhoto,
  delayMs = 400,
}) {
  let collected = 0;

  for (const query of queries) {
    if (collected >= needed) break;

    for (let page = 1; page <= 12 && collected < needed; page++) {
      try {
        const batch = await fetchOpenverseBatch(query, page);
        if (batch.length === 0) break;

        for (const photo of batch) {
          if (collected >= needed) break;
          if (usedUrls.has(photo.imageUrl)) continue;
          usedUrls.add(photo.imageUrl);
          await Promise.resolve(onPhoto(photo));
          collected++;
        }
      } catch (error) {
        console.warn(`  Openverse warn: ${error.message}`);
        break;
      }

      await sleep(delayMs);
    }
  }

  return collected;
}
