import { Router } from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import {
  getPhotoPetList,
  getPhotoPetStats,
} from "../services/petPhotos.service.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();

router.get(
  "/dog-pet-photos",
  asyncRoute(async (req, res) => {
    ok(res, await getPhotoPetList(req, "dog"));
  }),
);

router.get(
  "/dog-pet-photos/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getPhotoPetStats("dog"));
  }),
);

router.get(
  "/cat-pet-photos",
  asyncRoute(async (req, res) => {
    ok(res, await getPhotoPetList(req, "cat"));
  }),
);

router.get(
  "/cat-pet-photos/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getPhotoPetStats("cat"));
  }),
);

router.get(
  "/other-pet-photos",
  asyncRoute(async (req, res) => {
    ok(res, await getPhotoPetList(req, "other"));
  }),
);

router.get(
  "/other-pet-photos/stats",
  asyncRoute(async (_req, res) => {
    ok(res, await getPhotoPetStats("other"));
  }),
);

export default router;