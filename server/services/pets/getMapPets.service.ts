import type { Request } from "express";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../prisma/db.js";
import { buildMapPetsWhere } from "../../queries/pets.query.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { MapPetsQuerySchema } from "../../validators/pets.validator.js";

const COLOCATED_RADIUS_DEGREES = 0.00045;
const MAX_MAP_MARKERS = 8000;
const MAX_COLOCATED_MATE_SOURCE = 800;
const MAP_CLUSTER_MAX_ZOOM = 12;

type MapClusterRow = {
  count: number;
  latitude: number;
  longitude: number;
  id: number;
  name: string;
  species: string;
  reportStatus: string;
  cityName: string | null;
  stateCode: string | null;
  gridX: number;
  gridY: number;
};

type MapPetRow = {
  id: number;
  name: string;
  species: string;
  reportStatus: string;
  latitude: number;
  longitude: number;
  cityName: string | null;
  stateCode: string | null;
};

type MapPetRecord = {
  id: number;
  name: string;
  species: string;
  reportStatus: string;
  latitude: number;
  longitude: number;
  cityName: string | null;
  stateCode: string | null;
  owner: {
    city: {
      name: string;
      stateCode: string;
    };
  };
};

type GridStrategy = {
  size: number;
  perCell: number;
};

const mapPetSelect = {
  id: true,
  name: true,
  species: true,
  reportStatus: true,
  latitude: true,
  longitude: true,
  cityName: true,
  stateCode: true,
  owner: {
    select: {
      city: {
        select: {
          name: true,
          stateCode: true,
        },
      },
    },
  },
} as const;

function resolvePetCity(pet: MapPetRecord) {
  return {
    cityName: pet.cityName ?? pet.owner.city.name,
    stateCode: pet.stateCode ?? pet.owner.city.stateCode,
  };
}

function resolveGridStrategy(
  totalInBounds: number,
  limit: number,
  zoom: number | undefined,
  latSpan: number,
  lngSpan: number,
): GridStrategy | null {
  if (totalInBounds <= limit) return null;

  const area = latSpan * lngSpan;

  if (zoom !== undefined) {
    if (zoom >= 9) return { size: 0.05, perCell: 16 };
    if (zoom >= 7) return { size: 0.1, perCell: 12 };
    if (zoom >= 5) return { size: 0.2, perCell: 10 };
    return { size: 0.32, perCell: 8 };
  }

  if (area <= 2) return null;
  if (area <= 8) return { size: 0.05, perCell: 16 };
  if (area <= 20) return { size: 0.1, perCell: 12 };
  return { size: 0.32, perCell: 8 };
}

function resolveMapPetLimit(requestedLimit: number) {
  return Math.min(requestedLimit, MAX_MAP_MARKERS);
}

function getMapClusterGridSize(zoom: number) {
  // Keep cells coarse enough that adjacent metro neighborhoods don't
  // each become a separate overlapping bubble at regional zooms.
  const clampedZoom = Math.max(4, Math.min(11, zoom));
  if (clampedZoom < 5) return 2;
  if (clampedZoom < 6) return 1.2;
  if (clampedZoom < 7) return 0.7;
  if (clampedZoom < 8) return 0.45;
  if (clampedZoom < 9) return 0.28;
  if (clampedZoom < 10) return 0.16;
  if (clampedZoom < 11) return 0.1;
  return 0.07;
}

async function queryMapClustersForZoom(
  params: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    species?: string;
    reportStatus?: string;
    search?: string;
  },
  zoom: number,
) {
  return queryMapClusters({
    ...params,
    gridSize: getMapClusterGridSize(zoom),
  });
}

function mapClusterRows(clusters: MapClusterRow[]) {
  return clusters.map((cluster) => ({
    id: `${cluster.gridX}:${cluster.gridY}`,
    count: cluster.count,
    latitude: cluster.latitude,
    longitude: cluster.longitude,
    reportStatus: cluster.reportStatus,
    samplePetId: String(cluster.id),
    samplePet: {
      id: String(cluster.id),
      name: cluster.name,
      species: cluster.species,
      reportType: cluster.reportStatus,
      reportStatus: cluster.reportStatus,
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      cityName: cluster.cityName,
      stateCode: cluster.stateCode,
    },
  }));
}

