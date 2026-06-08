import type { Prisma } from "../../generated/prisma/client.js";

// doesn't hit database, just builds prisma where object
// service then passes this to prisma.pet.findMany
// example frontend request:
// /api/pets/map?minLat=35&maxLat=408&minLng=-80&maxLng=-70 
// creates the following prisma where object:
// {
//   AND: [
//     { latitude: { gte: 35, lte: 40 } },
//     { longitude: { gte: -80, lte: -70 } },
//   ],
// }
export function buildMapPetsWhere(params: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  species?: string;
  reportStatus?: string;
  search?: string;
}): Prisma.PetWhereInput {
  const { minLat, maxLat, minLng, maxLng, species, reportStatus, search } =
    params;

  const andConditions: Prisma.PetWhereInput[] = [
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
  ];

  if (species === "dog" || species === "cat" || species === "other") {
    andConditions.push({ species });
  }

  if (reportStatus === "lost" || reportStatus === "found") {
    andConditions.push({ reportStatus });
  }

  if (search) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          breedLabel: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  return {
    AND: andConditions,
  };
}

// builds filters for GET /api/pets route 
// starts with empty where object and adds conditions as we go
// will return all if no filters are provided 
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

  // prevents invalid species values from reaching database
  // ie. /api/pets?species=horse should 400 not error
  // Zod technically already handles but it's defensive code
  if (species === "dog" || species === "cat" || species === "other") {
    where.species = species;
  }

  if (reportStatus === "lost" || reportStatus === "found") {
    where.reportStatus = reportStatus;
  }

  // relationship filtering
  // pet table doesn't have state field but owner does
  if (state) {
    where.owner = {
      city: {
        stateCode: state,
      },
    };
  }

  // breed filtering
  // example: /api/pets?breed=golden-retriever
  // creates the following prisma where object:
  // {
  //   OR: [
  //     { dogBreedSlug: "golden-retriever" },
  //     { catBreedSlug: "golden-retriever" },
  //   ],
  // }
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

  // instead of where.or = [...], we use AND: [where, ...]
  // meaning species=cat, state=VA, search=Kevin 
  // becomes: species is cat AND state is VA AND (name contains Kevin OR breed contains Kevin OR owner first name contains Kevin OR owner last name contains Kevin)
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

// builds sort order for GET /api/pets route 
// example: /api/pets?sort=owner&order=desc
// creates the following prisma orderBy object:
// { owner: { lastName: "desc" } }
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

  // default to name sort ascending
  // so if no sort is provided, it will sort by name ascending
  return {
    [sortField]: sortOrder,
  };
}

// without this file services would be full of filter building logic
// instead now they just say:
// const where = buildPetListWhere(params);
// const orderBy = buildPetOrderBy(sortField, order);
