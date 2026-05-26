import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
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

const candidCatsRoot = path.join(projectRoot, "data/candid-cats");
const otherPetPhotosRoot = path.join(projectRoot, "data/other-pet-photos");

/** Serve candid cat images in dev/preview (same paths as Supabase: /candid-cats/images/…). */
function candidCatsStatic(): Plugin {
  const handler = sirv(candidCatsRoot, { dev: true, etag: true });
  return {
    name: "candid-cats-static",
    configureServer(server) {
      server.middlewares.use("/candid-cats", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/candid-cats", handler);
    },
  };
}

/** Serve other-pet Pixabay images in dev/preview. */
function otherPetPhotosStatic(): Plugin {
  const handler = sirv(otherPetPhotosRoot, { dev: true, etag: true });
  return {
    name: "other-pet-photos-static",
    configureServer(server) {
      server.middlewares.use("/other-pet-photos", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/other-pet-photos", handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const assetBase =
    env.VITE_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "") ||
    env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "") ||
    "";

  return {
    plugins: [
      react(),
      stanfordDogsStatic(),
      mixedBreedDogsStatic(),
      candidCatsStatic(),
      otherPetPhotosStatic(),
    ],
    define: assetBase
      ? {
          "import.meta.env.VITE_PUBLIC_ASSET_BASE_URL":
            JSON.stringify(assetBase),
        }
      : undefined,
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
  };
});
