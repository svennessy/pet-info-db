/**
 * Builds src/data/usCities.json — top 20 cities by population per US state.
 * Uses `all-the-cities` (GeoNames-derived, open data).
 * Run: npm run build:cities
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import allCities from "all-the-cities";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../src/data/usCities.json");

const STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const STATE_CODES = new Set(STATES.map((s) => s.code));

function slugify(name, stateCode) {
  return `${name
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${stateCode.toLowerCase()}`;
}

/** Boroughs/neighborhoods that double-count New York City population. */
const NYC_METRO_CHILD_NAMES = new Set([
  "brooklyn",
  "queens",
  "manhattan",
  "the bronx",
  "bronx",
  "staten island",
  "jamaica",
  "astoria",
  "east new york",
  "east flatbush",
  "washington heights",
  "borough park",
  "sunset park",
  "sheepshead bay",
  "harlem",
  "flushing",
  "bensonhurst",
  "bushwick",
  "parkchester",
  "brighton beach",
  "far rockaway",
  "williamsburg",
]);

const usPlaces = allCities.filter(
  (c) =>
    c.country === "US" &&
    STATE_CODES.has(c.adminCode) &&
    c.population > 0 &&
    c.loc?.coordinates?.length === 2 &&
    !(
      c.adminCode === "NY" &&
      NYC_METRO_CHILD_NAMES.has(c.name.toLowerCase())
    ),
);

const byState = new Map();
for (const place of usPlaces) {
  const list = byState.get(place.adminCode) ?? [];
  list.push(place);
  byState.set(place.adminCode, list);
}

const cities = [];

for (const state of STATES) {
  const list = (byState.get(state.code) ?? []).sort(
    (a, b) => b.population - a.population,
  );

  const seen = new Set();
  const top = [];
  for (const place of list) {
    const key = place.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    top.push(place);
    if (top.length >= 20) break;
  }

  if (top.length < 20) {
    console.warn(`Warning: only ${top.length} cities for ${state.name}`);
  }

  top.forEach((place, index) => {
    const [longitude, latitude] = place.loc.coordinates;
    cities.push({
      id: slugify(place.name, state.code),
      name: place.name,
      stateCode: state.code,
      stateName: state.name,
      population: place.population,
      latitude,
      longitude,
      rankInState: index + 1,
    });
  });
}

console.log(`Writing ${cities.length} cities (${STATES.length} states × 20)`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(cities, null, 2));
