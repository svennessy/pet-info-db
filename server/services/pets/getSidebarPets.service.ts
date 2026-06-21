import type { Request } from "express";
import { prisma } from "../../../prisma/db.js";
import { buildMapPetsWhere } from "../../queries/pets.query.js";
import { mapPetPhotosResolved } from "../../resolveImageUrl.js";
import { toMapPet } from "../../transformers/pets.transformer.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { MapPetsQuerySchema } from "../../validators/pets.validator.js";

export async function getSidebarPets(req: Request) {
  const parsed = MapPetsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid sidebar pet bounds",
      formatZodIssues(parsed.error),
    );
  }

  const {
    minLat,
    maxLat,
    minLng,
    maxLng,
    limit,
    page,
    species,
    reportStatus,
    search,
    sort,
    order,
  } = parsed.data;

  const safeLimit = Math.min(limit, 40);
  const safePage = Math.max(page ?? 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const where = buildMapPetsWhere({
    minLat,
    maxLat,
    minLng,
    maxLng,
    species,
    reportStatus,
    search,
  });

  const [total, pets] = await Promise.all([
    prisma.pet.count({ where }),

    prisma.pet.findMany({
      where,
      orderBy: [
        {
          [sort]: order,
        },
        {
          id: "desc",
        },
      ],
      skip,
      take: safeLimit,
      select: {
        id: true,
        name: true,
        description: true,
        species: true,
        reportStatus: true,
        breedLabel: true,
        latitude: true,
        longitude: true,
        locationLabel: true,
        cityName: true,
        stateCode: true,
        createdAt: true,

        photos: {
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              id: "asc",
            },
          ],
          take: 5,
          select: {
            id: true,
            petId: true,
            imagePath: true,
            sortOrder: true,
            stanfordInstanceKey: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return {
    pets: pets.map((pet) => toMapPet(mapPetPhotosResolved(pet))),
    total,
    page: safePage,
    limit: safeLimit,
  };
}
