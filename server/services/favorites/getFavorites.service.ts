import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { mapPetPhotosResolved } from "../../resolveImageUrl.js";
import { getVerifiedProfile } from "../pets/ownership.service.js";
import { toMapPet } from "../../transformers/pets.transformer.js";

export async function getFavorites(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);

  const favorites = await prisma.favoritePet.findMany({
    where: {
      profileId: profile.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      pet: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              city: {
                select: {
                  name: true,
                  stateCode: true,
                  stateName: true,
                },
              },
            },
          },
          photos: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 4,
          },
        },
      },
    },
  });

  return {
    pets: favorites.map((favorite) => ({
      ...toMapPet(favorite.pet),
      photos: mapPetPhotosResolved(favorite.pet).photos ?? [],
      owner: {
        ...favorite.pet.owner,
        id: String(favorite.pet.owner.id),
      },
      favoriteId: String(favorite.id),
    })),
    total: favorites.length,
  };
}