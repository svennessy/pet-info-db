/** Other pets that get a photo pool (birds & bunnies only). */
export const OTHER_PET_PHOTO_KINDS = [
  { kind: "Rabbit", slug: "rabbit" },
  { kind: "Bird", slug: "bird" },
] as const;

export type OtherPetPhotoKindSlug =
  (typeof OTHER_PET_PHOTO_KINDS)[number]["slug"];

export const OTHER_PET_PHOTO_KIND_LABELS = OTHER_PET_PHOTO_KINDS.map(
  (row) => row.kind,
);

/** Fine-grained bird pools so carousels stay one species/look. */
export const BIRD_PHOTO_VARIANT_SLUGS = [
  "bird-parakeet",
  "bird-cockatiel",
  "bird-canary",
  "bird-lovebird",
  "bird-parrot",
] as const;

export type BirdPhotoVariantSlug = (typeof BIRD_PHOTO_VARIANT_SLUGS)[number];

export function otherKindToPhotoSlug(
  otherKind: string,
): OtherPetPhotoKindSlug | null {
  const row = OTHER_PET_PHOTO_KINDS.find((k) => k.kind === otherKind);
  return row?.slug ?? null;
}

/** Stable variant per bird pet — carousel only uses this pool. */
export function birdPhotoVariantForPetId(petId: number): BirdPhotoVariantSlug {
  return BIRD_PHOTO_VARIANT_SLUGS[petId % BIRD_PHOTO_VARIANT_SLUGS.length];
}

export function photoPoolSlugForPet(
  otherKind: string,
  petId: number,
): string | null {
  if (otherKind === "Rabbit") return "rabbit";
  if (otherKind === "Bird") return birdPhotoVariantForPetId(petId);
  return null;
}
