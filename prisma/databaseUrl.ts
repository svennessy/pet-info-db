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

// safely loads URL and rejects if invalid
// exists to fix common issue:
// most people use DATABASE_URL= for app queries
// and DIRECT_URL= for migrate
// so it tries DATABASE_URL first and falls back to DIRECT_URL
// example DATABASE_URL:
// postgres://local-user:password@localhost:5432/pets
// postgres://render-user:password@aws-host/pets
// postgres://supabase-user:password@db.supabase.co/postgres
