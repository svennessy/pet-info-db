import { createRng } from "./userGenerator.js";

type LatLng = { latitude: number; longitude: number };

/** Axis-aligned water boxes used to reject jitter that lands offshore. */
type WaterBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * Neighborhood anchors for coastal / harbor cities whose GeoNames center sits
 * near water. Pets are placed around these points with a tight radius so they
 * stay on land.
 */
const CITY_LAND_ANCHORS: Record<string, LatLng[]> = {
  "new-york-city-ny": [
    { latitude: 40.7549, longitude: -73.984 }, // Midtown
    { latitude: 40.787, longitude: -73.9754 }, // Upper West Side
    { latitude: 40.8079, longitude: -73.9454 }, // Harlem
    { latitude: 40.7265, longitude: -73.9815 }, // East Village
    { latitude: 40.715, longitude: -74.007 }, // Tribeca / Civic
    { latitude: 40.748, longitude: -73.968 }, // Midtown East
    { latitude: 40.6681, longitude: -73.9806 }, // Park Slope
    { latitude: 40.6782, longitude: -73.9442 }, // Bedford-Stuyvesant
    { latitude: 40.7081, longitude: -73.9571 }, // Williamsburg
    { latitude: 40.65, longitude: -73.95 }, // Flatbush
    { latitude: 40.772, longitude: -73.9301 }, // Astoria
    { latitude: 40.7654, longitude: -73.8318 }, // Flushing
    { latitude: 40.7043, longitude: -73.9181 }, // Ridgewood
    { latitude: 40.861, longitude: -73.89 }, // Fordham
    { latitude: 40.8467, longitude: -73.8625 }, // Parkchester
    { latitude: 40.643, longitude: -74.0776 }, // St. George
    { latitude: 40.5795, longitude: -74.15 }, // New Springville
  ],
  "jersey-city-nj": [
    { latitude: 40.7282, longitude: -74.0776 }, // Downtown / Grove
    { latitude: 40.7465, longitude: -74.05 }, // The Heights
    { latitude: 40.718, longitude: -74.05 }, // West Side
    { latitude: 40.71, longitude: -74.065 }, // Journal Square
  ],
  "brooklyn-ny": [
    { latitude: 40.6681, longitude: -73.9806 },
    { latitude: 40.6782, longitude: -73.9442 },
    { latitude: 40.7081, longitude: -73.9571 },
    { latitude: 40.65, longitude: -73.95 },
    { latitude: 40.63399, longitude: -73.99681 },
  ],
  "queens-ny": [
    { latitude: 40.772, longitude: -73.9301 },
    { latitude: 40.7654, longitude: -73.8318 },
    { latitude: 40.7043, longitude: -73.9181 },
    { latitude: 40.6915, longitude: -73.8057 },
  ],
  "manhattan-ny": [
    { latitude: 40.7549, longitude: -73.984 },
    { latitude: 40.787, longitude: -73.9754 },
    { latitude: 40.8079, longitude: -73.9454 },
    { latitude: 40.7265, longitude: -73.9815 },
    { latitude: 40.748, longitude: -73.968 },
  ],
  "the-bronx-ny": [
    { latitude: 40.861, longitude: -73.89 },
    { latitude: 40.8467, longitude: -73.8625 },
    { latitude: 40.84985, longitude: -73.86641 },
  ],
  "staten-island-ny": [
    { latitude: 40.643, longitude: -74.0776 },
    { latitude: 40.5795, longitude: -74.15 },
    { latitude: 40.56233, longitude: -74.13986 },
  ],
  "san-francisco-ca": [
    { latitude: 37.7749, longitude: -122.4194 }, // Civic Center
    { latitude: 37.7599, longitude: -122.4148 }, // Mission
    { latitude: 37.7806, longitude: -122.4644 }, // Richmond
    { latitude: 37.7516, longitude: -122.4477 }, // Sunset
    { latitude: 37.8002, longitude: -122.421 }, // North Beach inland
  ],
  "oakland-ca": [
    { latitude: 37.8044, longitude: -122.2712 },
    { latitude: 37.8077, longitude: -122.241 },
    { latitude: 37.7756, longitude: -122.224 },
  ],
  "seattle-wa": [
    { latitude: 47.6062, longitude: -122.3321 },
    { latitude: 47.6205, longitude: -122.3493 },
    { latitude: 47.5615, longitude: -122.316 },
    { latitude: 47.6687, longitude: -122.341 },
    { latitude: 47.608, longitude: -122.335 },
  ],
  "boston-ma": [
    { latitude: 42.3601, longitude: -71.0589 },
    { latitude: 42.3505, longitude: -71.1054 }, // Allston / Brighton
    { latitude: 42.338, longitude: -71.074 }, // South End
    { latitude: 42.365, longitude: -71.104 }, // Cambridge-adjacent Boston
    { latitude: 42.314, longitude: -71.114 }, // Jamaica Plain
  ],
  "south-boston-ma": [
    { latitude: 42.3355, longitude: -71.05 },
    { latitude: 42.338, longitude: -71.055 },
  ],
  "miami-fl": [
    { latitude: 25.7617, longitude: -80.1918 },
    { latitude: 25.778, longitude: -80.21 },
    { latitude: 25.79, longitude: -80.19 },
    { latitude: 25.73, longitude: -80.24 },
  ],
  "chicago-il": [
    { latitude: 41.8781, longitude: -87.6298 },
    { latitude: 41.85, longitude: -87.65 },
    { latitude: 41.92, longitude: -87.7 },
    { latitude: 41.8, longitude: -87.7 },
    { latitude: 41.95, longitude: -87.65 },
  ],
  "san-diego-ca": [
    { latitude: 32.7157, longitude: -117.1611 },
    { latitude: 32.75, longitude: -117.13 },
    { latitude: 32.78, longitude: -117.1 },
    { latitude: 32.71, longitude: -117.1 },
  ],
  "los-angeles-ca": [
    { latitude: 34.0522, longitude: -118.2437 },
    { latitude: 34.09, longitude: -118.3 },
    { latitude: 34.02, longitude: -118.28 },
    { latitude: 34.07, longitude: -118.2 },
  ],
  "honolulu-hi": [
    { latitude: 21.3069, longitude: -157.8583 },
    { latitude: 21.31, longitude: -157.84 },
    { latitude: 21.29, longitude: -157.83 },
  ],
  "new-orleans-la": [
    { latitude: 29.9511, longitude: -90.0715 },
    { latitude: 29.96, longitude: -90.08 },
    { latitude: 29.94, longitude: -90.1 },
  ],
  "tampa-fl": [
    { latitude: 27.9506, longitude: -82.4572 },
    { latitude: 27.96, longitude: -82.48 },
    { latitude: 27.94, longitude: -82.5 },
  ],
  "baltimore-md": [
    { latitude: 39.2904, longitude: -76.6122 },
    { latitude: 39.3, longitude: -76.62 },
    { latitude: 39.28, longitude: -76.65 },
  ],
  "portland-or": [
    { latitude: 45.5152, longitude: -122.6784 },
    { latitude: 45.53, longitude: -122.69 },
    { latitude: 45.5, longitude: -122.65 },
  ],
  "portland-me": [
    { latitude: 43.6591, longitude: -70.2568 },
    { latitude: 43.66, longitude: -70.27 },
  ],
  "philadelphia-pa": [
    { latitude: 39.9526, longitude: -75.1652 },
    { latitude: 39.96, longitude: -75.18 },
    { latitude: 39.94, longitude: -75.15 },
  ],
};

