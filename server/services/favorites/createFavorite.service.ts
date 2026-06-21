import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";
import { getVerifiedProfile, parsePetId } from "../pets/ownership.service.js";

export async function createFavorite(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const petId = parsePetId(req.params.petId);

  const pet = await prisma.pet.findUnique({
    where: {
      id: petId,
    },
    select: {
      id: true,
    },
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  const favorite = await prisma.favoritePet.upsert({
    where: {
      profileId_petId: {
        profileId: profile.id,
        petId,
      },
    },
    update: {},
    create: {
      profileId: profile.id,
      petId,
    },
    select: {
      id: true,
      petId: true,
    },
  });

  return {
    id: String(favorite.id),
    petId: String(favorite.petId),
  };
}