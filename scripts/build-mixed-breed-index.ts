import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicMuttImagePath } from "../src/data/mixedBreedDogPhotos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data/mixed-breed-dogs/manifest.json");
const IMAGES_DIR = join(ROOT, "data/mixed-breed-dogs/images");
const OUT_PATH = join(ROOT, "src/data/mixedBreedDogsIndex.json");

/** Rebuild index from manifest (remote URLs) or local image folder. */
function main() {
  if (existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    const instances = manifest.map(
      (row: { id: string; imagePath: string; title?: string }) => ({
        instanceKey: row.id,
        images: [
          {
            filename: row.title ?? row.id,
            path: row.imagePath,
          },
        ],
      }),
    );
    writeFileSync(
      OUT_PATH,
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
    console.log(`Wrote ${instances.length} mutt URLs from manifest.`);
    return;
  }

  if (!existsSync(IMAGES_DIR)) {
    console.error(
      "Missing manifest and images. Run: npm run setup:mixed-breed-dogs",
    );
    process.exit(1);
  }

  const files = readdirSync(IMAGES_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort();

  const instances = files.map((filename) => {
    const stem = filename.replace(/\.jpe?g$/i, "");
    return {
      instanceKey: stem,
      images: [{ filename, path: publicMuttImagePath(filename) }],
    };
  });

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        source: "local",
        imageCount: files.length,
        instanceCount: instances.length,
        instances,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${files.length} local mutt images.`);
}

main();
