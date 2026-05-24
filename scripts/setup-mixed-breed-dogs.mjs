import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWikimediaBatch } from "./lib/wikimediaPhotos.mjs";
import {
  isMuttPhotoTitle,
  MUTT_WIKIMEDIA_QUERIES,
} from "./lib/muttPhotoFilter.mjs";
import { sleep } from "./lib/photoFetchUtils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/mixed-breed-dogs");
const MANIFEST_PATH = join(DATA_DIR, "manifest.json");
const INDEX_PATH = join(ROOT, "src/data/mixedBreedDogsIndex.json");

function parseArgs() {
  let target = 2500;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--target" && process.argv[i + 1]) {
      target = Math.max(50, Number.parseInt(process.argv[++i], 10));
    } else if (/^\d+$/.test(arg)) {
      target = Math.max(50, Number.parseInt(arg, 10));
    }
  }
  return { target };
}

function writeIndex(manifest) {
  const instances = manifest.map((row, i) => ({
    instanceKey: row.id ?? `mutt-${String(i + 1).padStart(5, "0")}`,
    images: [
      {
        filename: row.title ?? row.id,
        path: row.imagePath,
      },
    ],
  }));

  writeFileSync(
    INDEX_PATH,
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "wikimedia-commons",
        imageCount: instances.length,
        instanceCount: instances.length,
        instances,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const { target } = parseArgs();
  mkdirSync(DATA_DIR, { recursive: true });

  const usedUrls = new Set();
  const manifest = [];

  if (existsSync(MANIFEST_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
      for (const row of existing) {
        usedUrls.add(row.imagePath);
        manifest.push(row);
      }
      console.log(`Resuming with ${manifest.length} mutt photo URLs.`);
    } catch {
      /* fresh start */
    }
  }

  let nextId = manifest.length + 1;

  for (const query of MUTT_WIKIMEDIA_QUERIES) {
    if (manifest.length >= target) break;

    console.log(`\nWikimedia: "${query}"`);
    let offset = 0;

    for (let round = 0; round < 40 && manifest.length < target; round++) {
      let batch;
      try {
        batch = await fetchWikimediaBatch(query, offset);
      } catch (error) {
        if (String(error.message).includes("429")) {
          console.warn(`  API rate limited, waiting 30s…`);
          await sleep(30_000);
          continue;
        }
        throw error;
      }

      const { photos, continueOffset } = batch;
      if (photos.length === 0) break;

      for (const photo of photos) {
        if (manifest.length >= target) break;

        const imagePath = photo.thumbnailUrl ?? photo.imageUrl;
        if (!imagePath || usedUrls.has(imagePath)) continue;
        if (!isMuttPhotoTitle(photo.title ?? "")) continue;
        if ((photo.width ?? 0) > 0 && photo.width < 400) continue;

        const id = `mutt-${String(nextId).padStart(5, "0")}`;
        usedUrls.add(imagePath);
        manifest.push({
          id,
          imagePath,
          sourceUrl: photo.imageUrl,
          title: photo.title,
          license: photo.license,
          attribution: photo.attribution,
          searchQuery: query,
        });
        nextId++;

        if (manifest.length % 50 === 0) {
          console.log(`  ${manifest.length} / ${target}`);
          writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
          writeIndex(manifest);
        }
      }

      if (continueOffset == null) break;
      offset = continueOffset;
      await sleep(1500);
    }
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  writeIndex(manifest);
  console.log(`\nDone. ${manifest.length} mutt photo URLs → ${INDEX_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
