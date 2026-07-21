import { z } from "zod";
import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { getVerifiedProfile } from "../pets/ownership.service.js";

const UpdateSightingVerificationSchema = z.object({
  verificationStatus: z.enum(["unverified", "verified"]),
});

function parseSightingId(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    throw new HttpError(400, "Invalid sighting id");
  }

  const sightingId = Number(raw);
  if (!Number.isInteger(sightingId)) {
    throw new HttpError(400, "Invalid sighting id");
  }

  return sightingId;
}

async function getOwnedSighting(params: {
  sightingId: number;
  profileEmail: string;
}) {
  const sighting = await prisma.petSighting.findUnique({
    where: { id: params.sightingId },
    select: {
      id: true,
      petId: true,
      verificationStatus: true,
      pet: {
        select: {
          id: true,
          name: true,
          owner: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (!sighting) {
    throw new HttpError(404, "Sighting not found");
  }

  if (sighting.pet.owner.email !== params.profileEmail) {
    throw new HttpError(403, "You can only manage sightings for your own pets");
  }

  return sighting;
}

export async function updateSightingVerification(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const sightingId = parseSightingId(req.params.id);
  const parsed = UpdateSightingVerificationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid verification update",
      formatZodIssues(parsed.error),
    );
  }

  await getOwnedSighting({
    sightingId,
    profileEmail: profile.email,
  });

  const { verificationStatus } = parsed.data;
  const updated = await prisma.petSighting.update({
    where: { id: sightingId },
    data: {
      verificationStatus,
      verifiedAt: verificationStatus === "verified" ? new Date() : null,
    },
    select: {
      id: true,
      petId: true,
      verificationStatus: true,
      verifiedAt: true,
    },
  });

  return {
    id: String(updated.id),
    petId: String(updated.petId),
    verificationStatus: updated.verificationStatus,
    verifiedAt: updated.verifiedAt?.toISOString() ?? null,
  };
}

export async function deletePetSighting(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const sightingId = parseSightingId(req.params.id);

  await getOwnedSighting({
    sightingId,
    profileEmail: profile.email,
  });

  await prisma.petSighting.delete({
    where: { id: sightingId },
  });

  return {
    id: String(sightingId),
  };
}
