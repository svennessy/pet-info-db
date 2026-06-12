import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";
import { getVerifiedProfile } from "../pets/ownership.service.js";

function parsePhotoId(rawPhotoId: string | string[] | undefined) {
  if (Array.isArray(rawPhotoId)) {
    throw new HttpError(400, "Invalid photo id");
  }

  const photoId = Number(rawPhotoId);

  if (!Number.isInteger(photoId)) {
    throw new HttpError(400, "Invalid photo id");
  }

  return photoId;
}

export async function deletePetPhoto(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const photoId = parsePhotoId(req.params.id);

  const photo = await prisma.petPhoto.findUnique({
    where: {
      id: photoId,
    },
    select: {
      id: true,
      petId: true,
      pet: {
        select: {
          owner: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (!photo) {
    throw new HttpError(404, "Photo not found");
  }

  if (photo.pet.owner.email !== profile.email) {
    throw new HttpError(403, "You can only delete photos from your own posts");
  }

  await prisma.petPhoto.delete({
    where: {
      id: photoId,
    },
  });

  return {
    id: String(photo.id),
    petId: String(photo.petId),
  };
}