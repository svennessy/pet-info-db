import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BreedCommonality,
  BreedGroup,
  CatBreedGroup,
  Prisma,
} from "../src/generated/prisma/client.js";
import { prisma } from "../prisma/db.js";
import { mapPetPhotosResolved } from "./resolveImageUrl.js";

const app = express();
const port = Number(process.env.PORT) || 3002;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stanfordRoot = path.join(__dirname, "../data/stanford-dogs");
const mixedBreedRoot = path.join(__dirname, "../data/mixed-breed-dogs");
const oxfordCatsRoot = path.join(__dirname, "../data/oxford-cats");
const distRoot = path.join(__dirname, "../dist");
const isProduction = process.env.NODE_ENV === "production";

const BREED_SORT_FIELDS = ["name", "weight", "commonality", "group"] as const;
type BreedSortField = (typeof BREED_SORT_FIELDS)[number];

const CITY_SORT_FIELDS = [
  "name",
  "population",
  "stateCode",
  "rankInState",
  "latitude",
  "longitude",
] as const;
type CitySortField = (typeof CITY_SORT_FIELDS)[number];

const USER_SORT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "city",
  "state",
] as const;
type UserSortField = (typeof USER_SORT_FIELDS)[number];

const PET_SORT_FIELDS = [
  "name",
  "species",
  "reportStatus",
  "breedLabel",
  "owner",
  "state",
] as const;
type PetSortField = (typeof PET_SORT_FIELDS)[number];

type Species = "dog" | "cat";

app.use(cors());
app.use(express.json());
app.use("/stanford-dogs", express.static(stanfordRoot));
app.use("/mixed-breed-dogs", express.static(mixedBreedRoot));
app.use("/oxford-cats", express.static(oxfordCatsRoot));

function parseSpecies(value: unknown): Species {
  return value === "cat" ? "cat" : "dog";
}

function parseListQuery(
  req: express.Request,
  defaultSort: string,
  allowed: readonly string[],
) {
  const sort = (req.query.sort as string) || defaultSort;
  const order = req.query.order === "asc" ? "asc" : "desc";
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sortField = allowed.includes(sort) ? sort : defaultSort;
  return { sortField, order, search };
}

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (error) {
    console.error("Health check DB error:", error);
    res.status(503).json({ ok: false, db: false });
  }
});

