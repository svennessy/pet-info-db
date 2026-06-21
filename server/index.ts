import "dotenv/config";
// allows frontend to call backend from another port/domain
import cors from "cors";
// runs the api
import express from "express";
// node utilities for path manipulation
// needed bc project uses "type: module"
// with ES modules __dirname doesn't exist so we rebuild manually
import path from "node:path";
import { fileURLToPath } from "node:url";

// each are mini-routers
// ie: petsRoutes contains /map, /, and /stats
// this file mounts it under /api/pets
// ie: /api/pets/map, /api/pets/, /api/pets/stats
import breedsRoutes from "./routes/breeds.js";
import citiesRoutes from "./routes/cities.js";
import petPhotosRoutes from "./routes/petPhotos.js";
import petsRoutes from "./routes/pets.js";
import statsRoutes from "./routes/stats.js";
import usersRoutes from "./routes/users.js";
import profilesRoutes from "./routes/profiles.js";
import photosRoutes from "./routes/photos.js";
import sightingsRoutes from "./routes/sightings.js";
import favoritesRoutes from "./routes/favorites.js";
import notificationsRoutes from "./routes/notifications.js";
// only used to check db connection
import { prisma } from "../prisma/db.js";

// create express app
const app = express();
// locally PORT probably missing -> uses 3002
// on render render sets PORT -> uses render's PORT
// important bc render port should not be hardcoded
const port = Number(process.env.PORT) || 3002;

// points to ".../server" bc this file is in server/index.ts
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// static roots for locl dev urls like "http://localhost:3002/stanford-dogs/images/stanford-dog-00001.jpg"
const stanfordRoot = path.join(__dirname, "../data/stanford-dogs");
const mixedBreedRoot = path.join(__dirname, "../data/mixed-breed-dogs");
const candidCatsRoot = path.join(__dirname, "../data/candid-cats");
const otherPetPhotosRoot = path.join(__dirname, "../data/other-pet-photos");
// vites production build output
// when vite builds frontend "dist/" contains HTML/JS/CSS
const distRoot = path.join(__dirname, "../dist");
// determines if we're in production or development
const isProduction = process.env.NODE_ENV === "production";

// middleware:
// cors: allows frontend to call backend from another port/domain
app.use(cors());
// lets express parse JSON bodies
// ie: POST /api/pets { name: "Fluffy", age: 2 }, Content-Type: application/json
// req.body would be undefined without this
app.use(express.json());

// maps photo url to location folders
app.use("/stanford-dogs", express.static(stanfordRoot));
app.use("/mixed-breed-dogs", express.static(mixedBreedRoot));
app.use("/candid-cats", express.static(candidCatsRoot));
app.use("/other-pet-photos", express.static(otherPetPhotosRoot));

// endpoint to check if db is connected
// useful for render and debugging
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (error) {
    console.error("Health check DB error:", error);
    res.status(503).json({ ok: false, db: false });
  }
});

// route mounting
// if breedsRoutes has "router.get("/")"
// final url is GET /api/breeds
app.use("/api/breeds", breedsRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/pets", petsRoutes);
app.use("/api", statsRoutes);
app.use("/api", petPhotosRoutes);
app.use("/api/photos", photosRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api", sightingsRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api", notificationsRoutes);
// in production express can serve the built react app
// so render can host both API and frontend build from one service
if (isProduction) {
  app.use(express.static(distRoot));

  // for react routing
  // if user visits /signup there is no physical file called /signup
  // so express serves dist/index.html and react router handles the rest
  // the regex matches any url that doesn't start with /api/, /stanford-dogs/, /mixed-breed-dogs/, /candid-cats/, or /other-pet-photos/
  app.get(
    /^(?!\/api\/|\/stanford-dogs|\/mixed-breed-dogs|\/candid-cats|\/other-pet-photos).*/,
    (_req, res) => {
      res.sendFile(path.join(distRoot, "index.html"));
    },
  );
}

// catches errors thrown by routes/services
// ie: throw new HttpError(400, "Invalid pet list query", ...) lands here
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

    // gives frontend predictable error json
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : "Server error",
      details:
        error instanceof Error && "details" in error
          ? (error as { details?: unknown }).details
          : undefined,
    });
  },
);

// where backend actually starts listening
// locally: http://localhost:3002
// on render: https://react-ts-pet-db.onrender.com
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
  console.log("  GET /api/profiles/me");
});

// port error handling
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