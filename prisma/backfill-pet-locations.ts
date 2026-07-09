import { petLatLongFromCity } from "../src/data/petLocation.js";
import { prisma } from "./db.js";

const BATCH = 1000;
const SEED = 43;

async function main() {
  const pets = await prisma.pet.findMany({
    select: {
      id: true,
      owner: {
        select: {
          cityId: true,
          city: { select: { latitude: true, longitude: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`Jittering lat/long (land-safe) for ${pets.length} pets…`);

  for (let i = 0; i < pets.length; i += BATCH) {
    const batch = pets.slice(i, i + BATCH);
    const ids: number[] = [];
    const lats: number[] = [];
    const lngs: number[] = [];

    for (const pet of batch) {
      const { latitude, longitude } = petLatLongFromCity(
        pet.owner.city.latitude,
        pet.owner.city.longitude,
        pet.id,
        SEED,
        pet.owner.cityId,
      );
      ids.push(pet.id);
      lats.push(latitude);
      lngs.push(longitude);
    }

    await prisma.$executeRaw`
      UPDATE pets AS p
      SET
        latitude = v.latitude,
        longitude = v.longitude
      FROM (
        SELECT *
        FROM unnest(
          ${ids}::int[],
          ${lats}::float8[],
          ${lngs}::float8[]
        ) AS t(id, latitude, longitude)
      ) AS v
      WHERE p.id = v.id
    `;

    console.log(`  ${Math.min(i + BATCH, pets.length)} / ${pets.length}`);
  }

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
