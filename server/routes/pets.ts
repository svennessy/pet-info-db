import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  createPetReport,
  getPets,
  deletePetReport,
  updatePetReport,
  getPetById,
} from "../services/pets.service.js";
import { getMapPets } from "../services/pets/getMapPets.service.js";
import { getSidebarPets } from "../services/pets/getSidebarPets.service.js";
import { ok } from "../utils/apiResponse.js";
import { getPetStats } from "../services/petStats.service.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get(
  "/map",
  asyncRoute(async (req, res) => {
    ok(res, await getMapPets(req));
  }),
);

router.get(
  "/sidebar",
  asyncRoute(async (req, res) => {
    ok(res, await getSidebarPets(req));
  }),
);

router.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getPetStats());
  }),
);

router.get(
  "/",
  asyncRoute(async (req, res) => {
    ok(res, await getPets(req));
  }),
);

router.post(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await createPetReport(req));
  }),
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    ok(res, await getPetById(req));
  }),
);

router.delete(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await deletePetReport(req));
  }),
);

router.patch(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await updatePetReport(req));
  }),
);

export default router;

// asyncRoute wrapper prevents repeated try/catch/error handling
// instead of:
/**
 * try {
 *   ...
 * } catch (err) {
 *   next(err);
 * }
 */
// uses:
/**
 * asyncRoute(async (req, res) => {
 *   ...
 * }
 */
// if getPets() throws, it goes to global error handler in index.ts
// ok standardizes response format:
// instead of:
/**
 * {"pets": [...]}
 *
 * it now returns:
 * {
 *   "status": "success",
 *   "data": {
 *     "pets": [...],
 *   },
 * }
 *
 * frontend apiFetch<T>() unwraps it
 */
