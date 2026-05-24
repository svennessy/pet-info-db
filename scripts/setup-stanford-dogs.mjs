import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data/stanford-dogs");
const IMAGES_DIR = join(DATA_DIR, "Images");
const TAR_PATH = join(DATA_DIR, "images.tar");

const DOWNLOAD_URL =
  "http://vision.stanford.edu/aditya86/ImageNetDogs/images.tar";

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

function extractTar(tarPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  console.log("Extracting (this may take a few minutes)…");
  if (process.platform === "win32") {
    execSync(`tar -xf "${tarPath}" -C "${destDir}"`, { stdio: "inherit" });
  } else {
    execSync(`tar -xf "${tarPath}" -C "${destDir}"`, { stdio: "inherit" });
  }
}

async function main() {
  if (existsSync(IMAGES_DIR)) {
    console.log("Stanford Dogs Images folder already exists.");
    return;
  }

  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(TAR_PATH)) {
    await download(DOWNLOAD_URL, TAR_PATH);
  }

  extractTar(TAR_PATH, DATA_DIR);

  if (!existsSync(IMAGES_DIR)) {
    const nested = join(DATA_DIR, "images/Images");
    if (existsSync(nested)) {
      console.log("Found nested images/Images — use that path or reorganize.");
    }
    throw new Error(
      `Expected ${IMAGES_DIR} after extract. Check data/stanford-dogs layout.`,
    );
  }

  console.log("Stanford Dogs ready. Run: npm run build:stanford-index");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