function mapPetRows(pets: Array<MapPetRow | MapPetRecord>) {
  return pets.map((pet) => {
    const city =
      "owner" in pet
        ? resolvePetCity(pet)
        : { cityName: pet.cityName, stateCode: pet.stateCode };

    return {
      id: String(pet.id),
      name: pet.name,
      species: pet.species,
      reportType: pet.reportStatus,
      reportStatus: pet.reportStatus,
      latitude: pet.latitude,
      longitude: pet.longitude,
      cityName: city.cityName,
      stateCode: city.stateCode,
    };
  });
}

function buildFilterSql(
  params: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    species?: string;
    reportStatus?: string;
    search?: string;
  },
  tableAlias?: string,
) {
  const column = (name: string) =>
    tableAlias ? Prisma.raw(`${tableAlias}.${name}`) : Prisma.raw(name);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`${column("latitude")} >= ${params.minLat}`,
    Prisma.sql`${column("latitude")} <= ${params.maxLat}`,
    Prisma.sql`${column("longitude")} >= ${params.minLng}`,
    Prisma.sql`${column("longitude")} <= ${params.maxLng}`,
  ];

  if (
    params.species === "dog" ||
    params.species === "cat" ||
    params.species === "other"
  ) {
    conditions.push(
      Prisma.sql`${column("species")} = ${params.species}::"PetSpecies"`,
    );
  }

  if (
    params.reportStatus === "lost" ||
    params.reportStatus === "found" ||
    params.reportStatus === "resolved"
  ) {
    conditions.push(
      Prisma.sql`${column('"reportStatus"')} = ${params.reportStatus}::"PetReportStatus"`,
    );
  } else {
    conditions.push(
      Prisma.sql`${column('"reportStatus"')} != 'resolved'::"PetReportStatus"`,
    );
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      Prisma.sql`(${column("name")} ILIKE ${pattern} OR ${column('"breedLabel"')} ILIKE ${pattern})`,
    );
  }

  return Prisma.join(conditions, " AND ");
}

async function queryMapClusters(params: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  gridSize: number;
  species?: string;
  reportStatus?: string;
  search?: string;
}) {
  const whereClause = buildFilterSql(params, "p");

  return prisma.$queryRaw<MapClusterRow[]>`
    SELECT
      COUNT(*)::int AS count,
      AVG(p.latitude)::float8 AS latitude,
      AVG(p.longitude)::float8 AS longitude,
      MAX(p.id)::int AS id,
      (array_agg(p.name ORDER BY p.id DESC))[1] AS name,
      (array_agg(p.species::text ORDER BY p.id DESC))[1] AS species,
      (array_agg(p."reportStatus"::text ORDER BY p.id DESC))[1] AS "reportStatus",
      COALESCE(MAX(p."cityName"), MAX(c.name)) AS "cityName",
      COALESCE(MAX(p."stateCode"), MAX(c."stateCode")) AS "stateCode",
      FLOOR(p.latitude / ${params.gridSize})::int AS "gridX",
      FLOOR(p.longitude / ${params.gridSize})::int AS "gridY"
    FROM pets p
    INNER JOIN users u ON u.id = p."ownerId"
    INNER JOIN cities c ON c.id = u."cityId"
    WHERE ${whereClause}
    GROUP BY "gridX", "gridY"
    ORDER BY count DESC
  `;
}

async function queryMapPetsGrid(params: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  gridSize: number;
  perCell: number;
  limit: number;
  species?: string;
  reportStatus?: string;
  search?: string;
}) {
  const whereClause = buildFilterSql(params, "p");

  // Fair geographic sample:
  // 1) take up to perCell pets from every occupied cell
  // 2) rank cells so sparse areas are not starved by dense metros
  // 3) only then apply the global marker limit
  return prisma.$queryRaw<MapPetRow[]>`
    WITH ranked AS (
      SELECT
        p.id,
        p.name,
        p.species::text AS species,
        p."reportStatus",
        p.latitude,
        p.longitude,
        COALESCE(p."cityName", c.name) AS "cityName",
        COALESCE(p."stateCode", c."stateCode") AS "stateCode",
        FLOOR(p.latitude / ${params.gridSize})::int AS "gridX",
        FLOOR(p.longitude / ${params.gridSize})::int AS "gridY",
        ROW_NUMBER() OVER (
          PARTITION BY
            FLOOR(p.latitude / ${params.gridSize})::int,
            FLOOR(p.longitude / ${params.gridSize})::int
          ORDER BY p.id DESC
        ) AS rn
      FROM pets p
      INNER JOIN users u ON u.id = p."ownerId"
      INNER JOIN cities c ON c.id = u."cityId"
      WHERE ${whereClause}
    ),
    cell_stats AS (
      SELECT
        "gridX",
        "gridY",
        COUNT(*)::int AS cell_total
      FROM ranked
      GROUP BY "gridX", "gridY"
    ),
    capped AS (
      SELECT
        r.*,
        cs.cell_total,
        ROW_NUMBER() OVER (
          ORDER BY
            CASE WHEN r.rn = 1 THEN 0 ELSE 1 END,
            cs.cell_total ASC,
            r."gridX",
            r."gridY",
            r.rn,
            r.id DESC
        ) AS global_rank
      FROM ranked r
      INNER JOIN cell_stats cs
        ON cs."gridX" = r."gridX"
       AND cs."gridY" = r."gridY"
      WHERE r.rn <= ${params.perCell}
    )
    SELECT
      id,
      name,
      species,
      "reportStatus",
      latitude,
      longitude,
      "cityName",
      "stateCode"
    FROM capped
    WHERE global_rank <= ${params.limit}
    ORDER BY id DESC
  `;
}

