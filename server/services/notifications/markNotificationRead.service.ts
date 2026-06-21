import { prisma } from "../../../prisma/db.js";
import type { AuthedRequest } from "../../middleware/requireAuth.js";
import { getVerifiedProfile } from "../pets/ownership.service.js";

export async function markNotificationRead(req: AuthedRequest) {
  const profile = await getVerifiedProfile(req);
  const notificationId = Number(req.params.id);

  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      profileId: profile.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  return {
    updated: notification.count,
  };
}