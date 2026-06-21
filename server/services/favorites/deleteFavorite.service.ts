import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { getVerifiedProfile, parsePetId } from "../pets/ownership.service.js";

export async function deleteFavorite(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const petId = parsePetId(req.params.petId);

  await prisma.favoritePet.deleteMany({
    where: {
      profileId: profile.id,
      petId,
    },
  });

  return {
    petId: String(petId),
  };
}