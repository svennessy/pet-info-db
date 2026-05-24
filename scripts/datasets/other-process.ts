/**
 * Layer 2 — Process other-pet manifest → normalized dataset + legacy index.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildOtherPetDatasetFromManifest,
  otherPetDatasetToLegacyIndex,
  type OtherPetManifestRow,
} from "../../src/data/datasets/otherPet.js";
import {
  OTHER_DATASET_PATH,
  OTHER_LEGACY_INDEX_PATH,
  OTHER_MANIFEST_PATH,
} from "../../src/data/datasets/paths.js";

function main() {
  let rows: OtherPetManifestRow[];
  try {
    rows = JSON.parse(
      readFileSync(OTHER_MANIFEST_PATH, "utf8"),
    ) as OtherPetManifestRow[];
  } catch {
    throw new Error(
      `Missing ${OTHER_MANIFEST_PATH}. Run: npm run dataset:other:fetch`,
    );
  }

  if (rows.length === 0) {
    throw new Error("Other-pet manifest is empty.");
  }

  const dataset = buildOtherPetDatasetFromManifest(rows);
  const legacy = otherPetDatasetToLegacyIndex(dataset);

  mkdirSync(dirname(OTHER_DATASET_PATH), { recursive: true });
  writeFileSync(OTHER_DATASET_PATH, JSON.stringify(dataset, null, 2));
  writeFileSync(OTHER_LEGACY_INDEX_PATH, JSON.stringify(legacy, null, 2));

  console.log(
    `Processed ${dataset.imageCount} images → ${dataset.instanceCount} instances`,
  );
  console.log(`  normalized: ${OTHER_DATASET_PATH}`);
  console.log(`  legacy index: ${OTHER_LEGACY_INDEX_PATH}`);
  console.log("Next: npm run dataset:other:seed");
}

main();
