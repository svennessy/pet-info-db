// endpoint that powers the photo gallery/card views
// flow: /api/cat-pet-photos
//   getPhotoPetList(req, "cat")
//   buildPhotoPetWhere(...)
//   prisma query
//   include photos
//   toPhotoPet(...)
//   frontend

import type { Request } from "express";
import type { PetReportStatus, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma/db.js";
import { toPhotoPet } from "../transformers/petPhotos.transformer.js";
import { PhotoPetListQuerySchema } from "../validators/petPhotos.validator.js";
import { cached } from "../utils/cache.js";
import { HttpError } from "../utils/httpError.js";
import { formatZodIssues } from "../utils/zodIssues.js";

type PhotoSpecies = "dog" | "cat" | "other";

const PHOTO_STATS_CACHE_TTL_MS = 60_000;

const PET_SORT_FIELDS = [
  "name",
  "species",
  "reportStatus",
  "breedLabel",
  "owner",
  "state",
] as const;

type PetSortField = (typeof PET_SORT_FIELDS)[number];

function buildPetOrderBy(
  sortField: string,
  order: "asc" | "desc",
): Prisma.PetOrderByWithRelationInput {
  const sortOrder = order as Prisma.SortOrder;

  if (sortField === "owner") {
    return { owner: { lastName: sortOrder } };
  }

  if (sortField === "state") {
    return { owner: { city: { stateName: sortOrder } } };
  }

  return {
    [sortField as Exclude<PetSortField, "owner" | "state">]: sortOrder,
  };
}

function buildPhotoPetWhere(params: {
  species: PhotoSpecies;
  reportStatus?: "lost" | "found";
  state?: string;
  breedSlug?: string;
  kind?: "Bird" | "Rabbit";
  search?: string;
}): Prisma.PetWhereInput {
  const { species, reportStatus, state, breedSlug, kind, search } = params;

  let where: Prisma.PetWhereInput = {
    species,
    // only return pets with at least one photo
    // so if a cat has pet row exists but pet_photos is empty, it won't be returned
    photos: { some: {} },
  };

  if (species === "other") {
    where.otherKind = { in: ["Bird", "Rabbit"] };
  }

  if (reportStatus) {
    where.reportStatus = reportStatus;
  }

  if (state) {
    where.owner = {
      city: {
        stateCode: state,
      },
    };
  }

  if (species === "dog" && breedSlug) {
    where.dogBreedSlug = breedSlug;
  }

  if (species === "cat" && breedSlug) {
    where.catBreedSlug = breedSlug;
  }

  if (species === "other" && kind) {
    where.otherKind = kind;
  }

  // if search = kevin, it will search for:
  // - pets with name containing "kevin"
  // - pets with breedLabel containing "kevin"
  // - pets with owner firstName containing "kevin"
  // - pets with owner lastName containing "kevin"
  if (search) {
    where = {
      AND: [
        where,
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { breedLabel: { contains: search, mode: "insensitive" } },
            { owner: { firstName: { contains: search, mode: "insensitive" } } },
            { owner: { lastName: { contains: search, mode: "insensitive" } } },
          ],
        },
      ],
    };
  }

  return where;
}

// decides what prisma loads
function buildPhotoPetInclude(species: PhotoSpecies): Prisma.PetInclude {
  const baseInclude: Prisma.PetInclude = {
    // for every species "Photo 1, Photo 2, Photo 3"
    // becomes carousel order
    photos: {
      orderBy: {
        sortOrder: "asc",
      },
    },
    // owner info for card hover
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
  };

  if (species === "dog") {
    return {
      ...baseInclude,
      dogBreed: {
        select: {
          slug: true,
          name: true,
          commonality: true,
          weight: true,
        },
      },
    };
  }

  if (species === "cat") {
    return {
      ...baseInclude,
      catBreed: {
        select: {
          slug: true,
          name: true,
          commonality: true,
          weight: true,
        },
      },
    };
  }

  return baseInclude;
}

