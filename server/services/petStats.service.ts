import { prisma } from "../../prisma/db.js";
import { cached } from "../utils/cache.js";

// pet dashboard analytics

const PET_STATS_CACHE_TTL_MS = 60_000;

async function getPetStatsUncached() {
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
    prisma.$queryRaw<Array<{ slug: string; name: string; count: bigint }>>`
      SELECT d.slug, d.name, COUNT(*)::bigint AS count
      FROM pets p
      INNER JOIN dog_breeds d ON p."dogBreedSlug" = d.slug
      WHERE p.species = 'dog'
      GROUP BY d.slug, d.name
      ORDER BY count DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<{ slug: string; name: string; count: bigint }>>`
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

  return {
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
  };
}

export async function getPetStats() {
  return cached("pet-stats", PET_STATS_CACHE_TTL_MS, getPetStatsUncached);
}