import type { BreedCommonality } from "./data/breedCommonality";

/** Set VITE_API_URL=http://localhost:3002 if the Vite proxy is unavailable. */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  "",
) ?? "";

export type Species = "dog" | "cat";

export type BreedRow = {
  slug: string;
  name: string;
  commonality: BreedCommonality;
  weight: number;
  group: string | null;
};

export type BreedStats = {
  species: Species;
  total: number;
  byCommonality: Array<{
    commonality: BreedCommonality;
    _count: { _all: number };
  }>;
};

export type BreedQuery = {
  species: Species;
  sort?: "name" | "weight" | "commonality" | "group";
  order?: "asc" | "desc";
  commonality?: string;
  group?: string;
  search?: string;
};

async function apiFetch(path: string): Promise<Response> {
  const url = `${API_BASE}${path}`;
  try {
    return await fetch(url);
  } catch {
    throw new Error(
      `Cannot reach API at ${url || path}. Run npm run dev and open the Vite URL (not a static file).`,
    );
  }
}

export async function fetchBreeds(query: BreedQuery): Promise<BreedRow[]> {
  const params = new URLSearchParams();
  params.set("species", query.species);
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.commonality) params.set("commonality", query.commonality);
  if (query.group) params.set("group", query.group);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/breeds?${params}`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to load breeds (${response.status})${body ? `: ${body.slice(0, 120)}` : ""}`,
    );
  }
  return response.json() as Promise<BreedRow[]>;
}

export async function fetchStats(species: Species): Promise<BreedStats> {
  const response = await apiFetch(`/api/stats?species=${species}`);
  if (!response.ok) {
    throw new Error(`Failed to load stats (${response.status})`);
  }
  return response.json() as Promise<BreedStats>;
}

export type CityRow = {
  id: string;
  name: string;
  stateCode: string;
  stateName: string;
  population: number;
  latitude: number;
  longitude: number;
  rankInState: number;
};

export type CityStats = {
  total: number;
  byState: Array<{
    stateCode: string;
    stateName: string;
    count: number;
  }>;
};

export type CityQuery = {
  sort?: "name" | "population" | "stateCode" | "rankInState" | "latitude" | "longitude";
  order?: "asc" | "desc";
  state?: string;
  search?: string;
};

export async function fetchCities(query: CityQuery): Promise<CityRow[]> {
  const params = new URLSearchParams();
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.state) params.set("state", query.state);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/cities?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load cities (${response.status})`);
  }
  return response.json() as Promise<CityRow[]>;
}

export async function fetchCityStats(): Promise<CityStats> {
  const response = await apiFetch("/api/cities/stats");
  if (!response.ok) {
    throw new Error(`Failed to load city stats (${response.status})`);
  }
  return response.json() as Promise<CityStats>;
}

export type PetReportStatus = "lost" | "found";

export type UserPetSummary = {
  id: number;
  name: string;
  species: PetSpeciesFilter;
  reportStatus: PetReportStatus;
  breedLabel: string;
  otherKind: string | null;
  dogBreed: {
    name: string;
    commonality: BreedCommonality;
    group: string | null;
  } | null;
  catBreed: {
    name: string;
    commonality: BreedCommonality;
    group: string | null;
  } | null;
};

export type UserRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityId: string;
  city: {
    id: string;
    name: string;
    stateCode: string;
    stateName: string;
  };
  pet: UserPetSummary | null;
};

export type UserListResult = {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UserStats = {
  total: number;
  byState: Array<{
    stateCode: string;
    stateName: string;
    count: number;
  }>;
  topNames: Array<{
    firstName: string;
    lastName: string;
    count: number;
  }>;
};

export type UserQuery = {
  page?: number;
  limit?: number;
  sort?: "firstName" | "lastName" | "email" | "city" | "state";
  order?: "asc" | "desc";
  state?: string;
  cityId?: string;
  search?: string;
};

export async function fetchUsers(query: UserQuery): Promise<UserListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.state) params.set("state", query.state);
  if (query.cityId) params.set("cityId", query.cityId);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/users?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`);
  }
  return response.json() as Promise<UserListResult>;
}

export async function fetchUserStats(): Promise<UserStats> {
  const response = await apiFetch("/api/users/stats");
  if (!response.ok) {
    throw new Error(`Failed to load user stats (${response.status})`);
  }
  return response.json() as Promise<UserStats>;
}

export type PetSpeciesFilter = "dog" | "cat" | "other";

export type PetBreedRef = {
  slug: string;
  name: string;
  commonality: BreedCommonality;
  weight: number;
};

