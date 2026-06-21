import { z } from "zod";

export const CreatePetSightingSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  notes: z.string().trim().max(1000).optional(),
  photoUrl: z.string().url().optional(),
});

export const PetSightingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});