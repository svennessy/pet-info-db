type MapPetInput = {
  id: number | string;
  name: string;
  species: "dog" | "cat" | "other";
  reportStatus: "lost" | "found";
  breedLabel: string;
  latitude: number;
  longitude: number;
};

export function toMapPet(pet: MapPetInput) {
  return {
    id: String(pet.id),
    name: pet.name,
    species: pet.species,
    reportType: pet.reportStatus,
    reportStatus: pet.reportStatus,
    breed: pet.breedLabel,
    breedLabel: pet.breedLabel,
    color: "",
    description: "",
    latitude: pet.latitude,
    longitude: pet.longitude,
  };
}

type PetListInput = MapPetInput & {
  otherKind: string | null;
  dogBreed?: {
    slug: string;
    name: string;
    commonality: string;
    weight: number;
  } | null;
  catBreed?: {
    slug: string;
    name: string;
    commonality: string;
    weight: number;
  } | null;
  owner: {
    id: number;
    firstName: string;
    lastName: string;
    city: {
      name: string;
      stateCode: string;
      stateName: string;
    };
  };
};

export function toPetListItem(pet: PetListInput) {
  return {
    id: String(pet.id),
    name: pet.name,
    species: pet.species,
    reportType: pet.reportStatus,
    reportStatus: pet.reportStatus,
    breed: pet.breedLabel,
    breedLabel: pet.breedLabel,
    otherKind: pet.otherKind,
    latitude: pet.latitude,
    longitude: pet.longitude,
    dogBreed: pet.dogBreed,
    catBreed: pet.catBreed,
    owner: pet.owner,
  };
}