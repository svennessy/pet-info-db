import { generateUsers } from "../src/data/userGenerator.js";
import { prisma } from "./db.js";

const USER_COUNT = 20_000;
const BATCH = 500;
const SEED = 42;

async function main() {
  const cities = await prisma.city.findMany({
    select: { id: true, stateCode: true, population: true },
  });

  if (cities.length === 0) {
    throw new Error("No cities in database. Run npm run db:seed first.");
  }

  console.log(`Generating ${USER_COUNT} users across ${cities.length} cities…`);
  const generated = generateUsers(USER_COUNT, cities, SEED);

  console.log("Clearing existing users…");
  await prisma.user.deleteMany();

  console.log("Inserting users…");
  for (let i = 0; i < generated.length; i += BATCH) {
    const batch = generated.slice(i, i + BATCH);
    await prisma.user.createMany({ data: batch });
    console.log(
      `  users ${Math.min(i + BATCH, generated.length)} / ${generated.length}`,
    );
  }

  const total = await prisma.user.count();
  const topCities = await prisma.user.groupBy({
    by: ["cityId"],
    _count: { _all: true },
    orderBy: { _count: { cityId: "desc" } },
    take: 5,
  });

  console.log(`Done. ${total} users in database.`);
  console.log("Top 5 cities by user count:", topCities);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
