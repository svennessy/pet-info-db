import { prisma } from "../prisma/db.js";

const rows = await prisma.$queryRaw<
  Array<{ species: string; kind: string; c: number }>
>`
  SELECT
    p.species::text AS species,
    CASE
      WHEN pp."imagePath" LIKE 'https://pixabay%' THEN 'pixabay'
      WHEN pp."imagePath" LIKE 'https://cdn.pixabay%' THEN 'cdn.pixabay'
      WHEN pp."imagePath" LIKE 'https://%' THEN 'https-other'
      WHEN pp."imagePath" LIKE '%supabase.co/storage%' THEN 'supabase'
      WHEN pp."imagePath" LIKE '/stanford%' THEN 'stanford'
      WHEN pp."imagePath" LIKE '/oxford%' THEN 'oxford'
      WHEN pp."imagePath" LIKE '/mixed%' THEN 'mutt'
      WHEN pp."imagePath" LIKE '/%' THEN 'relative-other'
      ELSE 'unknown'
    END AS kind,
    COUNT(*)::int AS c
  FROM pet_photos pp
  JOIN pets p ON p.id = pp."petId"
  GROUP BY 1, 2
  ORDER BY 1, c DESC
`;

console.log("Photo paths by species and kind:\n");
for (const row of rows) {
  console.log(`  ${row.species.padEnd(6)} ${row.kind.padEnd(16)} ${row.c}`);
}

const samples = await prisma.$queryRaw<
  Array<{ species: string; imagePath: string }>
>`
  SELECT DISTINCT ON (p.species, kind)
    p.species::text AS species,
    pp."imagePath" AS "imagePath"
  FROM pet_photos pp
  JOIN pets p ON p.id = pp."petId"
  JOIN LATERAL (
    SELECT CASE
      WHEN pp."imagePath" LIKE 'https://pixabay%' OR pp."imagePath" LIKE 'https://cdn.pixabay%' THEN 'pixabay'
      WHEN pp."imagePath" LIKE '%supabase.co/storage%' THEN 'supabase'
      WHEN pp."imagePath" LIKE '/stanford%' THEN 'stanford'
      WHEN pp."imagePath" LIKE '/oxford%' THEN 'oxford'
      WHEN pp."imagePath" LIKE '/%' THEN 'relative'
      ELSE 'https'
    END AS kind
  ) k ON true
  ORDER BY p.species, kind, pp.id
  LIMIT 20
`;

console.log("\nSample paths:");
for (const s of samples) {
  console.log(`  [${s.species}] ${s.imagePath.slice(0, 100)}`);
}

await prisma.$disconnect();
