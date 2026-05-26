import { z } from "zod";

export const UsersQuerySchema = z.object({
  state: z.string().trim().optional(),
  cityId: z.string().trim().optional(),
  search: z.string().trim().optional(),

  sort: z
    .enum(["firstName", "lastName", "email", "city", "state"])
    .default("lastName"),

  order: z.enum(["asc", "desc"]).default("desc"),

  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});