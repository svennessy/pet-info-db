import { prisma } from "./db.js";
import { seededPetDeleteWhere } from "./seededPetDeleteWhere.js";

// Keep user-posted pets and any seeded pets with sightings or favorites
// (those cascade-delete and would empty Bulletin / Saved).
const result = await prisma.pet.deleteMany({
  where: seededPetDeleteWhere,
});
console.log(
  `Cleared ${result.count} seeded pets (user-posted + interacted pets kept).`,
);

await prisma.$disconnect();
