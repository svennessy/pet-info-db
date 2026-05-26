import type { Request } from "express";
import { prisma } from "../../prisma/db.js";
import { cached } from "../utils/cache.js";

// breed stats only

type Species = "dog" | "cat";

const STATS_CACHE_TTL_MS = 60_000;

function parseSpecies(value: unknown): Species {
  return value === "cat" ? "cat" : "dog";
}

async function getDogBreedStats() {
  const [total, byCommonality] = await Promise.all([
    prisma.dogBreed.count(),
    prisma.dogBreed.groupBy({
      by: ["commonality"],
      _count: { _all: true },
      orderBy: { commonality: "asc" },
    }),
  ]);

  return {
    species: "dog" as const,
    total,
    byCommonality,
  };
}

async function getCatBreedStats() {
  const [total, byCommonality] = await Promise.all([
    prisma.catBreed.count(),
    prisma.catBreed.groupBy({
      by: ["commonality"],
      _count: { _all: true },
      orderBy: { commonality: "asc" },
    }),
  ]);

  return {
    species: "cat" as const,
    total,
    byCommonality,
  };
}

export async function getBreedStats(req: Request) {
  const species = parseSpecies(req.query.species);

  return cached(`breed-stats:${species}`, STATS_CACHE_TTL_MS, async () => {
    if (species === "cat") {
      return getCatBreedStats();
    }

    return getDogBreedStats();
  });
}