export type PetRow = {
  id: number;
  name: string;
  species: PetSpeciesFilter;
  reportStatus: PetReportStatus;
  breedLabel: string;
  dogBreedSlug: string | null;
  catBreedSlug: string | null;
  otherKind: string | null;
  ownerId: number;
  latitude: number;
  longitude: number;
  dogBreed: PetBreedRef | null;
  catBreed: PetBreedRef | null;
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

export type PetListResult = {
  pets: PetRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PetStats = {
  total: number;
  bySpecies: Array<{ species: PetSpeciesFilter; count: number }>;
  byReportStatus: Array<{ reportStatus: PetReportStatus; count: number }>;
  bySpeciesAndStatus: Array<{
    species: PetSpeciesFilter;
    reportStatus: PetReportStatus;
    count: number;
  }>;
  byState: Array<{
    stateCode: string;
    stateName: string;
    count: number;
  }>;
  topDogBreeds: Array<{ slug: string; name: string; count: number }>;
  topCatBreeds: Array<{ slug: string; name: string; count: number }>;
  topOtherKinds: Array<{ kind: string; count: number }>;
};

export type PetQuery = {
  page?: number;
  limit?: number;
  sort?:
    | "name"
    | "species"
    | "reportStatus"
    | "breedLabel"
    | "owner"
    | "state";
  order?: "asc" | "desc";
  species?: PetSpeciesFilter | "";
  reportStatus?: PetReportStatus | "";
  state?: string;
  breed?: string;
  search?: string;
};

export async function fetchPets(query: PetQuery): Promise<PetListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.species) params.set("species", query.species);
  if (query.reportStatus) params.set("reportStatus", query.reportStatus);
  if (query.state) params.set("state", query.state);
  if (query.breed) params.set("breed", query.breed);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/pets?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load pets (${response.status})`);
  }
  return response.json() as Promise<PetListResult>;
}

export async function fetchPetStats(): Promise<PetStats> {
  const response = await apiFetch("/api/pets/stats");
  if (!response.ok) {
    throw new Error(`Failed to load pet stats (${response.status})`);
  }
  return response.json() as Promise<PetStats>;
}

export type PetPhotoRow = {
  id: number;
  imagePath: string;
  sortOrder: number;
  stanfordInstanceKey: string;
};

export type DogPetPhotoRow = PetRow & {
  photos: PetPhotoRow[];
};

export type DogPetPhotoListResult = {
  pets: DogPetPhotoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type DogPetPhotoStats = {
  dogsWithPhotos: number;
  photoCount: number;
  byPhotoCount: Array<{ photos: number; dogs: number }>;
  byReportStatus: Array<{ reportStatus: PetReportStatus; count: number }>;
};

export type DogPetPhotoQuery = {
  page?: number;
  limit?: number;
  sort?: PetQuery["sort"];
  order?: PetQuery["order"];
  reportStatus?: PetReportStatus | "";
  state?: string;
  breed?: string;
  search?: string;
};

export async function fetchDogPetPhotos(
  query: DogPetPhotoQuery,
): Promise<DogPetPhotoListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.reportStatus) params.set("reportStatus", query.reportStatus);
  if (query.state) params.set("state", query.state);
  if (query.breed) params.set("breed", query.breed);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/dog-pet-photos?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load dog photos (${response.status})`);
  }
  return response.json() as Promise<DogPetPhotoListResult>;
}

export async function fetchDogPetPhotoStats(): Promise<DogPetPhotoStats> {
  const response = await apiFetch("/api/dog-pet-photos/stats");
  if (!response.ok) {
    throw new Error(`Failed to load dog photo stats (${response.status})`);
  }
  return response.json() as Promise<DogPetPhotoStats>;
}

export type CatPetPhotoRow = PetRow & {
  photos: PetPhotoRow[];
};

export type CatPetPhotoListResult = {
  pets: CatPetPhotoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CatPetPhotoStats = {
  catsWithPhotos: number;
  photoCount: number;
  byPhotoCount: Array<{ photos: number; cats: number }>;
  byReportStatus: Array<{ reportStatus: PetReportStatus; count: number }>;
};

export type CatPetPhotoQuery = DogPetPhotoQuery;

export async function fetchCatPetPhotos(
  query: CatPetPhotoQuery,
): Promise<CatPetPhotoListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.reportStatus) params.set("reportStatus", query.reportStatus);
  if (query.state) params.set("state", query.state);
  if (query.breed) params.set("breed", query.breed);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/cat-pet-photos?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load cat photos (${response.status})`);
  }
  return response.json() as Promise<CatPetPhotoListResult>;
}

export async function fetchCatPetPhotoStats(): Promise<CatPetPhotoStats> {
  const response = await apiFetch("/api/cat-pet-photos/stats");
  if (!response.ok) {
    throw new Error(`Failed to load cat photo stats (${response.status})`);
  }
  return response.json() as Promise<CatPetPhotoStats>;
}

export type OtherPetPhotoRow = PetRow & {
  photos: PetPhotoRow[];
};

export type OtherPetPhotoListResult = {
  pets: OtherPetPhotoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type OtherPetPhotoStats = {
  petsWithPhotos: number;
  photoCount: number;
  byPhotoCount: Array<{ photos: number; pets: number }>;
  byReportStatus: Array<{ reportStatus: PetReportStatus; count: number }>;
  byKind: Array<{ kind: string; count: number }>;
};

export type OtherPetPhotoQuery = {
  page?: number;
  limit?: number;
  sort?: PetQuery["sort"];
  order?: PetQuery["order"];
  reportStatus?: PetReportStatus | "";
  state?: string;
  kind?: "Bird" | "Rabbit" | "";
  search?: string;
};

export async function fetchOtherPetPhotos(
  query: OtherPetPhotoQuery,
): Promise<OtherPetPhotoListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  if (query.reportStatus) params.set("reportStatus", query.reportStatus);
  if (query.state) params.set("state", query.state);
  if (query.kind) params.set("kind", query.kind);
  if (query.search) params.set("search", query.search);

  const response = await apiFetch(`/api/other-pet-photos?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to load bird & bunny photos (${response.status})`);
  }
  return response.json() as Promise<OtherPetPhotoListResult>;
}

export async function fetchOtherPetPhotoStats(): Promise<OtherPetPhotoStats> {
  const response = await apiFetch("/api/other-pet-photos/stats");
  if (!response.ok) {
    throw new Error(`Failed to load bird & bunny photo stats (${response.status})`);
  }
  return response.json() as Promise<OtherPetPhotoStats>;
}
