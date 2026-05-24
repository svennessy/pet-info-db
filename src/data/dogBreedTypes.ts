export type { BreedCommonality } from "./breedCommonality";
import type { BreedCommonality } from "./breedCommonality";

export type DogBreed = {
  /** Stable id for DB seeds and URLs (kebab-case). */
  id: string;
  /** Display name. */
  name: string;
  commonality: BreedCommonality;
  /**
   * Relative weight for random pet generation (higher = more likely).
   * Mixed breeds and top AKC registrations sit near 100; rare hounds near 1–5.
   */
  weight: number;
  /** Optional AKC group for future filters. */
  group?:
    | "sporting"
    | "hound"
    | "working"
    | "terrier"
    | "toy"
    | "non_sporting"
    | "herding"
    | "misc"
    | "foundation";
};
