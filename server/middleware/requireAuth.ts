import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../auth/supabaseAdmin.js";

export type AuthedRequest = Request & {
  authUser?: {
    id: string;
    email?: string;
  };
};

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    res.status(401).json({ success: false, error: "Missing auth token" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: "Invalid auth token" });
    return;
  }

  req.authUser = {
    id: data.user.id,
    email: data.user.email,
  };

  next();
}