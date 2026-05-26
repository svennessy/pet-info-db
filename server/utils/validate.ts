import type { Response } from "express";
import type { ZodError, ZodSchema } from "zod";

export function validateQuery<T>(
  schema: ZodSchema<T>,
  query: unknown,
  res: Response,
): T | null {
  const result = schema.safeParse(query);

  if (!result.success) {
    res.status(400).json({
      error: "Invalid query parameters",
      issues: formatZodIssues(result.error),
    });

    return null;
  }

  return result.data;
}

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}