/** Mid-channel water boxes — kept narrow so shoreline neighborhoods stay valid. */
const WATER_ZONES: WaterBox[] = [
  // Hudson River channel (Manhattan ↔ NJ)
  { minLat: 40.7, maxLat: 40.88, minLng: -74.035, maxLng: -74.012 },
  // East River channel
  { minLat: 40.7, maxLat: 40.78, minLng: -73.985, maxLng: -73.96 },
  // Upper New York Bay
  { minLat: 40.64, maxLat: 40.7, minLng: -74.06, maxLng: -74.015 },
  // Lower Bay / Narrows
  { minLat: 40.56, maxLat: 40.63, minLng: -74.08, maxLng: -74.02 },
  // Jamaica Bay open water
  { minLat: 40.56, maxLat: 40.62, minLng: -73.88, maxLng: -73.78 },
  // SF Bay mid-channel
  { minLat: 37.75, maxLat: 37.85, minLng: -122.38, maxLng: -122.32 },
  // Elliott Bay
  { minLat: 47.59, maxLat: 47.63, minLng: -122.39, maxLng: -122.345 },
  // Boston Harbor
  { minLat: 42.34, maxLat: 42.365, minLng: -71.04, maxLng: -70.99 },
  // Lake Michigan off Chicago
  { minLat: 41.75, maxLat: 42.0, minLng: -87.6, maxLng: -87.52 },
  // Biscayne Bay
  { minLat: 25.72, maxLat: 25.82, minLng: -80.17, maxLng: -80.12 },
  // San Diego Bay
  { minLat: 32.66, maxLat: 32.73, minLng: -117.19, maxLng: -117.14 },
];

