import { Router } from "express";
import { ok } from "../utils/apiResponse.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getMyPets } from "../services/getMyPets.service.js";
import { getMyProfile } from "../services/profiles.service.js";
import { getProfileDashboard } from "../services/profileDashboard.service.js";

const router = Router();

router.get(
  "/me/dashboard",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await getProfileDashboard(req));
  }),
);

router.get(
  "/me/pets",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await getMyPets(req));
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await getMyProfile(req));
  }),
);

export default router;
