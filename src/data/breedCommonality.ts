/** Shared rarity tier for dog and cat breed lists (US-centric). */
export type BreedCommonality =
  | "very_common"
  | "common"
  | "uncommon"
  | "rare"
  | "very_rare";

export const COMMONALITY_ORDER: readonly BreedCommonality[] = [
  "very_common",
  "common",
  "uncommon",
  "rare",
  "very_rare",
] as const;

export const COMMONALITY_LABELS: Record<BreedCommonality, string> = {
  very_common: "Very common",
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  very_rare: "Very rare",
};
