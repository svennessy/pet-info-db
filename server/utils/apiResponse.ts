// creates a consistent API contract between back and frontend
// examples before:
// res.json(pets); or
// res.json({pets,total,}); or
// res.status(201).json(user);
// after, every successful response looks like:
// { success: true, data: ... }

import type { Response } from "express";

// generic success response helper
// eg: ok(res, {pets: [...]}); returns { success: true, data: {pets: [...]} }
// <T> means it accepts any type of data
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

// for POST requests and resource creation
// returns {"success": true, "data": ...}
export function created<T>(res: Response, data: T) {
  return res.status(201).json({
    success: true,
    data,
  });
}

// API now has predictable shape:
// { success: true, data: ... }
// or
// { success: false, error: ... }
// or
// { success: false, error: ..., details: ... }
// which makes it easier to handle in frontend
// and provides a clear contract for error handling
// ie: if (response.success) { ... } else { handleError(response.error) }