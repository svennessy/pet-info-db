import type { Request } from "express";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma/db.js";
import { CitiesQuerySchema } from "../validators/cities.validator.js";
import { toCity } from "../transformers/cities.transformer.js";
import { HttpError } from "../utils/httpError.js";
import { formatZodIssues } from "../utils/zodIssues.js";

// cities endpoint

const CITY_SORT_FIELDS = [
  "name",
  "population",
  "stateCode",
  "rankInState",
  "latitude",
  "longitude",
] as const;

type CitySortField = (typeof CITY_SORT_FIELDS)[number];

export async function getCities(req: Request) {
  const parsed = CitiesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid cities query",
      formatZodIssues(parsed.error),
    );
  }

  const { state, search = "", sort: sortField, order } = parsed.data;

  const where: Prisma.CityWhereInput = {};

  if (state) {
    where.stateCode = state;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { stateName: { contains: search, mode: "insensitive" } },
    ];
  }

  const cities = await prisma.city.findMany({
    where,
    orderBy: {
      [sortField as CitySortField]: order,
    },
  });

  return cities.map(toCity);
}

export async function getCityStats() {
  const [total, grouped] = await Promise.all([
    prisma.city.count(),
    prisma.city.groupBy({
      by: ["stateCode", "stateName"],
      _count: { _all: true },
      orderBy: { stateName: "asc" },
    }),
  ]);

  return {
    total,
    byState: grouped.map((row: { stateCode: string; stateName: string; _count: { _all: number } }) => ({
      stateCode: row.stateCode,
      stateName: row.stateName,
      count: row._count._all,
    })),
  };
}
