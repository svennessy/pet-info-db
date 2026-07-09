import { prisma } from "./db.js";

// Keep real user-posted pets (owners created via auth have phone "profile-<id>").
const result = await prisma.pet.deleteMany({
  where: {
    owner: {
      NOT: {
        phone: { startsWith: "profile-" },
      },
    },
  },
});
console.log(`Cleared ${result.count} seeded pets (user-posted pets kept).`);

await prisma.$disconnect();
