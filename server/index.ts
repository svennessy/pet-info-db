import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import breedsRoutes from "./routes/breeds.js";
import citiesRoutes from "./routes/cities.js";
import petPhotosRoutes from "./routes/petPhotos.js";
import petsRoutes from "./routes/pets.js";
import statsRoutes from "./routes/stats.js";
import usersRoutes from "./routes/users.js";
import { prisma } from "../prisma/db.js";

const app = express();
const port = Number(process.env.PORT) || 3002;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stanfordRoot = path.join(__dirname, "../data/stanford-dogs");
const mixedBreedRoot = path.join(__dirname, "../data/mixed-breed-dogs");
const candidCatsRoot = path.join(__dirname, "../data/candid-cats");
const otherPetPhotosRoot = path.join(__dirname, "../data/other-pet-photos");
const distRoot = path.join(__dirname, "../dist");
const isProduction = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json());

app.use("/stanford-dogs", express.static(stanfordRoot));
app.use("/mixed-breed-dogs", express.static(mixedBreedRoot));
app.use("/candid-cats", express.static(candidCatsRoot));
app.use("/other-pet-photos", express.static(otherPetPhotosRoot));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (error) {
    console.error("Health check DB error:", error);
    res.status(503).json({ ok: false, db: false });
  }
});

app.use("/api/breeds", breedsRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/pets", petsRoutes);
app.use("/api", statsRoutes);
app.use("/api", petPhotosRoutes);

if (isProduction) {
  app.use(express.static(distRoot));

  app.get(
    /^(?!\/api\/|\/stanford-dogs|\/mixed-breed-dogs|\/candid-cats|\/other-pet-photos).*/,
    (_req, res) => {
      res.sendFile(path.join(distRoot, "index.html"));
    },
  );
}

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    const statusCode =
      error instanceof Error && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 500;

    res.status(statusCode).json({
      error: error instanceof Error ? error.message : "Server error",
      details:
        error instanceof Error && "details" in error
          ? (error as { details?: unknown }).details
          : undefined,
    });
  },
);

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
  console.log("  GET /api/health");
  console.log("  GET /api/breeds");
  console.log("  GET /api/stats");
  console.log("  GET /api/cities");
  console.log("  GET /api/cities/stats");
  console.log("  GET /api/users");
  console.log("  GET /api/users/stats");
  console.log("  GET /api/pets");
  console.log("  GET /api/pets/map");
  console.log("  GET /api/pets/stats");
  console.log("  GET /api/dog-pet-photos");
  console.log("  GET /api/dog-pet-photos/stats");
  console.log("  GET /api/cat-pet-photos");
  console.log("  GET /api/cat-pet-photos/stats");
  console.log("  GET /api/other-pet-photos");
  console.log("  GET /api/other-pet-photos/stats");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or run with PORT=3003 npm run dev:server`,
    );
  } else {
    console.error(err);
  }

  process.exit(1);
});