import { prisma } from "../prisma/db.js";

const count = await prisma.pet.count();
console.log("Pet count:", count);

await prisma.$disconnect();
