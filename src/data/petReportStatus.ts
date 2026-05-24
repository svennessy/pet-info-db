import type { PetSpeciesKind } from "./petNames";

export type PetReportStatus = "lost" | "found";

/**
 * US lost/found listing ratios (Pet911.org 2024 analysis of ~1.5M reports).
 * "Found-to-lost" ratio = found listings ÷ lost listings (dogs 0.63, cats 0.52).
 * So among active reports, lost outnumber found: P(lost) = 1 / (1 + ratio).
 *
 * @see https://pet911.org/post/lost_found_pets_usa
 */
export const FOUND_TO_LOST_RATIO: Record<PetSpeciesKind, number> = {
  dog: 0.63,
  cat: 0.52,
  other: 0.55,
};

export function lostProbability(species: PetSpeciesKind): number {
  const ratio = FOUND_TO_LOST_RATIO[species];
  return 1 / (1 + ratio);
}

/** Assign lost vs found from species-specific US report rates. */
export function pickReportStatus(
  species: PetSpeciesKind,
  rng: () => number,
): PetReportStatus {
  return rng() < lostProbability(species) ? "lost" : "found";
}

/** Display name when a finder does not know the pet's name. */
export const UNKNOWN_PET_NAME = "Unknown";

/** Share of found-pet reports where the name is not known (finder/stray listings). */
export const FOUND_UNKNOWN_NAME_RATE: Record<PetSpeciesKind, number> = {
  dog: 0.9,
  cat: 0.9,
  other: 0.85,
};

export function foundUnknownNameRate(species: PetSpeciesKind): number {
  return FOUND_UNKNOWN_NAME_RATE[species];
}
