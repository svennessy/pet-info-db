import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { deletePetPhoto } from "../services/photos/deletePetPhoto.service.js";
import { ok } from "../utils/apiResponse.js";
import { asyncRoute } from "../utils/asyncRoute.js";

const router = Router();

router.delete(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    ok(res, await deletePetPhoto(req));
  }),
);

export default router;