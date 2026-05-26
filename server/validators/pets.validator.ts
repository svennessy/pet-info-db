import { z } from "zod";

export const MapPetsQuerySchema = z.object({
  minLat: z.coerce.number().min(-90).max(90),
  maxLat: z.coerce.number().min(-90).max(90),
  minLng: z.coerce.number().min(-180).max(180),
  maxLng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(25000).default(25000),
});

export const PetsListQuerySchema = z.object({
  species: z.enum(["dog", "cat", "other"]).optional(),
  reportStatus: z.enum(["lost", "found"]).optional(),
  state: z.string().trim().optional(),
  breed: z.string().trim().optional(),
  search: z.string().trim().optional(),

  sort: z
    .enum(["name", "species", "reportStatus", "breedLabel", "owner", "state"])
    .default("name"),

  order: z.enum(["asc", "desc"]).default("desc"),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});