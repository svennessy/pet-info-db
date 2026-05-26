import type { BreedCommonality } from "./data/breedCommonality";

/** Set VITE_API_URL=http://localhost:3002 if the Vite proxy is unavailable. */
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "data" in value
  );
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;

  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      `Cannot reach API at ${url || path}. Run npm run dev and open the Vite URL (not a static file).`,
    );
  }

  const json = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      json && typeof json === "object" && "error" in json
        ? String(json.error)
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  if (isApiEnvelope<T>(json)) {
    return json.data;
  }

  return json as T;
}

function buildParams(entries: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  return params;
}

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

export async function fetchBreeds(query: BreedQuery): Promise<BreedRow[]> {
  const params = buildParams(query);
  return apiFetch<BreedRow[]>(`/api/breeds?${params}`);
}

export async function fetchStats(species: Species): Promise<BreedStats> {
  return apiFetch<BreedStats>(`/api/stats?species=${species}`);
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
  sort?:
    | "name"
    | "population"
    | "stateCode"
    | "rankInState"
    | "latitude"
    | "longitude";
  order?: "asc" | "desc";
  state?: string;
  search?: string;
};

export async function fetchCities(query: CityQuery): Promise<CityRow[]> {
  const params = buildParams(query);
  return apiFetch<CityRow[]>(`/api/cities?${params}`);
}

export async function fetchCityStats(): Promise<CityStats> {
  return apiFetch<CityStats>("/api/cities/stats");
}

export type PetReportStatus = "lost" | "found";
export type PetSpeciesFilter = "dog" | "cat" | "other";

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
  const params = buildParams(query);
  return apiFetch<UserListResult>(`/api/users?${params}`);
}

export async function fetchUserStats(): Promise<UserStats> {
  return apiFetch<UserStats>("/api/users/stats");
}

export type PetBreedRef = {
  slug: string;
  name: string;
  commonality: BreedCommonality;
  weight: number;
};

export type PetRow = {
  id: number | string;
  name: string;
  species: PetSpeciesFilter;
  reportStatus: PetReportStatus;
  reportType?: PetReportStatus;
  breedLabel: string;
  breed?: string;
  dogBreedSlug?: string | null;
  catBreedSlug?: string | null;
  otherKind: string | null;
  ownerId?: number;
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
  const params = buildParams(query);
  return apiFetch<PetListResult>(`/api/pets?${params}`);
}

export async function fetchPetStats(): Promise<PetStats> {
  return apiFetch<PetStats>("/api/pets/stats");
}

export type PetPhotoRow = {
  id: number;
  petId?: number;
  imagePath: string;
  imageUrl?: string;
  resolvedUrl?: string;
  sortOrder: number;
  stanfordInstanceKey: string;
  createdAt?: string;
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
  const params = buildParams(query);
  return apiFetch<DogPetPhotoListResult>(`/api/dog-pet-photos?${params}`);
}

export async function fetchDogPetPhotoStats(): Promise<DogPetPhotoStats> {
  return apiFetch<DogPetPhotoStats>("/api/dog-pet-photos/stats");
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
  const params = buildParams(query);
  return apiFetch<CatPetPhotoListResult>(`/api/cat-pet-photos?${params}`);
}

export async function fetchCatPetPhotoStats(): Promise<CatPetPhotoStats> {
  return apiFetch<CatPetPhotoStats>("/api/cat-pet-photos/stats");
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
  const params = buildParams(query);
  return apiFetch<OtherPetPhotoListResult>(`/api/other-pet-photos?${params}`);
}

export async function fetchOtherPetPhotoStats(): Promise<OtherPetPhotoStats> {
  return apiFetch<OtherPetPhotoStats>("/api/other-pet-photos/stats");
}