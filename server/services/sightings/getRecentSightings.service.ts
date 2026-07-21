import type { Request } from "express";
import { prisma } from "../../../prisma/db.js";
import { mapPetPhotosResolved } from "../../resolveImageUrl.js";
import { toMapPet } from "../../transformers/pets.transformer.js";

export async function getRecentSightings(req: Request) {
  const limit = Math.min(Number(req.query.limit ?? 24), 50);

  const sightings = await prisma.petSighting.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      pet: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
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
          photos: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 4,
          },
        },
      },
    },
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
      pet: {
        ...toMapPet(sighting.pet),
        photos: mapPetPhotosResolved(sighting.pet).photos ?? [],
        owner: sighting.pet.owner
          ? {
              ...sighting.pet.owner,
              id: String(sighting.pet.owner.id),
            }
          : null,
      },
    })),
    total: sightings.length,
  };
}