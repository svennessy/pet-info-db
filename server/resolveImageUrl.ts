/**
 * Turn DB image paths into browser-ready URLs.
 * - Absolute URLs (Pixabay, etc.) pass through unchanged.
 * - Paths like /stanford-dogs/... use PUBLIC_ASSET_BASE_URL (Supabase Storage) when set.
 * - Without PUBLIC_ASSET_BASE_URL, relative paths work on local dev (same origin).
 */
export function resolveImageUrl(imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    return imagePath;
  }
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}

export function mapPetPhotosResolved<
  T extends { photos: Array<{ imagePath: string }> },
>(pet: T): T {
  return {
    ...pet,
    photos: pet.photos.map((photo) => {
      const resolvedUrl = resolveImageUrl(photo.imagePath);
      return {
        ...photo,
        imagePath: resolvedUrl,
        resolvedUrl,
      };
    }),
  };
}
