// describes what the service got back from prisma
// converts id because DB uses number but frontend uses string
type MapPetInput = {
  id: number | string;
  name: string;
  description?: string | null;
  species: "dog" | "cat" | "other";
  reportStatus: "lost" | "found" | "resolved";
  breedLabel: string;
  latitude: number;
  longitude: number;
  cityName: string | null;
  stateCode: string | null;
  locationLabel: string | null;
  createdAt: Date;
  photos?: Array<{
    id: number | string;
    petId: number | string;
    imagePath: string;
    sortOrder: number;
    resolvedUrl?: string;
    imageUrl?: string;
  }>;
};

// reportType is for frontend display
// reportStatus is for backend standardization
// same story with breedLabel vs breed
// frontend expects something like PetMarker with color and description
// but db doesn't have them so they're blank to keep API stable
// map marker payload is smaller to keep map faster
export function toMapPet(pet: MapPetInput) {
  return {
    id: String(pet.id),
    name: pet.name,
    description: pet.description ?? "",
    species: pet.species,
    reportType: pet.reportStatus,
    reportStatus: pet.reportStatus,
    breed: pet.breedLabel,
    breedLabel: pet.breedLabel,
    color: "",
    latitude: pet.latitude,
    longitude: pet.longitude,
    cityName: pet.cityName,
    stateCode: pet.stateCode,
    locationLabel: pet.locationLabel,
    createdAt: pet.createdAt.toISOString(),
    photos: (pet.photos ?? [])
      .filter((photo) => String(photo.petId) === String(pet.id))
      .map((photo) => ({
        ...photo,
        id: String(photo.id),
        petId: String(photo.petId),
      })),
  };
}

// extends MapPetInput to add frontend specific fields
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

// api response for GET /api/pets route
// keeps owner, dogBreed, catBreed, which come from include: {} in prisma query
// flow becomes: prisma -> transformer -> frontend DTO (data transfer object)
// DTO is the exact shape sent over the network
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
    cityName: pet.cityName,
    stateCode: pet.stateCode,
    locationLabel: pet.locationLabel,
    dogBreed: pet.dogBreed,
    catBreed: pet.catBreed,
    owner: pet.owner,
  };
}
