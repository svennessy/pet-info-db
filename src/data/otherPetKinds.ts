/** Non dog/cat pets with US household popularity weights (full simulation). */
export type WeightedKind = {
  kind: string;
  weight: number;
};

export const OTHER_PET_KINDS: readonly WeightedKind[] = [
  { kind: "Rabbit", weight: 28 },
  { kind: "Fish", weight: 26 },
  { kind: "Bird", weight: 22 },
  { kind: "Hamster", weight: 18 },
  { kind: "Guinea Pig", weight: 16 },
  { kind: "Reptile", weight: 14 },
  { kind: "Turtle", weight: 12 },
  { kind: "Ferret", weight: 8 },
  { kind: "Chicken", weight: 6 },
  { kind: "Hedgehog", weight: 5 },
  { kind: "Rat", weight: 5 },
  { kind: "Chinchilla", weight: 4 },
  { kind: "Snake", weight: 4 },
  { kind: "Lizard", weight: 4 },
  { kind: "Frog", weight: 3 },
  { kind: "Hermit Crab", weight: 3 },
  { kind: "Horse", weight: 3 },
  { kind: "Goat", weight: 2 },
  { kind: "Pig", weight: 2 },
  { kind: "Duck", weight: 2 },
];

/** Only these appear in the bird & bunny photo explorer. */
export const OTHER_PETS_WITH_PHOTOS: readonly WeightedKind[] = [
  { kind: "Rabbit", weight: 55 },
  { kind: "Bird", weight: 45 },
];