async function appendColocatedMates(
  pets: Array<MapPetRow | MapPetRecord>,
  where: ReturnType<typeof buildMapPetsWhere>,
) {
  if (pets.length === 0 || pets.length > MAX_COLOCATED_MATE_SOURCE) return pets;

  const existingIds = pets.map((pet) => pet.id);
  const mates = await prisma.pet.findMany({
    where: {
      AND: [
        where,
        {
          id: {
            notIn: existingIds,
          },
        },
        {
          OR: pets.map((pet) => ({
            AND: [
              {
                latitude: {
                  gte: pet.latitude - COLOCATED_RADIUS_DEGREES,
                  lte: pet.latitude + COLOCATED_RADIUS_DEGREES,
                },
              },
              {
                longitude: {
                  gte: pet.longitude - COLOCATED_RADIUS_DEGREES,
                  lte: pet.longitude + COLOCATED_RADIUS_DEGREES,
                },
              },
            ],
          })),
        },
      ],
    },
    select: mapPetSelect,
  });

  if (mates.length === 0) return pets;

  const merged = [...pets, ...mates];
  return merged.length > MAX_MAP_MARKERS
    ? merged.slice(0, MAX_MAP_MARKERS)
    : merged;
}

// powers the GET /api/pets/map route
export async function getMapPets(req: Request) {
  const parsed = MapPetsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid map bounds",
      formatZodIssues(parsed.error),
    );
  }

  const {
    minLat,
    maxLat,
    minLng,
    maxLng,
    limit,
    zoom,
    species,
    reportStatus,
    search,
  } = parsed.data;

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const effectiveLimit = resolveMapPetLimit(limit);

  const where = buildMapPetsWhere({
    minLat,
    maxLat,
    minLng,
    maxLng,
    species,
    reportStatus,
    search,
  });

  const filterParams = {
    minLat,
    maxLat,
    minLng,
    maxLng,
    species,
    reportStatus,
    search,
  };

  const totalInBounds = await prisma.pet.count({ where });

  if (zoom !== undefined && zoom < MAP_CLUSTER_MAX_ZOOM) {
    const clusters = await queryMapClustersForZoom(filterParams, zoom);
    const mappedClusters = mapClusterRows(clusters);
    const represented = mappedClusters.reduce(
      (sum, cluster) => sum + cluster.count,
      0,
    );

    return {
      pets: [],
      clusters: mappedClusters.map(({ samplePet: _samplePet, ...cluster }) => cluster),
      total: totalInBounds,
      returned: represented,
    };
  }

  const gridStrategy = resolveGridStrategy(
    totalInBounds,
    effectiveLimit,
    zoom,
    latSpan,
    lngSpan,
  );

  let pets: Array<MapPetRow | MapPetRecord>;

  if (gridStrategy) {
    pets = await queryMapPetsGrid({
      ...filterParams,
      gridSize: gridStrategy.size,
      perCell: gridStrategy.perCell,
      limit: effectiveLimit,
    });
  } else {
    pets = await prisma.pet.findMany({
      where,
      orderBy: {
        id: "desc",
      },
      take: effectiveLimit,
      select: mapPetSelect,
    });
  }

  pets = await appendColocatedMates(pets, where);

  return {
    pets: mapPetRows(pets),
    total: totalInBounds,
    returned: pets.length,
  };
}
