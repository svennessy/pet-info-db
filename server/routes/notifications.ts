import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getNotifications } from "../services/notifications/getNotifications.service.js";
import { markNotificationRead } from "../services/notifications/markNotificationRead.service.js";
import { ok } from "../utils/apiResponse.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const router = Router();

router.get(
  "/notifications",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await getNotifications(req));
  }),
);

router.patch(
  "/notifications/:id/read",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await markNotificationRead(req));
  }),
);

export default router;