import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OTHER_PET_PHOTO_HARVEST } from "./lib/otherPetPhotoFilter.mjs";
import { fetchPixabayCatBatch } from "./lib/pixabayPhotos.mjs";
import { sleep } from "./lib/photoFetchUtils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
dotenv.config({ path: join(ROOT, ".env") });
const DATA_DIR = join(ROOT, "data/other-pet-photos");
const MANIFEST_PATH = join(DATA_DIR, "manifest.json");
const INDEX_PATH = join(ROOT, "src/data/otherPetPhotosIndex.json");

const PHOTOS_PER_INSTANCE = 4;
const MIN_WIDTH = 400;

function parseArgs() {
  let perKind = 45;
  let fresh = false;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--fresh") fresh = true;
    else if (arg === "--per-kind" && process.argv[i + 1]) {
      perKind = Math.max(10, Number.parseInt(process.argv[++i], 10));
    }
  }
  return { perKind, fresh };
}

function getPixabayKey() {
  return (
    process.env.PIXABAY_API_KEY?.trim() ||
    process.env.PIXABAY_KEY?.trim() ||
    ""
  );
}

function writeIndex(manifest) {
  const byKind = {};
  const instances = [];
  const bySlug = {};

  for (const row of manifest) {
    (bySlug[row.kindSlug] ??= []).push(row);
  }

  for (const [slug, rows] of Object.entries(bySlug)) {
    byKind[slug] = [];
    for (let i = 0; i < rows.length; i += PHOTOS_PER_INSTANCE) {
      const chunk = rows.slice(i, i + PHOTOS_PER_INSTANCE);
      const bucketNum = Math.floor(i / PHOTOS_PER_INSTANCE) + 1;
      const instanceKey = `${slug}/${String(bucketNum).padStart(4, "0")}`;
      byKind[slug].push(instanceKey);
      instances.push({
        instanceKey,
        kindSlug: slug,
        images: chunk.map((row) => ({
          filename: row.id,
          path: row.imagePath,
        })),
      });
    }
  }

  writeFileSync(
    INDEX_PATH,
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "pixabay-birds-bunnies",
        imageCount: manifest.length,
        instanceCount: instances.length,
        byKind,
        instances,
      },
      null,
      2,
    ),
  );
}

function saveProgress(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  writeIndex(manifest);
}

async function harvestKind(kindDef, target, apiKey, usedUrls, manifest, nextIdRef) {
  let collected = manifest.filter((m) => m.kindSlug === kindDef.slug).length;
  console.log(`${kindDef.slug}: ${collected}/${target}`);

  for (const query of kindDef.queries) {
    if (collected >= target) break;

    for (let page = 1; page <= 6 && collected < target; page++) {
      let batch;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          batch = await fetchPixabayCatBatch(query, page, apiKey);
          break;
        } catch (error) {
          if (String(error.message).includes("429") && attempt < 2) {
            await sleep(3000);
            continue;
          }
          batch = null;
          break;
        }
      }
      if (!batch?.length) break;

      for (const photo of batch) {
        if (collected >= target) break;
        const imagePath = photo.imageUrl;
        if (!imagePath || usedUrls.has(imagePath)) continue;
        if ((photo.width ?? 0) > 0 && photo.width < MIN_WIDTH) continue;
        if (!kindDef.match(photo.title, photo.pixabayType)) continue;

        usedUrls.add(imagePath);
        manifest.push({
          id: `${kindDef.slug}-${String(nextIdRef.value).padStart(5, "0")}`,
          kindSlug: kindDef.slug,
          otherKind: kindDef.kind,
          imagePath,
          sourceUrl: imagePath,
          title: photo.title,
          license: photo.license,
          attribution: photo.attribution,
          searchQuery: query,
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
    throw new Error("Missing PIXABAY_KEY in .env");
  }

  const { perKind, fresh } = parseArgs();
  mkdirSync(DATA_DIR, { recursive: true });

  const usedUrls = new Set();
  const manifest = [];
  const nextIdRef = { value: 1 };

  if (!fresh && existsSync(MANIFEST_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
      for (const row of existing) {
        if (row.source === "pixabay") {
          usedUrls.add(row.imagePath);
          manifest.push(row);
        }
      }
      nextIdRef.value = manifest.length + 1;
    } catch {
      /* fresh */
    }
  }

  console.log("Fetching bird & bunny photos from Pixabay…");

  for (const kindDef of OTHER_PET_PHOTO_HARVEST) {
    const have = manifest.filter((m) => m.kindSlug === kindDef.slug).length;
    if (have >= perKind) continue;
    await harvestKind(kindDef, perKind, apiKey, usedUrls, manifest, nextIdRef);
    saveProgress(manifest);
  }

  saveProgress(manifest);
  console.log(`\nDone. ${manifest.length} photos → ${INDEX_PATH}`);
  console.log("Run: npm run db:seed:other-photos");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
