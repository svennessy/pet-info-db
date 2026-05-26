import { mapPetPhotosResolved } from "../resolveImageUrl.js";

export function toPhotoPet(pet: Parameters<typeof mapPetPhotosResolved>[0]) {
  return mapPetPhotosResolved(pet);
}