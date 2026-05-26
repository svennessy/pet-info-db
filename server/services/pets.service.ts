import type { Request } from "express";
import { prisma } from "../../prisma/db.js";
import {
  buildMapPetsWhere,
  buildPetListWhere,
  buildPetOrderBy,
} from "../queries/pets.query.js";
import { toMapPet, toPetListItem } from "../transformers/pets.transformer.js";
import {
  MapPetsQuerySchema,
  PetsListQuerySchema,
} from "../validators/pets.validator.js";
import { formatZodIssues } from "../utils/zodIssues.js";
import { HttpError } from "../utils/httpError.js";

// map and pet list

export async function getMapPets(req: Request) {
  const parsed = MapPetsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid map bounds",
      formatZodIssues(parsed.error),
    );
  }

  const { minLat, maxLat, minLng, maxLng, limit } = parsed.data;

  const pets = await prisma.pet.findMany({
    where: buildMapPetsWhere(minLat, maxLat, minLng, maxLng),
    take: limit,
    select: {
      id: true,
      name: true,
      species: true,
      reportStatus: true,
      breedLabel: true,
      latitude: true,
      longitude: true,
    },
  });

  return {
    pets: pets.map(toMapPet),
    total: pets.length,
  };
}

export async function getPets(req: Request) {
  const parsed = PetsListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid pet list query",
      formatZodIssues(parsed.error),
    );
  }

  const {
    species,
    reportStatus,
    state,
    breed: breedSlug,
    search = "",
    sort,
    order,
    page,
    limit,
  } = parsed.data;

  const skip = (page - 1) * limit;

  const where = buildPetListWhere({
    species,
    reportStatus,
    state,
    breedSlug,
    search,
  });

  const orderBy = buildPetOrderBy(sort, order);

  const [pets, total] = await Promise.all([
    prisma.pet.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        dogBreed: {
          select: {
            slug: true,
            name: true,
            commonality: true,
            weight: true,
          },
        },
        catBreed: {
          select: {
            slug: true,
            name: true,
            commonality: true,
            weight: true,
          },
        },
        owner: {
          select: {
            id: true,
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
      },
    }),
    prisma.pet.count({ where }),
  ]);

  return {
    pets: pets.map(toPetListItem),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}