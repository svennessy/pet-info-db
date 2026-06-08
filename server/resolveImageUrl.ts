/**
 * Turn DB image paths into browser-ready URLs.
 * - Absolute URLs (Pixabay, etc.) pass through unchanged.
 * - Paths like /stanford-dogs/... use PUBLIC_ASSET_BASE_URL (Supabase Storage) when set.
 * - Without PUBLIC_ASSET_BASE_URL, relative paths work on local dev (same origin).
 */

// reads supabase url and removes trailing slash
const PUBLIC_ASSET_BASE_URL = process.env.PUBLIC_ASSET_BASE_URL?.replace(
  /\/$/,
  "",
);

function resolveImagePath(imagePath: string) {
  // if the image path already has a full url, leave it alone
  // ie: https://example.com/cat.jpg
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // if production has supabase configured
  // concat strings
  if (PUBLIC_ASSET_BASE_URL) {
    return `${PUBLIC_ASSET_BASE_URL}${imagePath}`;
  }

  // if no supabase url local dev uses relative paths served by express
  return imagePath;
}

// takes each photo:
// { imagePath: "/stanford-dogs/dog.jpg" }
// and adds:
// { resolvedUrl: "https://example.com/cat.jpg", imageUrl: "https://example.com/cat.jpg" }
// so frontend can safely use photo.resolvedUrl ?? photo.imageUrl ?? photo.imagePath
export function mapPetPhotosResolved<
  T extends { photos?: Array<{ imagePath: string }> },
>(pet: T) {
  return {
    ...pet,
    photos: pet.photos?.map((photo) => ({
      ...photo,
      resolvedUrl: resolveImagePath(photo.imagePath),
      imageUrl: resolveImagePath(photo.imagePath),
    })),
  };
}
