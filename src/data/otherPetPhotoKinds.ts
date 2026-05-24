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

export function otherKindToPhotoSlug(
  otherKind: string,
): OtherPetPhotoKindSlug | null {
  const row = OTHER_PET_PHOTO_KINDS.find((k) => k.kind === otherKind);
  return row?.slug ?? null;
}
