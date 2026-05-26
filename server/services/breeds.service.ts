import type { Request } from "express";
import type {
  BreedCommonality,
  BreedGroup,
  CatBreedGroup,
  Prisma,
} from "../../generated/prisma/client.js";
import { prisma } from "../../prisma/db.js";
import { toBreed } from "../transformers/breeds.transformer.js";
import { BreedsQuerySchema } from "../validators/breeds.validator.js";
import { formatZodIssues } from "../utils/zodIssues.js";
import { HttpError } from "../utils/httpError.js";

// breeds endpoint

const BREED_SORT_FIELDS = ["name", "weight", "commonality", "group"] as const;

type BreedSortField = (typeof BREED_SORT_FIELDS)[number];

export async function getBreeds(req: Request) {
  const parsed = BreedsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid breeds query",
      formatZodIssues(parsed.error),
    );
  }

  const {
    species,
    commonality,
    group,
    search = "",
    sort: sortField,
    order,
  } = parsed.data;

  if (species === "cat") {
    const where: Prisma.CatBreedWhereInput = {};

    if (commonality) {
      where.commonality = commonality as BreedCommonality;
    }

    if (group) {
      where.group = group as CatBreedGroup;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const breeds = await prisma.catBreed.findMany({
      where,
      orderBy: {
        [sortField as BreedSortField]: order,
      },
    });

    return breeds.map(toBreed);
  }

  const where: Prisma.DogBreedWhereInput = {};

  if (commonality) {
    where.commonality = commonality as BreedCommonality;
  }

  if (group) {
    where.group = group as BreedGroup;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const breeds = await prisma.dogBreed.findMany({
    where,
    orderBy: {
      [sortField as BreedSortField]: order,
    },
  });

  return breeds.map(toBreed);
}
