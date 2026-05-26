import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getBreedStats } from "../services/stats.service.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/stats",
  asyncRoute(async (req, res) => {
    ok(res, await getBreedStats(req));
  }),
);

export default router;