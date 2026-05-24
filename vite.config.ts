import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import sirv from "sirv";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const stanfordRoot = path.join(projectRoot, "data/stanford-dogs");
const mixedBreedRoot = path.join(projectRoot, "data/mixed-breed-dogs");

/** Serve Stanford Dogs from disk in dev/preview (no API hop). */
function stanfordDogsStatic(): Plugin {
  const handler = sirv(stanfordRoot, { dev: true, etag: true });
  return {
    name: "stanford-dogs-static",
    configureServer(server) {
      server.middlewares.use("/stanford-dogs", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/stanford-dogs", handler);
    },
  };
}

/** Serve Wikimedia mutt photos for mixed-breed pets. */
function mixedBreedDogsStatic(): Plugin {
  const handler = sirv(mixedBreedRoot, { dev: true, etag: true });
  return {
    name: "mixed-breed-dogs-static",
    configureServer(server) {
      server.middlewares.use("/mixed-breed-dogs", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/mixed-breed-dogs", handler);
    },
  };
}

const oxfordCatsRoot = path.join(projectRoot, "data/oxford-cats");

/** Serve Oxford-IIIT cat images in dev/preview. */
function oxfordCatsStatic(): Plugin {
  const handler = sirv(oxfordCatsRoot, { dev: true, etag: true });
  return {
    name: "oxford-cats-static",
    configureServer(server) {
      server.middlewares.use("/oxford-cats", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/oxford-cats", handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), stanfordDogsStatic(), mixedBreedDogsStatic(), oxfordCatsStatic()],
  server: {
    port: 5173,
    fs: {
      allow: [projectRoot],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
});
