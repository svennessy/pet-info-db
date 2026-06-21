import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { getVerifiedProfile } from "../pets/ownership.service.js";

export async function getNotifications(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);

  const notifications = await prisma.notification.findMany({
    where: {
      profileId: profile.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          reportStatus: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      profileId: profile.id,
      readAt: null,
    },
  });

  return {
    notifications: notifications.map((notification) => ({
      id: String(notification.id),
      type: notification.type,
      message: notification.message,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      pet: notification.pet
        ? {
            ...notification.pet,
            id: String(notification.pet.id),
          }
        : null,
    })),
    unreadCount,
  };
}