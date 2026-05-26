import type { Prisma } from "../../generated/prisma/client.js";

export function buildMapPetsWhere(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): Prisma.PetWhereInput {
  return {
    AND: [
      {
        latitude: {
          gte: minLat,
          lte: maxLat,
        },
      },
      {
        longitude: {
          gte: minLng,
          lte: maxLng,
        },
      },
    ],
  };
}

export function buildPetListWhere(params: {
  species?: string;
  reportStatus?: string;
  state?: string;
  breedSlug?: string;
  search?: string;
}): Prisma.PetWhereInput {
  const {
    species,
    reportStatus,
    state,
    breedSlug,
    search,
  } = params;

  let where: Prisma.PetWhereInput = {};

  if (species === "dog" || species === "cat" || species === "other") {
    where.species = species;
  }

  if (reportStatus === "lost" || reportStatus === "found") {
    where.reportStatus = reportStatus;
  }

  if (state) {
    where.owner = {
      city: {
        stateCode: state,
      },
    };
  }

  if (breedSlug) {
    if (species === "dog") {
      where.dogBreedSlug = breedSlug;
    } else if (species === "cat") {
      where.catBreedSlug = breedSlug;
    } else {
      where.OR = [
        { dogBreedSlug: breedSlug },
        { catBreedSlug: breedSlug },
      ];
    }
  }

  if (search) {
    where = {
      AND: [
        where,
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { breedLabel: { contains: search, mode: "insensitive" } },
            {
              owner: {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              owner: {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
      ],
    };
  }

  return where;
}

export function buildPetOrderBy(
  sortField: string,
  order: "asc" | "desc",
): Prisma.PetOrderByWithRelationInput {
  const sortOrder = order as Prisma.SortOrder;

  if (sortField === "owner") {
    return { owner: { lastName: sortOrder } };
  }

  if (sortField === "state") {
    return {
      owner: {
        city: {
          stateName: sortOrder,
        },
      },
    };
  }

  return {
    [sortField]: sortOrder,
  };
}