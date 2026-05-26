import type { Request } from "express";

export function parseListQuery(
  req: Request,
  defaultSort: string,
  allowed: readonly string[],
) {
  const sort = (req.query.sort as string) || defaultSort;
  const order = req.query.order === "asc" ? "asc" : "desc";
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const sortField = allowed.includes(sort) ? sort : defaultSort;

  return { sortField, order, search };
}

export function parsePagination(
  req: Request,
  defaultLimit = 50,
  maxLimit = 200,
) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number(req.query.limit) || defaultLimit),
  );

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function parseStringQuery(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}