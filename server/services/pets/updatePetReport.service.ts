import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { UpdatePetReportSchema } from "../../validators/pets.validator.js";
import {
  assertPetOwner,
  getVerifiedProfile,
  parsePetId,
} from "./ownership.service.js";

export async function updatePetReport(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const petId = parsePetId(req.params.id);

  await assertPetOwner({
    petId,
    profileEmail: profile.email,
  });

  const parsed = UpdatePetReportSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid pet update",
      formatZodIssues(parsed.error),
    );
  }

  const { photoUrls, ...petUpdateData } = parsed.data;

  const pet = await prisma.pet.update({
    where: {
      id: petId,
    },
    data: petUpdateData,
    select: {
      id: true,
    },
  });

  if (photoUrls && photoUrls.length > 0) {
    await prisma.petPhoto.createMany({
      data: photoUrls.map((photoUrl, index) => ({
        petId,
        imagePath: photoUrl,
        sortOrder: index,
        stanfordInstanceKey: null,
      })),
      skipDuplicates: true,
    });
  }

  return {
    id: String(pet.id),
  };
}