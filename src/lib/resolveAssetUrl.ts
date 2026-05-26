/**
 * Resolve DB image paths to browser-loadable URLs.
 * Mirrors server/resolveImageUrl.ts so images work in Vite dev (port 5173)
 * even when the API returns relative paths without PUBLIC_ASSET_BASE_URL.
 */
export function resolveAssetUrl(imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }
  const base = (
    import.meta.env.VITE_PUBLIC_ASSET_BASE_URL as string | undefined
  )?.replace(/\/$/, "");
  if (!base) {
    return imagePath;
  }
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}

export function photoDisplayUrl(photo: {
  imagePath: string;
  imageUrl?: string;
  resolvedUrl?: string;
}): string {
  return (
    photo.resolvedUrl ??
    resolveAssetUrl(photo.imageUrl ?? photo.imagePath)
  );
}
