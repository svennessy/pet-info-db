import type { Request } from "express";
import { prisma } from "../../../prisma/db.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { PetSightingsQuerySchema } from "../../validators/sightings.validator.js";
import { parsePetId } from "../pets/ownership.service.js";

export async function getPetSightings(req: Request) {
  const petId = parsePetId(req.params.id);

  const parsed = PetSightingsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid sightings query",
      formatZodIssues(parsed.error),
    );
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { id: true },
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  const sightings = await prisma.petSighting.findMany({
    where: { petId },
    orderBy: {
      createdAt: "desc",
    },
    take: parsed.data.limit,
  });

  return {
    sightings: sightings.map((sighting) => ({
      id: String(sighting.id),
      petId: String(sighting.petId),
      latitude: sighting.latitude,
      longitude: sighting.longitude,
      locationLabel: sighting.locationLabel,
      notes: sighting.notes,
      photoUrl: sighting.photoUrl,
      verificationStatus: sighting.verificationStatus,
      verifiedAt: sighting.verifiedAt?.toISOString() ?? null,
      createdAt: sighting.createdAt.toISOString(),
    })),
  };
}