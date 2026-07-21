import type { Prisma } from "../generated/prisma/client.js";

/**
 * Pets that must survive seed/clear runs:
 * - auth-posted pets (owner phone "profile-<id>")
 * - any pet with community sightings (bulletin)
 * - any pet saved by a user (favorites)
 *
 * Sightings and favorites cascade-delete with the pet, so wiping seeded pets
 * that users interacted with empties Bulletin and Saved.
 */
export const seededPetDeleteWhere: Prisma.PetWhereInput = {
  AND: [
    {
      owner: {
        NOT: {
          phone: { startsWith: "profile-" },
        },
      },
    },
    { sightings: { none: {} } },
    { favorites: { none: {} } },
  ],
};
