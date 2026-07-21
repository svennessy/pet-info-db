import { prisma } from "../../prisma/db.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { getVerifiedProfile } from "./pets/ownership.service.js";

export async function getProfileDashboard(req: AuthedRequest) {
  const authUser = req.authUser;
  

  if (!authUser) {
    throw new Error("Missing authenticated user");
  }

  const profile = await getVerifiedProfile(req);

  const [reportsCount, favoritesCount, sightingsCount, recentReports] =
    await Promise.all([
      prisma.pet.count({
        where: {
          owner: {
            email: profile.email,
          },
        },
      }),

      prisma.favoritePet.count({
        where: {
          profileId: profile.id,
        },
      }),

      prisma.petSighting.count({
        where: {
          pet: {
            owner: {
              email: profile.email,
            },
          },
        },
      }),

      prisma.pet.findMany({
        where: {
          owner: {
            email: profile.email,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          name: true,
          reportStatus: true,
          createdAt: true,
          latitude: true,
          longitude: true,
        },
      }),
    ]);

  return {
    profile,
    stats: {
      reportsCount,
      favoritesCount,
      sightingsCount,
    },
    recentReports: recentReports.map((report) => ({
      ...report,
      id: String(report.id),
    })),
  };
}
