import { Router } from "express";
import { ok } from "../utils/apiResponse.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getMyProfile } from "../services/profiles.service.js";

const router = Router();

router.get(
  "/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await getMyProfile(req));
  }),
);

export default router;