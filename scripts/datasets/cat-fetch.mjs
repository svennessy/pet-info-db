/**
 * Layer 1 — Fetch: download candidate cat photos into data/candid-cats/manifest.json.
 * Does not build indexes; run cat-process after fetch.
 */
import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCatPixabayQueries,
  isPixabayCatPhoto,
  TOP_CAT_BREEDS_FOR_PHOTOS,
} from "../lib/catPhotoFilter.mjs";
import { tagsMatchPixabayCatQuery } from "../lib/pixabayQueryMatch.mjs";
import {
  clearPixabayCache,
  createPixabaySeenUrls,
  fetchPixabayCatBatch,
  isPixabayUrlSeen,
  markPixabayUrlSeen,
} from "../lib/pixabayPhotos.mjs";
import { sleep } from "../lib/photoFetchUtils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
dotenv.config({ path: join(ROOT, ".env") });
const DATA_DIR = join(ROOT, "data/candid-cats");
const MANIFEST_PATH = join(DATA_DIR, "manifest.json");

const MIN_WIDTH = 400;

function parseArgs() {
  let perBreed = 55;
  let fresh = false;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--fresh") fresh = true;
    else if (arg === "--per-breed" && process.argv[i + 1]) {
      perBreed = Math.max(15, Number.parseInt(process.argv[++i], 10));
    }
  }
  return { perBreed, fresh };
}

function getPixabayKey() {
  return (
    process.env.PIXABAY_API_KEY?.trim() ||
    process.env.PIXABAY_KEY?.trim() ||
    ""
  );
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function harvestBreed(breed, target, apiKey, usedUrls, manifest, nextIdRef) {
  const queries = buildCatPixabayQueries(breed);
  let collected = manifest.filter((m) => m.breedSlug === breed.slug).length;

  console.log(`${breed.slug}: ${collected}/${target}`);

  for (const query of queries) {
    if (collected >= target) break;

    for (let page = 1; page <= 6 && collected < target; page++) {
      let batch;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          batch = await fetchPixabayCatBatch(query, page, apiKey, usedUrls);
          break;
        } catch (error) {
          if (String(error.message).includes("429") && attempt < 2) {
            console.warn("    rate limited, waiting 3s…");
            await sleep(3000);
            continue;
          }
          console.warn(`  skip "${query}" p${page}: ${error.message}`);
          batch = null;
          break;
        }
      }
      if (!batch?.length) break;

      for (const photo of batch) {
        if (collected >= target) break;

        const imagePath = photo.imageUrl;
        if (!imagePath || isPixabayUrlSeen(usedUrls, imagePath)) continue;
        if ((photo.width ?? 0) > 0 && photo.width < MIN_WIDTH) continue;
        if (!isPixabayCatPhoto(photo.title, photo.pixabayType)) continue;
        // Breed locked to this harvest + query (not inferred from loose tags).
        if (!tagsMatchPixabayCatQuery(photo.title, query)) continue;

        markPixabayUrlSeen(usedUrls, imagePath);
        manifest.push({
          id: `${breed.slug}-${String(nextIdRef.value).padStart(5, "0")}`,
          breedSlug: breed.slug,
          imagePath,
          sourceUrl: imagePath,
          title: photo.title,
          license: photo.license,
          attribution: photo.attribution,
          searchQuery: query,
          candidScore: photo.candidScore,
          source: "pixabay",
        });
        nextIdRef.value++;
        collected++;
      }

      await sleep(500);
    }
  }

  return collected;
}

async function main() {
  const apiKey = getPixabayKey();
  if (!apiKey) {
    throw new Error(
      "Missing PIXABAY_KEY (or PIXABAY_API_KEY) in .env — get a free key at https://pixabay.com/api/docs/",
    );
  }

  const { perBreed, fresh } = parseArgs();
  if (fresh) clearPixabayCache();
  mkdirSync(DATA_DIR, { recursive: true });

  const usedUrls = createPixabaySeenUrls();
  const manifest = [];
  const nextIdRef = { value: 1 };

  if (!fresh && existsSync(MANIFEST_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
      for (const row of existing) {
        if (row.source === "pixabay") {
          markPixabayUrlSeen(usedUrls, row.imagePath);
          manifest.push(row);
        }
      }
      nextIdRef.value = manifest.length + 1;
      if (manifest.length > 0) {
        console.log(`Resuming with ${manifest.length} Pixabay photos.`);
      }
    } catch {
      /* fresh */
    }
  }

  console.log(
    `Fetching breed-matched cat photos from Pixabay (${TOP_CAT_BREEDS_FOR_PHOTOS.length} breeds)…`,
  );

  for (const breed of TOP_CAT_BREEDS_FOR_PHOTOS) {
    const have = manifest.filter((m) => m.breedSlug === breed.slug).length;
    if (have >= perBreed) continue;

    const got = await harvestBreed(
      breed,
      perBreed,
      apiKey,
      usedUrls,
      manifest,
      nextIdRef,
    );
    if (got < perBreed) {
      console.warn(`  ⚠ ${breed.slug}: only ${got}/${perBreed} breed-matched photos`);
    }
    saveManifest(manifest);
  }

  saveManifest(manifest);

  const byBreed = {};
  for (const row of manifest) {
    byBreed[row.breedSlug] = (byBreed[row.breedSlug] ?? 0) + 1;
  }

  console.log(`\nDone. ${manifest.length} photos → ${MANIFEST_PATH}`);
  console.log("By breed:", byBreed);
  console.log("Next: npm run dataset:cat:process");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
