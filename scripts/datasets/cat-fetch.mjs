/**
 * Layer 1 — Fetch: download candidate cat photos into data/candid-cats/manifest.json.
 * Does not build indexes; run cat-process after fetch.
 */
import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBreedQuotas,
  CAT_PHOTO_TARGET,
  CAT_PHOTO_WEIGHT_BOOSTS,
} from "../lib/allocateByWeight.mjs";
import {
  buildCatPixabayQueries,
  isPixabayCatPhoto,
  TOP_CAT_BREEDS_FOR_PHOTOS,
} from "../lib/catPhotoFilter.mjs";
import {
  normalizePixabayTags,
  tagsMatchPixabayCatQuery,
} from "../lib/pixabayQueryMatch.mjs";
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
const FALLBACK_SLUG = "domestic-shorthair";

function parseArgs() {
  let target = CAT_PHOTO_TARGET;
  let flatPerBreed = null;
  let fresh = false;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--fresh") fresh = true;
    else if (arg === "--target" && process.argv[i + 1]) {
      target = Math.max(100, Number.parseInt(process.argv[++i], 10));
    } else if (arg === "--per-breed" && process.argv[i + 1]) {
      flatPerBreed = Math.max(15, Number.parseInt(process.argv[++i], 10));
    }
  }
  return { target, flatPerBreed, fresh };
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

function breedBySlug(slug) {
  return TOP_CAT_BREEDS_FOR_PHOTOS.find((b) => b.slug === slug);
}

function countForBreed(manifest, slug) {
  return manifest.filter((m) => m.breedSlug === slug).length;
}

async function fetchBatchWithRetry(query, page, apiKey, usedUrls) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchPixabayCatBatch(query, page, apiKey, usedUrls);
    } catch (error) {
      if (String(error.message).includes("429") && attempt < 2) {
        console.warn("    rate limited, waiting 3s…");
        await sleep(3000);
        continue;
      }
      console.warn(`  skip "${query}" p${page}: ${error.message}`);
      return null;
    }
  }
  return null;
}

function acceptPhoto(photo, query, strictBreedMatch) {
  if (!isPixabayCatPhoto(photo.title, photo.pixabayType)) return false;
  if (strictBreedMatch) {
    return tagsMatchPixabayCatQuery(photo.title, query);
  }
  return normalizePixabayTags(photo.title).includes("cat");
}

async function harvestWithQueries(
  labelBreed,
  queryBreed,
  target,
  apiKey,
  usedUrls,
  manifest,
  nextIdRef,
  strictBreedMatch,
) {
  let collected = countForBreed(manifest, labelBreed.slug);
  if (collected >= target) return collected;

  const queries = buildCatPixabayQueries(queryBreed);

  for (const query of queries) {
    if (collected >= target) break;

    for (let page = 1; page <= 6 && collected < target; page++) {
      const batch = await fetchBatchWithRetry(query, page, apiKey, usedUrls);
      if (!batch?.length) break;

      for (const photo of batch) {
        if (collected >= target) break;

        const imagePath = photo.imageUrl;
        if (!imagePath || isPixabayUrlSeen(usedUrls, imagePath)) continue;
        if ((photo.width ?? 0) > 0 && photo.width < MIN_WIDTH) continue;
        if (!acceptPhoto(photo, query, strictBreedMatch)) continue;

        markPixabayUrlSeen(usedUrls, imagePath);
        manifest.push({
          id: `${labelBreed.slug}-${String(nextIdRef.value).padStart(5, "0")}`,
          breedSlug: labelBreed.slug,
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

async function harvestBreed(breed, target, apiKey, usedUrls, manifest, nextIdRef) {
  let collected = countForBreed(manifest, breed.slug);
  console.log(`${breed.slug}: ${collected}/${target}`);

  if (collected >= target) return collected;

  collected = await harvestWithQueries(
    breed,
    breed,
    target,
    apiKey,
    usedUrls,
    manifest,
    nextIdRef,
    true,
  );

  if (collected >= target || breed.slug === FALLBACK_SLUG) {
    return collected;
  }

  const fallbackBreed = breedBySlug(FALLBACK_SLUG);
  if (!fallbackBreed) return collected;

  console.warn(
    `  ${breed.slug}: topping up ${target - collected} via ${FALLBACK_SLUG} queries`,
  );

  return harvestWithQueries(
    breed,
    fallbackBreed,
    target,
    apiKey,
    usedUrls,
    manifest,
    nextIdRef,
    false,
  );
}

function buildHarvestQuotas(target, flatPerBreed) {
  if (flatPerBreed != null) {
    return TOP_CAT_BREEDS_FOR_PHOTOS.map((breed) => ({
      breed,
      target: flatPerBreed,
    }));
  }

  const quotas = buildBreedQuotas(
    TOP_CAT_BREEDS_FOR_PHOTOS.map((b) => ({ slug: b.slug, weight: b.weight })),
    target,
    CAT_PHOTO_WEIGHT_BOOSTS,
  );

  return quotas.map(({ slug, target: breedTarget }) => ({
    breed: breedBySlug(slug),
    target: breedTarget,
  }));
}

async function main() {
  const apiKey = getPixabayKey();
  if (!apiKey) {
    throw new Error(
      "Missing PIXABAY_KEY (or PIXABAY_API_KEY) in .env — get a free key at https://pixabay.com/api/docs/",
    );
  }

  const { target, flatPerBreed, fresh } = parseArgs();
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

  const breedTargets = buildHarvestQuotas(target, flatPerBreed);
  const quotaTotal = breedTargets.reduce((sum, row) => sum + row.target, 0);

  console.log(
    `Fetching breed-matched cat photos from Pixabay (${TOP_CAT_BREEDS_FOR_PHOTOS.length} breeds, ${quotaTotal} photo quota)…`,
  );
  console.log(
    "Quotas:",
    Object.fromEntries(
      breedTargets.map(({ breed, target: t }) => [breed.slug, t]),
    ),
  );

  for (const { breed, target: breedTarget } of breedTargets) {
    if (!breed || breedTarget <= 0) continue;

    const got = await harvestBreed(
      breed,
      breedTarget,
      apiKey,
      usedUrls,
      manifest,
      nextIdRef,
    );
    if (got < breedTarget) {
      console.warn(`  ⚠ ${breed.slug}: only ${got}/${breedTarget} photos`);
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