app.get("/api/stats", async (req, res, next) => {
  try {
    const species = parseSpecies(req.query.species);

    if (species === "cat") {
      const [total, byCommonality] = await Promise.all([
        prisma.catBreed.count(),
        prisma.catBreed.groupBy({
          by: ["commonality"],
          _count: { _all: true },
          orderBy: { commonality: "asc" },
        }),
      ]);
      return res.json({ species, total, byCommonality });
    }

    const [total, byCommonality] = await Promise.all([
      prisma.dogBreed.count(),
      prisma.dogBreed.groupBy({
        by: ["commonality"],
        _count: { _all: true },
        orderBy: { commonality: "asc" },
      }),
    ]);
    res.json({ species: "dog", total, byCommonality });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cities/stats", async (_req, res, next) => {
  try {
    const [total, grouped] = await Promise.all([
      prisma.city.count(),
      prisma.city.groupBy({
        by: ["stateCode", "stateName"],
        _count: { _all: true },
        orderBy: { stateName: "asc" },
      }),
    ]);

    res.json({
      total,
      byState: grouped.map((row) => ({
        stateCode: row.stateCode,
        stateName: row.stateName,
        count: row._count._all,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cities", async (req, res, next) => {
  try {
    const { sortField, order, search } = parseListQuery(
      req,
      "population",
      CITY_SORT_FIELDS,
    );
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";

    const where: Prisma.CityWhereInput = {};
    if (state) where.stateCode = state;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { stateName: { contains: search, mode: "insensitive" } },
      ];
    }

    const cities = await prisma.city.findMany({
      where,
      orderBy: { [sortField as CitySortField]: order },
    });
    res.json(cities);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/stats", async (_req, res, next) => {
  try {
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

    res.json({
      total,
      byState: byStateRaw.map((row) => ({
        stateCode: row.stateCode,
        stateName: row.stateName,
        count: Number(row.count),
      })),
      topNames: topNamesRaw.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        count: Number(row.count),
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const { sortField, order, search } = parseListQuery(
      req,
      "lastName",
      USER_SORT_FIELDS,
    );
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    const cityId =
      typeof req.query.cityId === "string" ? req.query.cityId.trim() : "";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (cityId) where.cityId = cityId;
    if (state) where.city = { stateCode: state };
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
                select: { name: true, commonality: true, group: true },
              },
              catBreed: {
                select: { name: true, commonality: true, group: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/pets/stats", async (_req, res, next) => {
  try {
    const [
      total,
      bySpecies,
      byReportStatus,
      bySpeciesStatusRaw,
      byStateRaw,
      topDogBreeds,
      topCatBreeds,
      topOther,
    ] = await Promise.all([
        prisma.pet.count(),
        prisma.pet.groupBy({
          by: ["species"],
          _count: { _all: true },
          orderBy: { species: "asc" },
        }),
        prisma.pet.groupBy({
          by: ["reportStatus"],
          _count: { _all: true },
          orderBy: { reportStatus: "asc" },
        }),
        prisma.pet.groupBy({
          by: ["species", "reportStatus"],
          _count: { _all: true },
          orderBy: [{ species: "asc" }, { reportStatus: "asc" }],
        }),
        prisma.$queryRaw<
          Array<{ stateCode: string; stateName: string; count: bigint }>
        >`
          SELECT c."stateCode", c."stateName", COUNT(*)::bigint AS count
          FROM pets p
          INNER JOIN users u ON p."ownerId" = u.id
          INNER JOIN cities c ON u."cityId" = c.id
          GROUP BY c."stateCode", c."stateName"
          ORDER BY c."stateName" ASC
        `,
        prisma.$queryRaw<
          Array<{ slug: string; name: string; count: bigint }>
        >`
          SELECT d.slug, d.name, COUNT(*)::bigint AS count
          FROM pets p
          INNER JOIN dog_breeds d ON p."dogBreedSlug" = d.slug
          WHERE p.species = 'dog'
          GROUP BY d.slug, d.name
          ORDER BY count DESC
          LIMIT 10
        `,
        prisma.$queryRaw<
          Array<{ slug: string; name: string; count: bigint }>
        >`
          SELECT c.slug, c.name, COUNT(*)::bigint AS count
          FROM pets p
          INNER JOIN cat_breeds c ON p."catBreedSlug" = c.slug
          WHERE p.species = 'cat'
          GROUP BY c.slug, c.name
          ORDER BY count DESC
          LIMIT 10
        `,
        prisma.pet.groupBy({
          by: ["otherKind"],
          where: { species: "other" },
          _count: { _all: true },
          orderBy: { _count: { otherKind: "desc" } },
          take: 10,
        }),
      ]);

    res.json({
      total,
      bySpecies: bySpecies.map((row) => ({
        species: row.species,
        count: row._count._all,
      })),
      byReportStatus: byReportStatus.map((row) => ({
        reportStatus: row.reportStatus,
        count: row._count._all,
      })),
      bySpeciesAndStatus: bySpeciesStatusRaw.map((row) => ({
        species: row.species,
        reportStatus: row.reportStatus,
        count: row._count._all,
      })),
      byState: byStateRaw.map((row) => ({
        stateCode: row.stateCode,
        stateName: row.stateName,
        count: Number(row.count),
      })),
      topDogBreeds: topDogBreeds.map((row) => ({
        slug: row.slug,
        name: row.name,
        count: Number(row.count),
      })),
      topCatBreeds: topCatBreeds.map((row) => ({
        slug: row.slug,
        name: row.name,
        count: Number(row.count),
      })),
      topOtherKinds: topOther
        .filter((row) => row.otherKind)
        .map((row) => ({
          kind: row.otherKind as string,
          count: row._count._all,
        })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/pets", async (req, res, next) => {
  try {
    const { sortField, order, search } = parseListQuery(
      req,
      "name",
      PET_SORT_FIELDS,
    );
    const species =
      typeof req.query.species === "string"
        ? req.query.species.trim()
        : "";
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    const reportStatus =
      typeof req.query.reportStatus === "string"
        ? req.query.reportStatus.trim()
        : "";
    const breedSlug =
      typeof req.query.breed === "string" ? req.query.breed.trim() : "";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.PetWhereInput = {};
    if (species === "dog" || species === "cat" || species === "other") {
      where.species = species;
    }
    if (reportStatus === "lost" || reportStatus === "found") {
      where.reportStatus = reportStatus;
    }
    if (state) where.owner = { city: { stateCode: state } };
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
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { breedLabel: { contains: search, mode: "insensitive" } },
        { owner: { firstName: { contains: search, mode: "insensitive" } } },
        { owner: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sortOrder = order as Prisma.SortOrder;
    const orderBy: Prisma.PetOrderByWithRelationInput =
      sortField === "owner"
        ? { owner: { lastName: sortOrder } }
        : sortField === "state"
          ? { owner: { city: { stateName: sortOrder } } }
          : { [sortField as Exclude<PetSortField, "owner" | "state">]: sortOrder };

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

    res.json({
      pets,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dog-pet-photos/stats", async (_req, res, next) => {
  try {
    const [dogsWithPhotos, photoCount, byPhotoCount, byReportStatus] =
      await Promise.all([
        prisma.pet.count({
          where: { species: "dog", photos: { some: {} } },
        }),
        prisma.petPhoto.count({ where: { pet: { species: "dog" } } }),
        prisma.$queryRaw<Array<{ photos: number; dogs: bigint }>>`
          SELECT x.c AS photos, COUNT(*)::bigint AS dogs
          FROM (
            SELECT "petId", COUNT(*)::int AS c FROM pet_photos GROUP BY "petId"
          ) x
          INNER JOIN pets p ON p.id = x."petId"
          WHERE p.species = 'dog'
          GROUP BY x.c
          ORDER BY x.c
        `,
        prisma.pet.groupBy({
          by: ["reportStatus"],
          where: { species: "dog", photos: { some: {} } },
          _count: { _all: true },
        }),
      ]);

    res.json({
      dogsWithPhotos,
      photoCount,
      byPhotoCount: byPhotoCount.map((row) => ({
        photos: row.photos,
        dogs: Number(row.dogs),
      })),
      byReportStatus: byReportStatus.map((row) => ({
        reportStatus: row.reportStatus,
        count: row._count._all,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dog-pet-photos", async (req, res, next) => {
  try {
    const { sortField, order, search } = parseListQuery(
      req,
      "name",
      PET_SORT_FIELDS,
    );
    const reportStatus =
      typeof req.query.reportStatus === "string"
        ? req.query.reportStatus.trim()
        : "";
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    const breedSlug =
      typeof req.query.breed === "string" ? req.query.breed.trim() : "";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
    const skip = (page - 1) * limit;

    const where: Prisma.PetWhereInput = {
      species: "dog",
      photos: { some: {} },
    };
    if (reportStatus === "lost" || reportStatus === "found") {
      where.reportStatus = reportStatus;
    }
    if (state) where.owner = { city: { stateCode: state } };
    if (breedSlug) where.dogBreedSlug = breedSlug;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { breedLabel: { contains: search, mode: "insensitive" } },
        { owner: { firstName: { contains: search, mode: "insensitive" } } },
        { owner: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sortOrder = order as Prisma.SortOrder;
    const orderBy: Prisma.PetOrderByWithRelationInput =
      sortField === "owner"
        ? { owner: { lastName: sortOrder } }
        : sortField === "state"
          ? { owner: { city: { stateName: sortOrder } } }
          : {
              [sortField as Exclude<PetSortField, "owner" | "state">]: sortOrder,
            };

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
          dogBreed: {
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

    res.json({
      pets: pets.map(mapPetPhotosResolved),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cat-pet-photos/stats", async (_req, res, next) => {
  try {
    const [catsWithPhotos, photoCount, byPhotoCount, byReportStatus] =
      await Promise.all([
        prisma.pet.count({
          where: { species: "cat", photos: { some: {} } },
        }),
        prisma.petPhoto.count({ where: { pet: { species: "cat" } } }),
        prisma.$queryRaw<Array<{ photos: number; cats: bigint }>>`
          SELECT x.c AS photos, COUNT(*)::bigint AS cats
          FROM (
            SELECT "petId", COUNT(*)::int AS c FROM pet_photos GROUP BY "petId"
          ) x
          INNER JOIN pets p ON p.id = x."petId"
          WHERE p.species = 'cat'
          GROUP BY x.c
          ORDER BY x.c
        `,
        prisma.pet.groupBy({
          by: ["reportStatus"],
          where: { species: "cat", photos: { some: {} } },
          _count: { _all: true },
        }),
      ]);

    res.json({
      catsWithPhotos,
      photoCount,
      byPhotoCount: byPhotoCount.map((row) => ({
        photos: row.photos,
        cats: Number(row.cats),
      })),
      byReportStatus: byReportStatus.map((row) => ({
        reportStatus: row.reportStatus,
        count: row._count._all,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/cat-pet-photos", async (req, res, next) => {
  try {
    const { sortField, order, search } = parseListQuery(
      req,
      "name",
      PET_SORT_FIELDS,
    );
    const reportStatus =
      typeof req.query.reportStatus === "string"
        ? req.query.reportStatus.trim()
        : "";
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    const breedSlug =
      typeof req.query.breed === "string" ? req.query.breed.trim() : "";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
    const skip = (page - 1) * limit;

    const where: Prisma.PetWhereInput = {
      species: "cat",
      photos: { some: {} },
    };
    if (reportStatus === "lost" || reportStatus === "found") {
      where.reportStatus = reportStatus;
    }
    if (state) where.owner = { city: { stateCode: state } };
    if (breedSlug) where.catBreedSlug = breedSlug;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { breedLabel: { contains: search, mode: "insensitive" } },
        { owner: { firstName: { contains: search, mode: "insensitive" } } },
        { owner: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sortOrder = order as Prisma.SortOrder;
    const orderBy: Prisma.PetOrderByWithRelationInput =
      sortField === "owner"
        ? { owner: { lastName: sortOrder } }
        : sortField === "state"
          ? { owner: { city: { stateName: sortOrder } } }
          : {
              [sortField as Exclude<PetSortField, "owner" | "state">]: sortOrder,
            };

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
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

    res.json({
      pets: pets.map(mapPetPhotosResolved),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/other-pet-photos/stats", async (_req, res, next) => {
  try {
    const kindFilter = { in: ["Bird", "Rabbit"] };
    const [petsWithPhotos, photoCount, byPhotoCount, byReportStatus, byKind] =
      await Promise.all([
        prisma.pet.count({
          where: {
            species: "other",
            otherKind: kindFilter,
            photos: { some: {} },
          },
        }),
        prisma.petPhoto.count({
          where: {
            pet: { species: "other", otherKind: kindFilter },
          },
        }),
        prisma.$queryRaw<Array<{ photos: number; pets: bigint }>>`
          SELECT x.c AS photos, COUNT(*)::bigint AS pets
          FROM (
            SELECT "petId", COUNT(*)::int AS c FROM pet_photos GROUP BY "petId"
          ) x
          INNER JOIN pets p ON p.id = x."petId"
          WHERE p.species = 'other' AND p."otherKind" IN ('Bird', 'Rabbit')
          GROUP BY x.c
          ORDER BY x.c
        `,
        prisma.pet.groupBy({
          by: ["reportStatus"],
          where: {
            species: "other",
            otherKind: kindFilter,
            photos: { some: {} },
          },
          _count: { _all: true },
        }),
        prisma.pet.groupBy({
          by: ["otherKind"],
          where: {
            species: "other",
            otherKind: kindFilter,
            photos: { some: {} },
          },
          _count: { _all: true },
        }),
      ]);

    res.json({
      petsWithPhotos,
      photoCount,
      byPhotoCount: byPhotoCount.map((row) => ({
        photos: row.photos,
        pets: Number(row.pets),
      })),
      byReportStatus: byReportStatus.map((row) => ({
        reportStatus: row.reportStatus,
        count: row._count._all,
      })),
      byKind: byKind.map((row) => ({
        kind: row.otherKind,
        count: row._count._all,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/other-pet-photos", async (req, res, next) => {
  try {
    const { sortField, order, search } = parseListQuery(
      req,
      "name",
      PET_SORT_FIELDS,
    );
    const reportStatus =
      typeof req.query.reportStatus === "string"
        ? req.query.reportStatus.trim()
        : "";
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    const kind =
      typeof req.query.kind === "string" ? req.query.kind.trim() : "";

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
    const skip = (page - 1) * limit;

    const where: Prisma.PetWhereInput = {
      species: "other",
      otherKind: { in: ["Bird", "Rabbit"] },
      photos: { some: {} },
    };
    if (reportStatus === "lost" || reportStatus === "found") {
      where.reportStatus = reportStatus;
    }
    if (state) where.owner = { city: { stateCode: state } };
    if (kind === "Bird" || kind === "Rabbit") where.otherKind = kind;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { breedLabel: { contains: search, mode: "insensitive" } },
        { owner: { firstName: { contains: search, mode: "insensitive" } } },
        { owner: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const sortOrder = order as Prisma.SortOrder;
    const orderBy: Prisma.PetOrderByWithRelationInput =
      sortField === "owner"
        ? { owner: { lastName: sortOrder } }
        : sortField === "state"
          ? { owner: { city: { stateName: sortOrder } } }
          : {
              [sortField as Exclude<PetSortField, "owner" | "state">]: sortOrder,
            };

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          photos: { orderBy: { sortOrder: "asc" } },
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

    res.json({
      pets: pets.map(mapPetPhotosResolved),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/breeds", async (req, res, next) => {
  try {
    const species = parseSpecies(req.query.species);
    const { sortField, order, search } = parseListQuery(
      req,
      "weight",
      BREED_SORT_FIELDS,
    );
    const commonality = req.query.commonality as string | undefined;
    const group = req.query.group as string | undefined;

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
        orderBy: { [sortField as BreedSortField]: order },
      });
      return res.json(breeds);
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
      orderBy: { [sortField as BreedSortField]: order },
    });
    res.json(breeds);
  } catch (error) {
    next(error);
  }
});

if (isProduction) {
  app.use(express.static(distRoot));
  app.get(/^(?!\/api\/|\/stanford-dogs|\/mixed-breed-dogs|\/oxford-cats).*/, (_req, res) => {
    res.sendFile(path.join(distRoot, "index.html"));
  });
}

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Server error",
    });
  },
);

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
  console.log("  GET /api/health");
  console.log("  GET /api/breeds?species=dog|cat");
  console.log("  GET /api/stats?species=dog|cat");
  console.log("  GET /api/cities");
  console.log("  GET /api/cities/stats");
  console.log("  GET /api/users");
  console.log("  GET /api/users/stats");
  console.log("  GET /api/pets");
  console.log("  GET /api/pets/stats");
  console.log("  GET /api/dog-pet-photos");
  console.log("  GET /api/dog-pet-photos/stats");
  console.log("  GET /api/cat-pet-photos");
  console.log("  GET /api/cat-pet-photos/stats");
  console.log("  GET /api/other-pet-photos");
  console.log("  GET /api/other-pet-photos/stats");
  console.log("  static /stanford-dogs");
  console.log("  static /mixed-breed-dogs");
  console.log("  static /oxford-cats");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or run with PORT=3003 npm run dev:server`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
