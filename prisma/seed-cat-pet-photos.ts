/** @deprecated Import path — use `npm run dataset:cat:seed`. */
import { seedCatPetPhotos } from "../scripts/datasets/cat-seed.js";

seedCatPetPhotos()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("./db.js");
    await prisma.$disconnect();
  });
