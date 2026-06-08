import { prisma } from "../../prisma/db.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";

export async function getMyProfile(req: AuthedRequest) {
  const authUser = req.authUser;
  if (!authUser) throw new Error("Missing authenticated user");

  return prisma.profile.upsert({
    where: { id: authUser.id },
    update: {
      email: authUser.email ?? "",
    },
    create: {
      id: authUser.id,
      email: authUser.email ?? "",
      isVerified: false,
    },
  });
}
