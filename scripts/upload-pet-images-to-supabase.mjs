/**
 * Upload local pet image folders to Supabase Storage (public bucket).
 *
 * Prerequisites (Supabase dashboard → Storage):
 *   1. Create a public bucket named pet-assets (or set SUPABASE_STORAGE_BUCKET).
 *   2. Project Settings → API → copy service_role key (never commit it).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run assets:upload:supabase
 *
 * Then set on Render:
 *   PUBLIC_ASSET_BASE_URL=https://YOUR_REF.supabase.co/storage/v1/object/public/pet-assets
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "pet-assets";
const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY) || 8;

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env",
  );
  process.exit(1);
}

/** Local data dir → URL prefix stored in pet_photos.imagePath */
const DATASETS = [
  { localDir: "data/stanford-dogs", urlPrefix: "stanford-dogs" },
  { localDir: "data/mixed-breed-dogs", urlPrefix: "mixed-breed-dogs" },
  { localDir: "data/oxford-cats", urlPrefix: "oxford-cats" },
];

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
]);

function contentTypeFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function* walkFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

async function collectUploads() {
  const jobs = [];
  for (const { localDir, urlPrefix } of DATASETS) {
    const abs = join(ROOT, localDir);
    for await (const filePath of walkFiles(abs)) {
      const rel = relative(abs, filePath).replace(/\\/g, "/");
      const storagePath = `${urlPrefix}/${rel}`;
      jobs.push({ filePath, storagePath });
    }
  }
  return jobs;
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function uploadOne({ filePath, storagePath }) {
  const body = await readFile(filePath);
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, body, {
    contentType: contentTypeFor(filePath),
    upsert: true,
  });
  if (error) {
    throw new Error(`${storagePath}: ${error.message}`);
  }
}

async function runPool(jobs) {
  let done = 0;
  let failed = 0;
  const queue = [...jobs];

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      try {
        await uploadOne(job);
        done++;
        if (done % 200 === 0 || done === jobs.length) {
          console.log(`  uploaded ${done} / ${jobs.length}`);
        }
      } catch (err) {
        failed++;
        console.error(err instanceof Error ? err.message : err);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
  );
  return { done, failed };
}

async function main() {
  console.log(`Supabase: ${supabaseUrl}`);
  console.log(`Bucket: ${BUCKET} (public)`);
  console.log("Scanning local image files…");

  const jobs = await collectUploads();
  if (jobs.length === 0) {
    console.error("No images found under data/stanford-dogs, mixed-breed-dogs, or oxford-cats.");
    process.exit(1);
  }

  console.log(`Uploading ${jobs.length} files…`);
  const { done, failed } = await runPool(jobs);

  const publicBase = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;
  console.log(`\nDone. ${done} uploaded, ${failed} failed.`);
  console.log(`\nSet on Render (and optionally .env for local prod testing):`);
  console.log(`PUBLIC_ASSET_BASE_URL=${publicBase}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
