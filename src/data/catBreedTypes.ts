import type { BreedCommonality } from "./breedCommonality";

export type { BreedCommonality };

export type CatBreedGroup =
  | "domestic"
  | "shorthair"
  | "longhair"
  | "semi_longhair"
  | "oriental"
  | "natural"
  | "rex"
  | "hairless"
  | "hybrid"
  | "misc";

export type CatBreed = {
  id: string;
  name: string;
  commonality: BreedCommonality;
  weight: number;
  group?: CatBreedGroup;
};
