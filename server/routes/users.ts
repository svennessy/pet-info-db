import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { getUsers, getUserStats } from "../services/users.service.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/",
  asyncRoute(async (req, res) => {
    ok(res, await getUsers(req));
  }),
);

router.get(
  "/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getUserStats());
  }),
);

export default router;