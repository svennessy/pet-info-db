import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { createPetReport, getMapPets, getPets, deletePetReport, updatePetReport } from "../services/pets.service.js";
import { ok } from "../utils/apiResponse.js";
import { getPetStats } from "../services/petStats.service.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// map pets
// full url: /api/pets/map
// flow: frontend map -> /api/pets/map -> getMapPets() -> ok(res, result)
// for Zillow style map markers/clusters
router.get(
  "/map",
  asyncRoute(async (req, res) => {
    ok(res, await getMapPets(req));
  }),
);

// list pets
// full url: /api/pets
// flow: frontend list -> /api/pets -> getPets() -> ok(res, result)
// for pet list/table view
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

// pet stats
// full url: /api/pets/stats
// flow: frontend stats -> /api/pets/stats -> getPetStats() -> ok(res, result)
// for pet count/distribution stats
router.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getPetStats());
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