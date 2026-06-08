import type { Request } from "express";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma/db.js";
import { CreatePetReportSchema } from "../validators/pets.validator.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import {
  buildMapPetsWhere,
  buildPetListWhere,
  buildPetOrderBy,
} from "../queries/pets.query.js";
import { mapPetPhotosResolved } from "../resolveImageUrl.js";
import { toMapPet, toPetListItem } from "../transformers/pets.transformer.js";
import { HttpError } from "../utils/httpError.js";
import { formatZodIssues } from "../utils/zodIssues.js";
import {
  MapPetsQuerySchema,
  PetsListQuerySchema,
} from "../validators/pets.validator.js";
import { reverseGeocodeLocation } from "./reverseGeocode.service.js";

// map and pet list

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
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      species: true,
      reportStatus: true,
      breedLabel: true,
      latitude: true,
      longitude: true,
      cityName: true,
      stateCode: true,
      locationLabel: true,

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

      photos: {
        orderBy: {
          sortOrder: "asc",
        },
        take: 4,
        select: {
          id: true,
          petId: true,
          imagePath: true,
          sortOrder: true,
          stanfordInstanceKey: true,
          createdAt: true,
        },
      },
    },
  });

  // transform response
  // DB shape might be: reportStatus, breedLabel
  // Frontend may want: reportType, breed
  return {
    pets: pets.map((pet) => ({
      ...toMapPet(pet),
      owner: pet.owner,
      photos: mapPetPhotosResolved(pet).photos ?? [],
    })),
    total: pets.length,
  };
}

// powers the GET /api/pets route
// for pet list/table view
export async function getPets(req: Request) {
  // validates query params (species, reportStatus, state, breedSlug, search, sort, order, page, limit)
  const parsed = PetsListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    // throws clean 400 error with details
    throw new HttpError(
      400,
      "Invalid pet list query",
      formatZodIssues(parsed.error),
    );
  }

  // pull out filters
  // breedSlug is renamed bc frontend query param is "breed" but DB field is "dogBreedSlug"/"catBreedSlug"
  const {
    species,
    reportStatus,
    state,
    breed: breedSlug,
    search = "",
    sort,
    order,
    page,
    limit,
  } = parsed.data;

  // pagination math
  // if page = 1 limit = 50, skip = 0
  // if page = 2 limit = 50, skip = 50
  const skip = (page - 1) * limit;

  // build query parts
  // this returns a prisma where object
  // ie. { species: "dog", reportStatus: "lost", owner: { city: { stateCode: "VA" } } }
  const where = buildPetListWhere({
    species,
    reportStatus,
    state,
    breedSlug,
    search,
  });

  // ie. { name: "asc" } or { owner: { lastName: "desc" } }
  const orderBy = buildPetOrderBy(sort, order);

  // run two queries in parallel
  // pets = current page rows
  // total = total number of rows
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

  // return paginated result
  return {
    pets: pets.map(toPetListItem),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function findNearestCity(latitude: number, longitude: number) {
  const cities = await prisma.city.findMany({
    select: {
      id: true,
      name: true,
      stateCode: true,
      latitude: true,
      longitude: true,
    },
  });

  if (cities.length === 0) {
    throw new Error("No cities available.");
  }

  return cities.reduce((nearest, city) => {
    const nearestDistance =
      Math.abs(nearest.latitude - latitude) +
      Math.abs(nearest.longitude - longitude);

    const cityDistance =
      Math.abs(city.latitude - latitude) + Math.abs(city.longitude - longitude);

    return cityDistance < nearestDistance ? city : nearest;
  });
}

type NearestCity = Awaited<ReturnType<typeof findNearestCity>>;

async function getOrCreatePostingUser(params: {
  profileId: string;
  email: string;
  nearestCity: NearestCity;
}) {
  const { nearestCity } = params;

  const existing = await prisma.user.findFirst({
    where: {
      email: params.email,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        cityId: nearestCity.id,
      },
      select: {
        id: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      firstName: "Spot",
      lastName: "User",
      email: params.email,
      phone: `profile-${params.profileId}`,
      cityId: nearestCity.id,
    },
    select: {
      id: true,
    },
  });
}

export async function createPetReport(req: AuthedRequest) {
  const authUser = req.authUser;

  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const profile = await prisma.profile.findUnique({
    where: {
      id: authUser.id,
    },
    select: {
      id: true,
      email: true,
      isVerified: true,
    },
  });

  if (!profile) {
    throw new HttpError(403, "Profile required");
  }

  if (!profile.isVerified) {
    throw new HttpError(403, "Verification required before posting");
  }

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

  console.log("resolved save location", {
    location,
    nearestCity,
    locationLabel,
  });

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

  return {
    id: String(pet.id),
  };
}

export async function deletePetReport(req: AuthedRequest) {
  const authUser = req.authUser;

  if (!authUser) {
    throw new HttpError(401, "Authentication required");
  }

  const petId = Number(req.params.id);

  if (!Number.isInteger(petId)) {
    throw new HttpError(400, "Invalid pet id");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
    select: {
      email: true,
      isVerified: true,
    },
  });

  if (!profile?.isVerified) {
    throw new HttpError(403, "Verification required");
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: {
      id: true,
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

  if (pet.owner.email !== profile.email) {
    throw new HttpError(403, "You can only delete your own posts");
  }

  await prisma.pet.delete({
    where: { id: petId },
  });

  return { id: String(petId) };
}