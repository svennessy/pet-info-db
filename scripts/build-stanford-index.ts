import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOG_BREEDS } from "../src/data/dogBreeds.js";
import {
  buildStanfordClassLookup,
  matchBreedToStanfordClass,
} from "../src/data/matchStanfordBreed.js";
import { instanceKeyForFilename } from "../src/data/stanfordDogInstances.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "data/stanford-dogs/Images");
const OUT_PATH = join(ROOT, "src/data/stanfordDogsIndex.json");
const BUCKET_SIZE = 4;

function main() {
  if (!existsSync(IMAGES_DIR)) {
    console.error(
      "Missing data/stanford-dogs/Images. Run: npm run setup:stanford-dogs",
    );
    process.exit(1);
  }

  const classFolders = readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const byLabel = buildStanfordClassLookup(classFolders);
  const instances = new Map<
    string,
    {
      instanceKey: string;
      stanfordClass: string;
      images: Array<{ filename: string; path: string }>;
    }
  >();
  const byClass: Record<string, string[]> = {};

  for (const classFolder of classFolders) {
    const classPath = join(IMAGES_DIR, classFolder);
    const files = readdirSync(classPath).filter((f) => /\.jpe?g$/i.test(f));
    byClass[classFolder] = [];

    for (const filename of files) {
      const key = instanceKeyForFilename(classFolder, filename, BUCKET_SIZE);
      if (!instances.has(key)) {
        instances.set(key, {
          instanceKey: key,
          stanfordClass: classFolder,
          images: [],
        });
        byClass[classFolder].push(key);
      }
      instances.get(key)!.images.push({
        filename,
        path: `/stanford-dogs/Images/${classFolder}/${filename}`,
      });
    }
  }

  for (const folder of classFolders) {
    byClass[folder] = [...new Set(byClass[folder])];
  }

  const instanceList = [...instances.values()].filter((i) => i.images.length > 0);

  const slugToClass: Record<string, string> = {};
  const classUsage = new Map<string, number>();

  for (const breed of DOG_BREEDS) {
    const folder = matchBreedToStanfordClass(breed, byLabel, classFolders);
    slugToClass[breed.id] = folder;
    classUsage.set(folder, (classUsage.get(folder) ?? 0) + 1);
  }

  const payload = {
    builtAt: new Date().toISOString(),
    bucketSize: BUCKET_SIZE,
    classCount: classFolders.length,
    instanceCount: instanceList.length,
    imageCount: instanceList.reduce((s, i) => s + i.images.length, 0),
    byClass,
    instances: instanceList,
    slugToClass,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload));

  console.log(
    `Wrote ${payload.imageCount} images in ${payload.instanceCount} instances across ${payload.classCount} Stanford classes.`,
  );
  console.log(
    `Mapped ${Object.keys(slugToClass).length} dog breeds to ${classUsage.size} Stanford classes.`,
  );

  const golden = "n02099601-golden_retriever";
  const goldenSlugs = Object.entries(slugToClass)
    .filter(([slug, folder]) => folder === golden && slug !== "golden-retriever")
    .map(([slug]) => slug);
  if (goldenSlugs.length > 0) {
    console.log(
      `Warning: ${goldenSlugs.length} breeds still use golden retriever proxy (expected mostly doodles/mixes).`,
    );
  }

  const top = [...classUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([folder, count]) => `${folder.split("-").pop()}: ${count}`);
  console.log(`Top mapped classes: ${top.join(", ")}`);
}

main();
