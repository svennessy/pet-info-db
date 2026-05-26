import { z } from "zod";

export const BreedsQuerySchema = z.object({
  species: z.enum(["dog", "cat"]).default("dog"),
  commonality: z
    .enum(["very_common", "common", "uncommon", "rare", "very_rare"])
    .optional(),
  group: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(["name", "weight", "commonality", "group"]).default("weight"),
  order: z.enum(["asc", "desc"]).default("desc"),
});