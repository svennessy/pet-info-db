import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createPetSighting } from "../services/sightings/createPetSighting.service.js";
import { getPetSightings } from "../services/sightings/getPetSightings.service.js";
import {
  deletePetSighting,
  updateSightingVerification,
} from "../services/sightings/managePetSighting.service.js";
import { ok } from "../utils/apiResponse.js";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getRecentSightings } from "../services/sightings/getRecentSightings.service.js";

const router = Router();

router.get(
  "/sightings/recent",
  asyncRoute(async (req, res) => {
    ok(res, await getRecentSightings(req));
  }),
);

router.patch(
  "/sightings/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await updateSightingVerification(req));
  }),
);

router.delete(
  "/sightings/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await deletePetSighting(req));
  }),
);

router.get(
  "/pets/:id/sightings",
  asyncRoute(async (req, res) => {
    ok(res, await getPetSightings(req));
  }),
);

router.post(
  "/pets/:id/sightings",
  asyncRoute(async (req, res) => {
    ok(res, await createPetSighting(req));
  }),
);

export default router;
