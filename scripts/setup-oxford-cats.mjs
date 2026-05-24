import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/oxford-cats");
const IMAGES_DIR = join(DATA_DIR, "images");
const TAR_PATH = join(DATA_DIR, "images.tar.gz");

const DOWNLOAD_URL =
  "https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz";

async function download(url, dest) {
  console.log(`Downloading ${url} …`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  if (!response.body) throw new Error("No response body");
  await pipeline(response.body, createWriteStream(dest));
  console.log(`Saved to ${dest}`);
}

function extractTarGz(tarPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  console.log("Extracting (this may take a few minutes)…");
  execSync(`tar -xzf "${tarPath}" -C "${destDir}"`, { stdio: "inherit" });
}

async function main() {
  if (existsSync(IMAGES_DIR) && existsSync(join(IMAGES_DIR, "Abyssinian_1.jpg"))) {
    console.log("Oxford cat images already exist.");
    return;
  }

  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(TAR_PATH)) {
    await download(DOWNLOAD_URL, TAR_PATH);
  }

  extractTarGz(TAR_PATH, DATA_DIR);

  if (!existsSync(join(IMAGES_DIR, "Abyssinian_1.jpg"))) {
    throw new Error(
      `Expected cat images in ${IMAGES_DIR}. Check data/oxford-cats layout.`,
    );
  }

  console.log("Oxford cats ready. Run: npm run build:oxford-cats-index");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
