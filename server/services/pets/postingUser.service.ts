import { prisma } from "../../../prisma/db.js";
import type { NearestCity } from "./location.service.js";

export async function getOrCreatePostingUser(params: {
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