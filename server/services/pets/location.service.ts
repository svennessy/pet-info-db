import { prisma } from "../../../prisma/db.js";

export async function findNearestCity(latitude: number, longitude: number) {
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

export type NearestCity = Awaited<ReturnType<typeof findNearestCity>>;