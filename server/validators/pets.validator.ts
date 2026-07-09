import { z } from "zod";

// takes random internet input
// converts it into trusted ts data
// before this file:
// req.query is basically Record<string, string | string[] | undefined>
// after this file:
// parsed.data is fully typed

// validates query params for GET /api/pets/map route
// example: /api/pets/map?minLat=35&maxLat=408&minLng=-80&maxLng=-70
// creates the following zod object:
// {
//   minLat: z.coerce.number().min(-90).max(90),
//   maxLat: z.coerce.number().min(-90).max(90),
//   minLng: z.coerce.number().min(-180).max(180),
//   maxLng: z.coerce.number().min(-180).max(180),
//   limit: z.coerce.number().int().min(1).max(25000).default(25000),
// }
export const MapPetsQuerySchema = z.object({
  minLat: z.coerce.number().min(-90).max(90),
  maxLat: z.coerce.number().min(-90).max(90),
  minLng: z.coerce.number().min(-180).max(180),
  maxLng: z.coerce.number().min(-180).max(180),
  // protecting from someone saying limit=10000000000 and crashing performance
  limit: z.coerce.number().int().min(1).max(8000).default(8000),
  zoom: z.coerce.number().min(0).max(22).optional(),
  page: z.coerce.number().int().min(1).default(1),

  species: z.enum(["dog", "cat", "other"]).optional(),
  reportStatus: z.enum(["lost", "found", "resolved"]).optional(),
  search: z.string().trim().optional(),

  sort: z.enum(["createdAt", "name"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// validates query params for GET /api/pets route
export const PetsListQuerySchema = z.object({
  species: z.enum(["dog", "cat", "other"]).optional(),
  reportStatus: z.enum(["lost", "found", "resolved"]).optional(),
  state: z.string().trim().optional(),
  breed: z.string().trim().optional(),
  search: z.string().trim().optional(),

  // protects query builder
  // ie. if someone sends sort=DROP_TABLE_USERS Zod rejects it
  sort: z
    .enum([
      "name",
      "species",
      "reportStatus",
      "breedLabel",
      "owner",
      "state",
      "createdAt",
    ])
    .default("createdAt"),

  order: z.enum(["asc", "desc"]).default("desc"),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const CreatePetReportSchema = z.object({
  reportStatus: z.enum(["lost", "found", "resolved"]),
  species: z.enum(["dog", "cat", "other"]),

  name: z.string().trim().min(1).max(80),
  breedLabel: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoUrls: z.array(z.string().url()).max(6).optional(),
});

export const UpdatePetReportSchema = CreatePetReportSchema.partial();
