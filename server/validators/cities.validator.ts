import { z } from "zod";

export const CitiesQuerySchema = z.object({
  state: z.string().trim().optional(),
  search: z.string().trim().optional(),

  sort: z
    .enum([
      "name",
      "population",
      "stateCode",
      "rankInState",
      "latitude",
      "longitude",
    ])
    .default("population"),

  order: z.enum(["asc", "desc"]).default("desc"),
});