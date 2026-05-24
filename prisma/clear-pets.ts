import { prisma } from "./db.js";

const result = await prisma.pet.deleteMany();
console.log(`Cleared ${result.count} pets (photos cascade).`);

await prisma.$disconnect();
