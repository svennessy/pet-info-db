import { prisma } from "../../prisma/db.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { mapPetPhotosResolved } from "../resolveImageUrl.js";
import { toMapPet } from "../transformers/pets.transformer.js";
import { HttpError } from "../utils/httpError.js";

export async function getMyPets(req: AuthedRequest) {
  const authUser = req.authUser;
  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
    select: { id: true, email: true, isVerified: true },
  });

  if (!profile) {
    throw new HttpError(403, "Profile required");
  }

  const pets = await prisma.pet.findMany({
    where: {
      owner: {
        email: profile.email,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
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
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
      sightings: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          petId: true,
          latitude: true,
          longitude: true,
          locationLabel: true,
          notes: true,
          photoUrl: true,
          verificationStatus: true,
          verifiedAt: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    pets: pets.map((pet) => {
      const mapped = toMapPet(mapPetPhotosResolved(pet));

      return {
        ...mapped,
        description: pet.description ?? "",
        owner: {
          ...pet.owner,
          id: String(pet.owner.id),
        },
        sightingsCount: pet.sightings.length,
        sightings: pet.sightings.map((sighting) => ({
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
    }),
    total: pets.length,
  };
}
