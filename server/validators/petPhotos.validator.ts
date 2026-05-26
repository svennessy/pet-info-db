import { z } from "zod";

export const PhotoPetListQuerySchema = z.object({
  reportStatus: z.enum(["lost", "found"]).optional(),
  state: z.string().trim().optional(),
  breed: z.string().trim().optional(),
  kind: z.enum(["Bird", "Rabbit"]).optional(),
  search: z.string().trim().optional(),

  sort: z
    .enum(["name", "species", "reportStatus", "breedLabel", "owner", "state"])
    .default("name"),

  order: z.enum(["asc", "desc"]).default("desc"),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});