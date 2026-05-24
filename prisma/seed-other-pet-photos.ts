/** @deprecated Import path — use `npm run dataset:other:seed`. */
import { seedOtherPetPhotos } from "../scripts/datasets/other-seed.js";

seedOtherPetPhotos()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("./db.js");
    await prisma.$disconnect();
  });
