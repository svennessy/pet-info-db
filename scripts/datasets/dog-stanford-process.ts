/**
 * Layer 2 — Process: scan Stanford Images/ → normalized dataset + legacy index.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildStanfordDatasetFromImagesDir,
  stanfordDatasetToLegacyIndex,
} from "../../src/data/datasets/dogStanford.js";
import {
  STANFORD_DATASET_PATH,
  STANFORD_IMAGES_DIR,
  STANFORD_LEGACY_INDEX_PATH,
} from "../../src/data/datasets/paths.js";

function main() {
  const dataset = buildStanfordDatasetFromImagesDir(STANFORD_IMAGES_DIR);
  const legacy = stanfordDatasetToLegacyIndex(dataset);

  mkdirSync(dirname(STANFORD_DATASET_PATH), { recursive: true });
  writeFileSync(STANFORD_DATASET_PATH, JSON.stringify(dataset, null, 2));
  writeFileSync(STANFORD_LEGACY_INDEX_PATH, JSON.stringify(legacy));

  console.log(
    `Processed ${dataset.imageCount} images in ${dataset.instanceCount} instances across ${dataset.classCount} Stanford classes.`,
  );
  console.log(
    `Mapped ${Object.keys(legacy.slugToClass).length} dog breeds to ${new Set(Object.values(legacy.slugToClass)).size} Stanford classes.`,
  );
  console.log(`  normalized: ${STANFORD_DATASET_PATH}`);
  console.log(`  legacy index: ${STANFORD_LEGACY_INDEX_PATH}`);
}

main();
