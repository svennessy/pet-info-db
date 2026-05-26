import type { Request } from "express";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma/db.js";
import { UsersQuerySchema } from "../validators/users.validator.js";
import { toUserListItem } from "../transformers/users.transformer.js";
import { HttpError } from "../utils/httpError.js";
import { formatZodIssues } from "../utils/zodIssues.js";

// users endpoint

const USER_SORT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "city",
  "state",
] as const;

type UserSortField = (typeof USER_SORT_FIELDS)[number];

export async function getUsers(req: Request) {
  const parsed = UsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid users query",
      formatZodIssues(parsed.error),
    );
  }

  const {
    state,
    cityId,
    search = "",
    sort: sortField,
    order,
    page,
    limit,
  } = parsed.data;

  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (cityId) {
    where.cityId = cityId;
  }

  if (state) {
    where.city = {
      stateCode: state,
    };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const sortOrder = order as Prisma.SortOrder;

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortField === "city"
      ? { city: { name: sortOrder } }
      : sortField === "state"
        ? { city: { stateName: sortOrder } }
        : {
            [sortField as Exclude<UserSortField, "city" | "state">]: sortOrder,
          };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            stateCode: true,
            stateName: true,
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            reportStatus: true,
            breedLabel: true,
            otherKind: true,
            dogBreed: {
              select: {
                name: true,
                commonality: true,
                group: true,
              },
            },
            catBreed: {
              select: {
                name: true,
                commonality: true,
                group: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(toUserListItem),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getUserStats() {
  const [total, byStateRaw, topNamesRaw] = await Promise.all([
    prisma.user.count(),

    prisma.$queryRaw<
      Array<{ stateCode: string; stateName: string; count: bigint }>
    >`
      SELECT c."stateCode", c."stateName", COUNT(*)::bigint AS count
      FROM users u
      INNER JOIN cities c ON u."cityId" = c.id
      GROUP BY c."stateCode", c."stateName"
      ORDER BY c."stateName" ASC
    `,

    prisma.$queryRaw<
      Array<{ firstName: string; lastName: string; count: bigint }>
    >`
      SELECT "firstName", "lastName", COUNT(*)::bigint AS count
      FROM users
      GROUP BY "firstName", "lastName"
      ORDER BY count DESC
      LIMIT 10
    `,
  ]);

  return {
    total,
    byState: byStateRaw.map((row: { stateCode: string; stateName: string; count: bigint }) => ({
      stateCode: row.stateCode,
      stateName: row.stateName,
      count: Number(row.count),
    })),
    topNames: topNamesRaw.map((row: { firstName: string; lastName: string; count: bigint }) => ({
      firstName: row.firstName,
      lastName: row.lastName,
      count: Number(row.count),
    })),
  };
}