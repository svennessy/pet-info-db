import type { Request } from "express";
import { prisma } from "../../../prisma/db.js";
import { buildMapPetsWhere } from "../../queries/pets.query.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { MapPetsQuerySchema } from "../../validators/pets.validator.js";

// powers the GET /api/pets/map route
export async function getMapPets(req: Request) {
  // validates query params (minLat, maxLat, minLng, maxLng, limit)
  // if someone sends /api/pets/map?minLat=banana Zod rejects it
  const parsed = MapPetsQuerySchema.safeParse(req.query);

  // throws clean 400 error with details
  // goes to global error handler in index.ts
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid map bounds",
      formatZodIssues(parsed.error),
    );
  }

  // extract trusted values
  const {
    minLat,
    maxLat,
    minLng,
    maxLng,
    limit,
    species,
    reportStatus,
    search,
  } = parsed.data;

  // query minimal map data
  // intentionally not loading heavy things like:
  // owner, photos, breeds, etc.
  const pets = await prisma.pet.findMany({
    where: buildMapPetsWhere({
      minLat,
      maxLat,
      minLng,
      maxLng,
      species,
      reportStatus,
      search,
    }),
    orderBy: {
      id: "desc",
    },
    take: Math.min(limit, 5000),
    select: {
      id: true,
      name: true,
      species: true,
      reportStatus: true,
      latitude: true,
      longitude: true,
    },
  });

  // transform response
  // DB shape might be: reportStatus, breedLabel
  // Frontend may want: reportType, breed
  return {
    pets: pets.map((pet) => ({
      id: String(pet.id),
      name: pet.name,
      species: pet.species,
      reportType: pet.reportStatus,
      reportStatus: pet.reportStatus,
      latitude: pet.latitude,
      longitude: pet.longitude,
    })),
    total: pets.length,
  };
}
