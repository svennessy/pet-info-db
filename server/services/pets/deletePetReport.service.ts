import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import {
  assertPetOwner,
  getVerifiedProfile,
  parsePetId,
} from "./ownership.service.js";

export async function deletePetReport(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const petId = parsePetId(req.params.id);

  await assertPetOwner({
    petId,
    profileEmail: profile.email,
  });

  await prisma.pet.delete({
    where: {
      id: petId,
    },
  });

  return {
    id: String(petId),
  };
}