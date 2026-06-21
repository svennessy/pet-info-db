import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createFavorite } from "../services/favorites/createFavorite.service.js";
import { deleteFavorite } from "../services/favorites/deleteFavorite.service.js";
import { getFavorites } from "../services/favorites/getFavorites.service.js";
import { ok } from "../utils/apiResponse.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await getFavorites(req));
  }),
);

router.post(
  "/:petId",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await createFavorite(req));
  }),
);

router.delete(
  "/:petId",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await deleteFavorite(req));
  }),
);

export default router;