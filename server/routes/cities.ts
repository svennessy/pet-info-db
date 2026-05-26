import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getCities, getCityStats } from "../services/cities.service.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/",
  asyncRoute(async (req, res) => {
    ok(res, await getCities(req));
  }),
);

router.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getCityStats());
  }),
);

export default router;