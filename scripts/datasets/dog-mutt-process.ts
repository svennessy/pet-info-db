/**
 * Layer 2 — Process: mutt manifest (or local images/) → dataset + legacy index.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildDogMuttDatasetFromLocalImages,
  buildDogMuttDatasetFromManifest,
  muttDatasetToLegacyIndex,
  type DogMuttManifestRow,
} from "../../src/data/datasets/dogMutt.js";
import {
  MUTT_DATASET_PATH,
  MUTT_IMAGES_DIR,
  MUTT_LEGACY_INDEX_PATH,
  MUTT_MANIFEST_PATH,
} from "../../src/data/datasets/paths.js";

function main() {
  let dataset;

  if (existsSync(MUTT_MANIFEST_PATH)) {
    const rows = JSON.parse(
      readFileSync(MUTT_MANIFEST_PATH, "utf8"),
    ) as DogMuttManifestRow[];
    if (rows.length === 0) {
      throw new Error("Mutt manifest is empty.");
    }
    dataset = buildDogMuttDatasetFromManifest(rows);
    console.log(`Built from manifest (${rows.length} URLs).`);
  } else if (existsSync(MUTT_IMAGES_DIR)) {
    dataset = buildDogMuttDatasetFromLocalImages(MUTT_IMAGES_DIR);
    console.log(`Built from local images in ${MUTT_IMAGES_DIR}.`);
  } else {
    throw new Error(
      `Missing ${MUTT_MANIFEST_PATH} or ${MUTT_IMAGES_DIR}. Run: npm run dataset:dog:mutt:fetch`,
    );
  }

  const legacy = muttDatasetToLegacyIndex(dataset);

  mkdirSync(dirname(MUTT_DATASET_PATH), { recursive: true });
  writeFileSync(MUTT_DATASET_PATH, JSON.stringify(dataset, null, 2));
  writeFileSync(MUTT_LEGACY_INDEX_PATH, JSON.stringify(legacy, null, 2));

  console.log(
    `Processed ${dataset.imageCount} mutt images → ${dataset.instanceCount} instances`,
  );
  console.log(`  normalized: ${MUTT_DATASET_PATH}`);
  console.log(`  legacy index: ${MUTT_LEGACY_INDEX_PATH}`);
  console.log("Next: npm run dataset:dog:seed");
}

main();
