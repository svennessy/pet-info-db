import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";

export async function getVerifiedProfile(req: AuthedRequest) {
  const authUser = req.authUser;

  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const profile = await prisma.profile.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
      email: true,
      isVerified: true,
    },
  });

  if (!profile) {
    throw new HttpError(403, "Profile required");
  }

  if (!profile.isVerified) {
    throw new HttpError(403, "Verification required");
  }

  return profile;
}

export function parsePetId(rawPetId: string | string[] | undefined) {
  if (Array.isArray(rawPetId)) {
    throw new HttpError(400, "Invalid pet id");
  }

  const petId = Number(rawPetId);

  if (!Number.isInteger(petId)) {
    throw new HttpError(400, "Invalid pet id");
  }

  return petId;
}

export async function assertPetOwner(params: {
  petId: number;
  profileEmail: string;
}) {
  const pet = await prisma.pet.findUnique({
    where: {
      id: params.petId,
    },
    select: {
      id: true,
      owner: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  if (pet.owner.email !== params.profileEmail) {
    throw new HttpError(403, "You can only modify your own posts");
  }

  return pet;
}