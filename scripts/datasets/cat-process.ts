/**
 * Layer 2 — Process: manifest → normalized dataset + legacy index for the app.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildCatDatasetFromManifest,
  catDatasetToLegacyIndex,
  type CatManifestRow,
} from "../../src/data/datasets/cat.js";
import {
  CAT_DATASET_PATH,
  CAT_LEGACY_INDEX_PATH,
  CAT_MANIFEST_PATH,
} from "../../src/data/datasets/paths.js";

function main() {
  let rows: CatManifestRow[];
  try {
    rows = JSON.parse(readFileSync(CAT_MANIFEST_PATH, "utf8")) as CatManifestRow[];
  } catch {
    throw new Error(
      `Missing ${CAT_MANIFEST_PATH}. Run: npm run dataset:cat:fetch`,
    );
  }

  if (rows.length === 0) {
    throw new Error("Cat manifest is empty.");
  }

  const dataset = buildCatDatasetFromManifest(rows);
  const legacy = catDatasetToLegacyIndex(dataset);

  mkdirSync(dirname(CAT_DATASET_PATH), { recursive: true });
  writeFileSync(CAT_DATASET_PATH, JSON.stringify(dataset, null, 2));
  writeFileSync(CAT_LEGACY_INDEX_PATH, JSON.stringify(legacy, null, 2));

  console.log(
    `Processed ${dataset.imageCount} images → ${dataset.instanceCount} instances`,
  );
  console.log(`  normalized: ${CAT_DATASET_PATH}`);
  console.log(`  legacy index: ${CAT_LEGACY_INDEX_PATH}`);
  console.log("Next: npm run dataset:cat:seed");
}

main();
