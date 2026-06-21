import type { Request } from "express";
import { prisma } from "../../../prisma/db.js";
import { reverseGeocodeLocation } from "../reverseGeocode.service.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { CreatePetSightingSchema } from "../../validators/sightings.validator.js";
import { parsePetId } from "../pets/ownership.service.js";

export async function createPetSighting(req: Request) {
  const petId = parsePetId(req.params.id);

  const parsed = CreatePetSightingSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new HttpError(400, "Invalid sighting", formatZodIssues(parsed.error));
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!pet) {
    throw new HttpError(404, "Pet not found");
  }

  const data = parsed.data;
  const location = await reverseGeocodeLocation(data.latitude, data.longitude);

  const sighting = await prisma.petSighting.create({
    data: {
      petId,
      latitude: data.latitude,
      longitude: data.longitude,
      locationLabel: location.locationLabel,
      notes: data.notes,
      photoUrl: data.photoUrl,
    },
    select: {
      id: true,
    },
  });
  
  const ownerProfile = await prisma.profile.findUnique({
    where: {
      email: pet.owner.email,
    },
    select: {
      id: true,
    },
  });

  if (ownerProfile) {
    await prisma.notification.create({
      data: {
        profileId: ownerProfile.id,
        type: "pet_sighting",
        petId,
        sightingId: sighting.id,
        message: `New sighting reported for ${pet.name}`,
      },
    });
  }

  return {
    id: String(sighting.id),
  };
}
