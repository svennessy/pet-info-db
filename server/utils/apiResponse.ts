import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({
    success: true,
    data,
  });
}