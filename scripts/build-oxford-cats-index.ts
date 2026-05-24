import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAT_BREEDS } from "../src/data/catBreeds.js";
import { matchBreedToOxfordCatClass } from "../src/data/matchOxfordCatBreed.js";
import {
  OXFORD_CAT_CLASSES,
  oxfordCatInstanceKey,
  parseOxfordCatFilename,
  publicOxfordCatImagePath,
} from "../src/data/oxfordCatInstances.js";
import { getTopCatBreedsForPets } from "../src/data/topCatBreeds.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "data/oxford-cats/images");
const OUT_PATH = join(ROOT, "src/data/oxfordCatsIndex.json");

function main() {
  if (!existsSync(IMAGES_DIR)) {
    console.error(
      "Missing data/oxford-cats/images. Run: npm run setup:oxford-cats",
    );
    process.exit(1);
  }

  const files = readdirSync(IMAGES_DIR).filter((f) => /\.jpe?g$/i.test(f));
  const instances = new Map<
    string,
    {
      instanceKey: string;
      oxfordClass: string;
      images: Array<{ filename: string; path: string }>;
    }
  >();
  const byClass: Record<string, string[]> = {};

  for (const cls of OXFORD_CAT_CLASSES) {
    byClass[cls] = [];
  }

  for (const filename of files) {
    const parsed = parseOxfordCatFilename(filename);
    if (!parsed) continue;

    const key = oxfordCatInstanceKey(parsed.breedClass, parsed.instanceId);
    if (!instances.has(key)) {
      instances.set(key, {
        instanceKey: key,
        oxfordClass: parsed.breedClass,
        images: [],
      });
      byClass[parsed.breedClass].push(key);
    }
    instances.get(key)!.images.push({
      filename,
      path: publicOxfordCatImagePath(filename),
    });
  }

  for (const cls of OXFORD_CAT_CLASSES) {
    byClass[cls] = [...new Set(byClass[cls])];
  }

  const instanceList = [...instances.values()].filter((i) => i.images.length > 0);

  const topSlugs = new Set(getTopCatBreedsForPets().map((b) => b.slug));
  const slugToClass: Record<string, string> = {};
  const classUsage = new Map<string, number>();

  for (const breed of CAT_BREEDS) {
    if (!topSlugs.has(breed.id)) continue;
    const cls = matchBreedToOxfordCatClass(breed);
    slugToClass[breed.id] = cls;
    classUsage.set(cls, (classUsage.get(cls) ?? 0) + 1);
  }

  const payload = {
    builtAt: new Date().toISOString(),
    classCount: OXFORD_CAT_CLASSES.length,
    instanceCount: instanceList.length,
    imageCount: instanceList.reduce((s, i) => s + i.images.length, 0),
    byClass,
    instances: instanceList,
    slugToClass,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload));

  console.log(
    `Wrote ${payload.imageCount} cat images in ${payload.instanceCount} instances across ${payload.classCount} Oxford classes.`,
  );
  console.log(
    `Mapped ${Object.keys(slugToClass).length} top cat breeds to ${classUsage.size} Oxford classes.`,
  );
}

main();
