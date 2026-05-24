import { petLatLongFromCity } from "../src/data/petLocation.js";
import { prisma } from "./db.js";

const BATCH = 500;
const SEED = 43;

async function main() {
  const pets = await prisma.pet.findMany({
    select: {
      id: true,
      owner: {
        select: {
          city: { select: { latitude: true, longitude: true } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`Jittering lat/long for ${pets.length} pets…`);

  for (let i = 0; i < pets.length; i += BATCH) {
    const batch = pets.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((pet) => {
        const { latitude, longitude } = petLatLongFromCity(
          pet.owner.city.latitude,
          pet.owner.city.longitude,
          pet.id,
          SEED,
        );
        return prisma.$executeRaw`
          UPDATE pets
          SET latitude = ${latitude}, longitude = ${longitude}
          WHERE id = ${pet.id}
        `;
      }),
    );
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
