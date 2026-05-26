/** DB / API path prefix → local folder under data/ */
export const PIXABAY_STORAGE_PREFIXES = {
  cat: "candid-cats",
  other: "other-pet-photos",
};

export function publicPixabayImagePath(prefix, id) {
  return `/${prefix}/images/${id}.jpg`;
}

export function localPixabayImagePath(root, prefix, id) {
  return `${root}/data/${prefix}/images/${id}.jpg`;
}
