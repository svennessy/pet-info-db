import { prisma } from "./db.js";

const result = await prisma.petPhoto.deleteMany({
  where: { pet: { species: "dog" } },
});
const remaining = await prisma.petPhoto.count({
  where: { pet: { species: "dog" } },
});
console.log(`Deleted ${result.count} dog pet photos. Remaining: ${remaining}.`);

await prisma.$disconnect();
