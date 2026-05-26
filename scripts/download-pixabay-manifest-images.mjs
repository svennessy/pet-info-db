/**
 * Download Pixabay images from cat/other manifests to local disk and rewrite
 * manifest imagePath to Supabase-friendly relative paths.
 *
 * Usage:
 *   node scripts/download-pixabay-manifest-images.mjs           # cats + other
 *   node scripts/download-pixabay-manifest-images.mjs --cats-only
 *   node scripts/download-pixabay-manifest-images.mjs --other-only
 *
 * Run right after dataset:cat:fetch / dataset:other:fetch (Pixabay /get/ URLs expire).
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  localPixabayImagePath,
  PIXABAY_STORAGE_PREFIXES,
  publicPixabayImagePath,
} from "./lib/pixabayAssetPath.mjs";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS_DIR, "..");
const CONCURRENCY = Number(process.env.DOWNLOAD_CONCURRENCY) || 3;
const MAX_RETRIES = Number(process.env.DOWNLOAD_MAX_RETRIES) || 5;
const USER_AGENT =
  "Mozilla/5.0 (compatible; pet-info-db/1.0; +https://github.com/svennessy/pet-info-db)";

const ALL_MANIFESTS = [
  {
    label: "cats",
    prefix: PIXABAY_STORAGE_PREFIXES.cat,
    path: join(ROOT, "data/candid-cats/manifest.json"),
  },
  {
    label: "other",
    prefix: PIXABAY_STORAGE_PREFIXES.other,
    path: join(ROOT, "data/other-pet-photos/manifest.json"),
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    catsOnly: args.includes("--cats-only"),
    otherOnly: args.includes("--other-only"),
  };
}

function downloadUrlForRow(row) {
  if (row.imagePath?.startsWith("http")) return row.imagePath;
  if (row.sourceUrl?.startsWith("http")) return row.sourceUrl;
  return null;
}

async function downloadImage(url, dest) {
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(500 * 2 ** attempt);
    }
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://pixabay.com/",
      },
    });
    if (response.status === 429 || response.status === 503) {
      lastError = new Error(`HTTP ${response.status}`);
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.slice(0, 80).toString("utf8");
    if (text.includes("invalid") || text.includes("expired")) {
      throw new Error(
        "Pixabay URL expired — re-run dataset:cat:fetch / dataset:other:fetch first",
      );
    }
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("image") && bytes.length < 10_000) {
      throw new Error(`not an image (${type}, ${bytes.length} bytes)`);
    }
    if (bytes.length < 1000) {
      throw new Error(`too small (${bytes.length} bytes)`);
    }
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, bytes);
    return;
  }
  throw lastError ?? new Error("download failed");
}

async function processManifest({ label, prefix, path }) {
  const rows = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${label} manifest empty or missing: ${path}`);
  }

  console.log(`\n${label}: ${rows.length} manifest rows`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  const queue = [...rows];

  async function worker() {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row?.id) continue;
      const url = downloadUrlForRow(row);
      if (!url) continue;

      const dest = localPixabayImagePath(ROOT, prefix, row.id);
      const publicPath = publicPixabayImagePath(prefix, row.id);

      try {
        await access(dest);
        row.imagePath = publicPath;
        skipped++;
        continue;
      } catch {
        // download below
      }

      try {
        await downloadImage(url, dest);
        row.imagePath = publicPath;
        if (row.sourceUrl?.startsWith("http")) {
          // keep original sourceUrl for attribution
        } else {
          row.sourceUrl = publicPath;
        }
        done++;
        if ((done + skipped) % 200 === 0) {
          console.log(`  ${label}: ${done + skipped} / ${rows.length}`);
        }
      } catch (error) {
        failed++;
        if (failed <= 20) {
          console.warn(
            `  ${label} ${row.id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker()),
  );

  await writeFile(path, JSON.stringify(rows, null, 2));
  console.log(
    `${label}: ${done} downloaded, ${skipped} already on disk, ${failed} failed`,
  );

  return { done, skipped, failed };
}

async function main() {
  const { catsOnly, otherOnly } = parseArgs();
  if (catsOnly && otherOnly) {
    throw new Error("Use only one of --cats-only or --other-only");
  }

  let manifests = ALL_MANIFESTS;
  if (catsOnly) {
    manifests = ALL_MANIFESTS.filter((m) => m.label === "cats");
  } else if (otherOnly) {
    manifests = ALL_MANIFESTS.filter((m) => m.label === "other");
  }

  console.log(
    "Note: Pixabay /get/ links expire. Fetch fresh manifests before downloading.\n",
  );

  const totals = { done: 0, skipped: 0, failed: 0 };
  for (const manifest of manifests) {
    const result = await processManifest(manifest);
    totals.done += result.done;
    totals.skipped += result.skipped;
    totals.failed += result.failed;
  }

  console.log(
    `\nTotal: ${totals.done} downloaded, ${totals.skipped} skipped, ${totals.failed} failed.`,
  );
  console.log(
    "Next: npm run dataset:cat:process && npm run dataset:other:process",
  );
  console.log("      npm run assets:upload:supabase");
  console.log("      npm run dataset:cat:seed && npm run dataset:other:seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
