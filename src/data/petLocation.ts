import { createRng } from "./userGenerator.js";

/** ~±0.04° lat/lng spread around a city center (a few miles, varies by latitude). */
export function jitterLatLong(
  latitude: number,
  longitude: number,
  rng: () => number,
): { latitude: number; longitude: number } {
  const radiusDeg = 0.04;
  const dLat = (rng() * 2 - 1) * radiusDeg;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const dLng = ((rng() * 2 - 1) * radiusDeg) / Math.max(cosLat, 0.2);
  return {
    latitude: roundCoord(latitude + dLat),
    longitude: roundCoord(longitude + dLng),
  };
}

/** Deterministic pet coords from owner city + pet id (for backfills). */
export function petLatLongFromCity(
  cityLatitude: number,
  cityLongitude: number,
  petId: number,
  seed = 43,
): { latitude: number; longitude: number } {
  const rng = createRng(seed + petId * 7919);
  return jitterLatLong(cityLatitude, cityLongitude, rng);
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
