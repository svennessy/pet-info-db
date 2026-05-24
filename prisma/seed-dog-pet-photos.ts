/** @deprecated Use `npm run dataset:dog:seed`. */
import { seedDogPetPhotos } from "../scripts/datasets/dog-seed.js";

seedDogPetPhotos()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("./db.js");
    await prisma.$disconnect();
  });