const DEFAULT_RADIUS_DEG = 0.035;
const ANCHOR_RADIUS_DEG = 0.012;
const MAX_ATTEMPTS = 24;

function inWater(lat: number, lng: number): boolean {
  return WATER_ZONES.some(
    (z) =>
      lat >= z.minLat &&
      lat <= z.maxLat &&
      lng >= z.minLng &&
      lng <= z.maxLng,
  );
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function offsetAround(
  latitude: number,
  longitude: number,
  radiusDeg: number,
  rng: () => number,
): LatLng {
  const dLat = (rng() * 2 - 1) * radiusDeg;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const dLng = ((rng() * 2 - 1) * radiusDeg) / Math.max(cosLat, 0.2);
  return {
    latitude: roundCoord(latitude + dLat),
    longitude: roundCoord(longitude + dLng),
  };
}

function pickAnchor(
  cityId: string | undefined,
  cityLatitude: number,
  cityLongitude: number,
  rng: () => number,
): LatLng {
  const anchors = cityId ? CITY_LAND_ANCHORS[cityId] : undefined;
  if (anchors && anchors.length > 0) {
    return anchors[Math.floor(rng() * anchors.length)]!;
  }
  return { latitude: cityLatitude, longitude: cityLongitude };
}

/**
 * Place a pet near a city center (or land neighborhood for coastal cities).
 * Retries when the candidate falls in a known water zone.
 */
export function jitterLatLong(
  latitude: number,
  longitude: number,
  rng: () => number,
  cityId?: string,
): LatLng {
  const hasAnchors = Boolean(cityId && CITY_LAND_ANCHORS[cityId]?.length);
  const radiusDeg = hasAnchors ? ANCHOR_RADIUS_DEG : DEFAULT_RADIUS_DEG;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const anchor = pickAnchor(cityId, latitude, longitude, rng);
    const candidate = offsetAround(
      anchor.latitude,
      anchor.longitude,
      radiusDeg,
      rng,
    );
    if (!inWater(candidate.latitude, candidate.longitude)) {
      return candidate;
    }
  }

  // Last resort: exact land anchor (or city center if none).
  const fallback = pickAnchor(cityId, latitude, longitude, rng);
  if (!inWater(fallback.latitude, fallback.longitude)) {
    return {
      latitude: roundCoord(fallback.latitude),
      longitude: roundCoord(fallback.longitude),
    };
  }
  return {
    latitude: roundCoord(latitude),
    longitude: roundCoord(longitude),
  };
}

/** Deterministic pet coords from owner city + pet id (for backfills). */
export function petLatLongFromCity(
  cityLatitude: number,
  cityLongitude: number,
  petId: number,
  seed = 43,
  cityId?: string,
): LatLng {
  const rng = createRng(seed + petId * 7919);
  return jitterLatLong(cityLatitude, cityLongitude, rng, cityId);
}
