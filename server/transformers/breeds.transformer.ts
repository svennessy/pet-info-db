type BreedInput = {
    slug: string;
    name: string;
    commonality: string;
    weight: number;
    group: string | null;
  };
  
  export function toBreed(breed: BreedInput) {
    return {
      slug: breed.slug,
      name: breed.name,
      commonality: breed.commonality,
      weight: breed.weight,
      group: breed.group,
    };
  }