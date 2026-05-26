import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getBreeds } from "../services/breeds.service.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/",
  asyncRoute(async (req, res) => {
    ok(res, await getBreeds(req));
  }),
);

export default router;