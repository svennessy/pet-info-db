import { prisma } from "../../../prisma/db.js";
import type { Request } from "express";
import { mapPetPhotosResolved } from "../../resolveImageUrl.js";
import { HttpError } from "../../utils/httpError.js";
import { parsePetId } from "./ownership.service.js";

export async function getPetById(req: Request) {
  const petId = parsePetId(req.params.id);

  const pet = await prisma.pet.findUnique({
    where: {
      id: petId,
    },
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
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  return {
    ...pet,
    id: String(pet.id),
    ownerId: String(pet.ownerId),
    photos: mapPetPhotosResolved(pet).photos ?? [],
  };
}
