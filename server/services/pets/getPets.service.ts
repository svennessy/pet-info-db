import type { Request } from "express";
import { prisma } from "../../../prisma/db.js";
import {
  buildPetListWhere,
  buildPetOrderBy,
} from "../../queries/pets.query.js";
import { toPetListItem } from "../../transformers/pets.transformer.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { PetsListQuerySchema } from "../../validators/pets.validator.js";

// powers the GET /api/pets route
// for pet list/table view
export async function getPets(req: Request) {
  // validates query params (species, reportStatus, state, breedSlug, search, sort, order, page, limit)
  const parsed = PetsListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    // throws clean 400 error with details
    throw new HttpError(
      400,
      "Invalid pet list query",
      formatZodIssues(parsed.error),
    );
  }

  // pull out filters
  // breedSlug is renamed bc frontend query param is "breed" but DB field is "dogBreedSlug"/"catBreedSlug"
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

  // pagination math
  // if page = 1 limit = 50, skip = 0
  // if page = 2 limit = 50, skip = 50
  const skip = (page - 1) * limit;

  // build query parts
  // this returns a prisma where object
  // ie. { species: "dog", reportStatus: "lost", owner: { city: { stateCode: "VA" } } }
  const where = buildPetListWhere({
    species,
    reportStatus,
    state,
    breedSlug,
    search,
  });

  // ie. { name: "asc" } or { owner: { lastName: "desc" } }
  const orderBy = buildPetOrderBy(sort, order);

  // run two queries in parallel
  // pets = current page rows
  // total = total number of rows
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

  // return paginated result
  return {
    pets: pets.map(toPetListItem),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
