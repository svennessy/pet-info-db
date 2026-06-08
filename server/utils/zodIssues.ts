// when validation fails:
// PetsListQuerySchema.safeParse(req.query)
// Zod returns similar:
// {
//   success: false,
//   error: {
//     issues: [
//       {
//         code: "invalid_type",
//         expected: "string",
//         received: "number",
//         path: ["page"],
//         message: "Expected string, received number"
//       }
//     ]
//   }
// }

import type { ZodError } from "zod";

// accepts a zod error and converts to simpler
export function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    // only path and message survive
    // example: ["owner", "city", "stateCode"] -> "owner.city.stateCode"
    path: issue.path.join("."),
    // example: "Expected string, received number"
    message: issue.message,
  }));
}

// realtime example:
// someone requests /api/pets?species=dragon
// validator: species: z.enum(["dog", "cat", "other"]) fails
// zod internally generates: { path: ["species"], message: "Invalid enum value" }
// formatter returns: { path: "species", message: "Invalid enum value" }

// connects to HttpError like so:
// throw new HttpError(400, "Invalid query", formatZodIssues(parsed.error));
// which returns:
// { statusCode: 400, message: "Invalid pet list query", details: [{ path: "species", message: "Invalid enum value" }] }
// global error handler in server/index.ts returns json like:
// { "error": "Invalid pet list query", "details": [{ "path": "species", "message": "Invalid enum value" }] }

