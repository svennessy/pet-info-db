/** Postgres URL for Prisma CLI (migrate) and the app adapter. */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      "Set DATABASE_URL (Postgres connection string) in .env — not NEXT_PUBLIC_* vars.",
    );
  }
  return url;
}
