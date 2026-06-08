import { prisma } from "./db.js";

const BATCH_SIZE = 100;

function makeDescription(pet: {
  name: string;
  species: "dog" | "cat" | "other";
  breedLabel: string;
  reportStatus: "lost" | "found";
}) {
  const animalLabel = pet.species === "other" ? "pet" : pet.species;

  if (pet.reportStatus === "lost") {
    return `${pet.name} is a ${pet.breedLabel} ${animalLabel} reported missing by the owner. Last seen near their neighborhood. Please keep an eye out and report any sightings.`;
  }

  if (pet.name === "Unknown") {
    return `This ${pet.breedLabel} ${animalLabel} was reported found by a community member. The pet's name is currently unknown.`;
  }

  return `${pet.name} is a ${pet.breedLabel} ${animalLabel} that was reported found and may need help getting home.`;
}

async function main() {
  const pets = await prisma.pet.findMany({
    where: {
      OR: [{ description: null }, { description: "" }],
    },
    select: {
      id: true,
      name: true,
      species: true,
      breedLabel: true,
      reportStatus: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`Backfilling ${pets.length} pet descriptions...`);

  for (let i = 0; i < pets.length; i += BATCH_SIZE) {
    const batch = pets.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((pet) =>
        prisma.pet.update({
          where: { id: pet.id },
          data: {
            description: makeDescription(pet),
          },
        }),
      ),
      {
        timeout: 30_000,
      },
    );

    console.log(
      `  updated ${Math.min(i + BATCH_SIZE, pets.length)} / ${pets.length}`,
    );
  }

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());