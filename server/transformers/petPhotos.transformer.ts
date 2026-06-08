import { mapPetPhotosResolved } from "../resolveImageUrl.js";

// wrapper to keep architecture clean
export function toPhotoPet(pet: Parameters<typeof mapPetPhotosResolved>[0]) {
  return mapPetPhotosResolved(pet);
}