import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { HttpError } from "../../utils/httpError.js";
import { formatZodIssues } from "../../utils/zodIssues.js";
import { CreatePetReportSchema } from "../../validators/pets.validator.js";
import { reverseGeocodeLocation } from "../reverseGeocode.service.js";
import { findNearestCity } from "./location.service.js";
import { getVerifiedProfile } from "./ownership.service.js";
import { getOrCreatePostingUser } from "./postingUser.service.js";

export async function createPetReport(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);

  const parsed = CreatePetReportSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid pet report",
      formatZodIssues(parsed.error),
    );
  }

  const data = parsed.data;

  const location = await reverseGeocodeLocation(data.latitude, data.longitude);
  const nearestCity = await findNearestCity(data.latitude, data.longitude);

  const postingUser = await getOrCreatePostingUser({
    profileId: profile.id,
    email: profile.email,
    nearestCity,
  });

  const locationLabel =
    location.cityName && location.stateCode
      ? location.locationLabel
      : `${nearestCity.name}, ${nearestCity.stateCode}`;

  const petCreateData: Prisma.PetCreateInput = {
    name: data.name,
    description: data.description,
    species: data.species,
    reportStatus: data.reportStatus,
    breedLabel: data.breedLabel,
    latitude: data.latitude,
    longitude: data.longitude,
    cityName: location.cityName ?? nearestCity.name,
    stateCode: location.stateCode ?? nearestCity.stateCode,
    locationLabel,
    otherKind: data.species === "other" ? data.breedLabel : null,
    owner: {
      connect: {
        id: postingUser.id,
      },
    },
  };

  const pet = await prisma.pet.create({
    data: petCreateData,
    select: {
      id: true,
    },
  });

  if (data.photoUrls && data.photoUrls.length > 0) {
    await prisma.petPhoto.createMany({
      data: data.photoUrls.map((photoUrl, index) => ({
        petId: pet.id,
        imagePath: photoUrl,
        sortOrder: index,
        stanfordInstanceKey: null,
      })),
    });
  }

  return {
    id: String(pet.id),
  };
}