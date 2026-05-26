import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getMapPets, getPets } from "../services/pets.service.js";
import { ok } from "../utils/apiResponse.js";
import { getPetStats } from "../services/petStats.service.js";

const router = Router();

router.get(
  "/map",
  asyncRoute(async (req, res) => {
    ok(res, await getMapPets(req));
  }),
);

router.get(
  "/",
  asyncRoute(async (req, res) => {
    ok(res, await getPets(req));
  }),
);

router.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getPetStats());
  }),
);

export default router;
