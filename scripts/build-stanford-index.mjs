import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "data/stanford-dogs/Images");
const OUT_DIR = join(ROOT, "src/data");
const BUCKET_SIZE = 4;

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function instanceKeyForFilename(classFolder, filename) {
  const match = filename.match(/_(\d+)\.jpe?g$/i);
  if (!match) return `${classFolder}/misc`;
  const imageNum = Number.parseInt(match[1], 10);
  return `${classFolder}/${Math.floor(imageNum / BUCKET_SIZE)}`;
}

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

  const byLabel = new Map();
  for (const folder of classFolders) {
    const dash = folder.indexOf("-");
    const label =
      dash === -1
        ? folder
        : folder
            .slice(dash + 1)
            .replace(/_/g, " ")
            .toLowerCase();
    byLabel.set(normalize(label), folder);
  }

  const instances = new Map();
  const byClass = {};

  for (const classFolder of classFolders) {
    const classPath = join(IMAGES_DIR, classFolder);
    const files = readdirSync(classPath).filter((f) =>
      /\.jpe?g$/i.test(f),
    );
    byClass[classFolder] = [];

    for (const filename of files) {
      const key = instanceKeyForFilename(classFolder, filename);
      if (!instances.has(key)) {
        instances.set(key, {
          instanceKey: key,
          stanfordClass: classFolder,
          images: [],
        });
        byClass[classFolder].push(key);
      }
      instances.get(key).images.push({
        filename,
        path: `/stanford-dogs/Images/${classFolder}/${filename}`,
      });
    }
  }

  const instanceList = [...instances.values()].filter(
    (i) => i.images.length > 0,
  );

  for (const folder of classFolders) {
    byClass[folder] = [...new Set(byClass[folder])];
  }

  const dogBreedsSource = readFileSync(
    join(ROOT, "src/data/dogBreeds.ts"),
    "utf8",
  );
  const breedSlugs = [...dogBreedsSource.matchAll(/id: "([^"]+)"/g)].map(
    (m) => m[1],
  );
  const breedNames = [...dogBreedsSource.matchAll(/name: "([^"]+)"/g)].map(
    (m) => m[1],
  );

  const slugToClass = {};
  for (let i = 0; i < breedSlugs.length; i++) {
    const slug = breedSlugs[i];
    const name = breedNames[i] ?? slug;
    slugToClass[slug] = matchBreed(name, slug, byLabel, classFolders);
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

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "stanfordDogsIndex.json"),
    JSON.stringify(payload),
  );
  console.log(
    `Wrote ${payload.imageCount} images in ${payload.instanceCount} instances across ${payload.classCount} breeds.`,
  );
}

function matchBreed(name, slug, byLabel, classFolders) {
  const overrides = JSON.parse(
    readFileSync(join(ROOT, "src/data/stanfordSlugOverrides.json"), "utf8"),
  );
  if (overrides[slug] && classFolders.includes(overrides[slug])) {
    return overrides[slug];
  }

  const normalizedName = normalize(name);
  const direct = byLabel.get(normalizedName);
  if (direct) return direct;

  for (const [label, folder] of byLabel) {
    if (normalizedName.includes(label) || label.includes(normalizedName)) {
      return folder;
    }
  }

  let bestFolder = classFolders[0];
  let bestScore = 0;
  const tokens = normalizedName.split(" ").filter(Boolean);
  for (const folder of classFolders) {
    const dash = folder.indexOf("-");
    const label = dash === -1 ? folder : folder.slice(dash + 1);
    const folderTokens = label.toLowerCase().replace(/_/g, " ").split(" ");
    const score = tokens.filter((t) => folderTokens.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestFolder = folder;
    }
  }
  return bestFolder;
}

main();