export async function getPhotoPetList(req: Request, species: PhotoSpecies) {
  const parsed = PhotoPetListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid photo pet list query",
      formatZodIssues(parsed.error),
    );
  }

  const {
    reportStatus,
    state,
    breed: breedSlug,
    kind,
    search = "",
    sort,
    order,
    page,
    limit,
  } = parsed.data;

  const skip = (page - 1) * limit;

  const where = buildPhotoPetWhere({
    species,
    reportStatus,
    state,
    breedSlug,
    kind,
    search,
  });

  const orderBy = buildPetOrderBy(sort, order);

  // main query
  const [pets, total] = await Promise.all([
    prisma.pet.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      // means each pet will come back like:
      // {
      //   id,
      //   name,
      //   photos: [...],
      //   owner: {
      //     id,
      //     firstName,
      //     lastName,
      //     city: {
      //       name,
      //       stateCode,
      //       stateName,
      //     },
      //   catBreed: {
      //     slug,
      //     name,
      //   }
      // }
      include: buildPhotoPetInclude(species),
    }),
    prisma.pet.count({ where }),
  ]);

  return {
    pets: pets.map(toPhotoPet),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ananlytics endpoint
// ie: /api/cat-pet-photos/stats
// computes total cats with photos, total photos, lost vs found counts, photo count distribution
// example output:
// {
//   photoCount: 100,
//   byReportStatus: [
//     { reportStatus: "lost", count: 50 },
//     { reportStatus: "found", count: 50 },
//   ],
//   byPhotoCount: [
//     { photos: 1, cats: 100 },
//   ],
// }
async function getPhotoPetStatsUncached(species: PhotoSpecies) {
  const where: Prisma.PetWhereInput =
    species === "other"
      ? {
          species,
          otherKind: { in: ["Bird", "Rabbit"] },
          photos: { some: {} },
        }
      : {
          species,
          photos: { some: {} },
        };

  const byPhotoCountQuery =
    species === "dog"
      ? prisma.$queryRaw<Array<{ photos: number; pets: bigint }>>`
          SELECT x.c AS photos, COUNT(*)::bigint AS pets
          FROM (
            SELECT "petId", COUNT(*)::int AS c
            FROM pet_photos
            GROUP BY "petId"
          ) x
          INNER JOIN pets p ON p.id = x."petId"
          WHERE p.species = 'dog'
          GROUP BY x.c
          ORDER BY x.c
        `
      : species === "cat"
        ? prisma.$queryRaw<Array<{ photos: number; pets: bigint }>>`
            SELECT x.c AS photos, COUNT(*)::bigint AS pets
            FROM (
              SELECT "petId", COUNT(*)::int AS c
              FROM pet_photos
              GROUP BY "petId"
            ) x
            INNER JOIN pets p ON p.id = x."petId"
            WHERE p.species = 'cat'
            GROUP BY x.c
            ORDER BY x.c
          `
        : prisma.$queryRaw<Array<{ photos: number; pets: bigint }>>`
            SELECT x.c AS photos, COUNT(*)::bigint AS pets
            FROM (
              SELECT "petId", COUNT(*)::int AS c
              FROM pet_photos
              GROUP BY "petId"
            ) x
            INNER JOIN pets p ON p.id = x."petId"
            WHERE p.species = 'other'
              AND p."otherKind" IN ('Bird', 'Rabbit')
            GROUP BY x.c
            ORDER BY x.c
          `;

  const byKindQuery =
    species === "other"
      ? prisma.pet.groupBy({
          by: ["otherKind"],
          where,
          _count: { _all: true },
        })
      : Promise.resolve([]);

  const [
    petsWithPhotos,
    photoCount,
    byPhotoCount,
    byReportStatus,
    byKind,
  ] = await Promise.all([
    prisma.pet.count({ where }),
    prisma.petPhoto.count({
      where: {
        pet: where,
      },
    }),
    byPhotoCountQuery,
    prisma.pet.groupBy({
      by: ["reportStatus"],
      where,
      _count: { _all: true },
    }),
    byKindQuery,
  ]);

  const base = {
    photoCount,
    byReportStatus: byReportStatus.map((row: { reportStatus: PetReportStatus; _count: { _all: number } }) => ({
      reportStatus: row.reportStatus,
      count: row._count._all,
    })),
  };

  if (species === "dog") {
    return {
      ...base,
      dogsWithPhotos: petsWithPhotos,
      byPhotoCount: byPhotoCount.map((row: { photos: number; pets: bigint }) => ({
        photos: row.photos,
        dogs: Number(row.pets),
      })),
    };
  }

  if (species === "cat") {
    return {
      ...base,
      catsWithPhotos: petsWithPhotos,
      byPhotoCount: byPhotoCount.map((row: { photos: number; pets: bigint }) => ({
        photos: row.photos,
        cats: Number(row.pets),
      })),
    };
  }

  return {
    ...base,
    petsWithPhotos,
    byPhotoCount: byPhotoCount.map((row: { photos: number; pets: bigint }) => ({
      photos: row.photos,
      pets: Number(row.pets),
    })),
    byKind: byKind.map((row: { otherKind: string | null; _count: { _all: number } }) => ({
      kind: row.otherKind ?? "",
      count: row._count._all,
    })),
  };
}

// stats are cached for 60 seconds to avoid repeated db hits
export async function getPhotoPetStats(species: PhotoSpecies) {
  return cached(
    `photo-pet-stats:${species}`,
    PHOTO_STATS_CACHE_TTL_MS,
    () => getPhotoPetStatsUncached(species),
  );
}