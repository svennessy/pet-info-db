// generator flow for increased realism:
// weighted census data
// population weighted city picker
// state aware phone number generator
// unique email generator

import {
  CENSUS_FIRST_NAMES,
  CENSUS_LAST_NAMES,
  type WeightedName,
} from "./censusNames";

export type CityForAssignment = {
  id: string;
  stateCode: string;
  population: number;
};

export type GeneratedUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityId: string;
};

/** Deterministic PRNG for reproducible seeds (mulberry32). */
// used to ensure same users are generated every time
// instead of Math.random() uses createRng()
// so createRng(42) example:
// run #1: John Smith
// run #2: John Smith
// run #3: John Smith
export function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// picks a weighted item from a list
// if Smith = weight 100, Johnson = weight 50, and Washington = weight 5
// pickWeighted(...) will return Smith much more often
export function pickWeighted<T extends WeightedName>(
  items: readonly T[],
  rng: () => number,
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** Area codes loosely mapped by state for plausible phone numbers. */
const STATE_AREA_CODES: Record<string, readonly string[]> = {
  AL: ["205", "251", "256", "334"],
  AK: ["907"],
  AZ: ["480", "520", "602", "623", "928"],
  AR: ["479", "501", "870"],
  CA: ["213", "310", "323", "408", "415", "510", "619", "626", "650", "707", "714", "818", "916"],
  CO: ["303", "719", "720", "970"],
  CT: ["203", "475", "860"],
  DE: ["302"],
  FL: ["305", "321", "352", "386", "407", "561", "727", "754", "786", "813", "850", "904"],
  GA: ["404", "470", "478", "678", "706", "762", "770", "912"],
  HI: ["808"],
  ID: ["208", "986"],
  IL: ["217", "224", "309", "312", "331", "618", "630", "708", "773", "815", "847"],
  IN: ["219", "260", "317", "463", "574", "765", "812"],
  IA: ["319", "515", "563", "641", "712"],
  KS: ["316", "620", "785", "913"],
  KY: ["270", "364", "502", "606", "859"],
  LA: ["225", "318", "337", "504", "985"],
  ME: ["207"],
  MD: ["240", "301", "410", "443", "667"],
  MA: ["339", "351", "413", "508", "617", "774", "781", "857", "978"],
  MI: ["231", "248", "269", "313", "517", "586", "616", "734", "810", "906", "947", "989"],
  MN: ["218", "320", "507", "612", "651", "763", "952"],
  MS: ["228", "601", "662", "769"],
  MO: ["314", "417", "573", "636", "660", "816"],
  MT: ["406"],
  NE: ["308", "402", "531"],
  NV: ["702", "725", "775"],
  NH: ["603"],
  NJ: ["201", "551", "609", "732", "848", "856", "862", "908", "973"],
  NM: ["505", "575"],
  NY: ["212", "315", "332", "347", "516", "518", "585", "607", "631", "646", "680", "716", "718", "838", "845", "914", "917", "929"],
  NC: ["252", "336", "704", "743", "828", "910", "919", "980", "984"],
  ND: ["701"],
  OH: ["216", "220", "234", "330", "380", "419", "440", "513", "567", "614", "740", "937"],
  OK: ["405", "539", "580", "918"],
  OR: ["458", "503", "541", "971"],
  PA: ["215", "223", "267", "272", "412", "445", "484", "570", "610", "717", "724", "814", "878"],
  RI: ["401"],
  SC: ["803", "843", "854", "864"],
  SD: ["605"],
  TN: ["423", "615", "629", "731", "865", "901", "931"],
  TX: ["210", "214", "254", "281", "325", "346", "361", "409", "430", "432", "469", "512", "682", "713", "726", "737", "806", "817", "830", "832", "903", "915", "936", "940", "956", "972", "979"],
  UT: ["385", "435", "801"],
  VT: ["802"],
  VA: ["276", "434", "540", "571", "703", "757", "804"],
  WA: ["206", "253", "360", "425", "509", "564"],
  WV: ["304", "681"],
  WI: ["262", "414", "534", "608", "715", "920"],
  WY: ["307"],
};

const DEFAULT_AREA_CODES = ["202", "312", "415", "212", "713", "602", "404", "617"];

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * NYC boroughs/neighborhoods are often listed as separate "cities" with their
 * own census populations. Counting them on top of New York City double-counts
 * the metro and starves the rest of the Northeast in population-weighted seeds.
 */
const NYC_METRO_CHILD_IDS = new Set([
  "brooklyn-ny",
  "queens-ny",
  "manhattan-ny",
  "the-bronx-ny",
  "staten-island-ny",
  "jamaica-ny",
  "astoria-ny",
  "east-new-york-ny",
  "east-flatbush-ny",
  "washington-heights-ny",
  "borough-park-ny",
  "sunset-park-ny",
  "sheepshead-bay-ny",
  "harlem-ny",
  "flushing-ny",
  "bensonhurst-ny",
  "bushwick-ny",
  "parkchester-ny",
  "brighton-beach-ny",
  "far-rockaway-ny",
  "williamsburg-ny",
]);

function effectiveCityWeight(city: CityForAssignment) {
  if (NYC_METRO_CHILD_IDS.has(city.id)) return 0;
  // Square-root dampening keeps large metros ahead without letting them
  // absorb most of a national seed.
  return Math.sqrt(Math.max(city.population, 1));
}

// instead of NYC and a tiny Nebraska town having equal probability
// city weight is divided by totalWeight to get a probability
// so NYC, LA, Chicago, etc receive more users — but not all of them
function buildCityPicker(cities: CityForAssignment[], rng: () => number) {
  const weights = cities.map(effectiveCityWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    throw new Error("No cities with positive population weight");
  }

  const cumulative: number[] = [];
  let acc = 0;
  for (const weight of weights) {
    acc += weight / totalWeight;
    cumulative.push(acc);
  }

  return () => {
    const roll = rng();
    let lo = 0;
    let hi = cumulative.length - 1;
    // binary seach optimization
    // instead of check every city
    // search narrowed to middle city and then left or right
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (roll <= cumulative[mid]) hi = mid;
      else lo = mid + 1;
    }
    return cities[lo].id;
  };
}

// creates a unique email for a user
// ie: john.smith@petdb.mail
// if john.smith@petdb.mail is already used, add a number
function makeUniqueEmail(
  first: string,
  last: string,
  seq: number,
  used: Set<string>,
): string {
  // normalizeToken removes accents and special characters
  // ie: "John" -> "john"
  // ie: "Smith" -> "smith"
  // ie: "John Smith" -> "johnsmith"
  const base = `${normalizeToken(first)}.${normalizeToken(last)}`;
  let candidate = `${base}@petdb.mail`;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  let n = 2;
  while (n < 10_000) {
    candidate = `${base}${n}@petdb.mail`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    n++;
  }
  candidate = `${base}.${seq}@petdb.mail`;
  used.add(candidate);
  return candidate;
}

function makeUniquePhone(
  stateCode: string,
  seq: number,
  rng: () => number,
  // ensure no duplicate phones
  used: Set<string>,
): string {
  // ensure area code matches city user is in
  const codes = STATE_AREA_CODES[stateCode] ?? DEFAULT_AREA_CODES;
  for (let attempt = 0; attempt < 50; attempt++) {
    const area = codes[Math.floor(rng() * codes.length)];
    const exchange = 200 + Math.floor(rng() * 799);
    const line = 1000 + Math.floor(rng() * 9000);
    const phone = `+1${area}${exchange}${line}`;
    if (!used.has(phone)) {
      used.add(phone);
      return phone;
    }
  }
  const fallback = `+1${9000000000 + seq}`;
  used.add(fallback);
  return fallback;
}

export function generateUsers(
  count: number,
  cities: CityForAssignment[],
  seed = 42,
): GeneratedUser[] {
  if (cities.length === 0) {
    throw new Error("Cannot generate users without cities");
  }

  const rng = createRng(seed);
  const pickCity = buildCityPicker(cities, rng);
  const stateByCityId = new Map(cities.map((c) => [c.id, c.stateCode]));
  const emails = new Set<string>();
  const phones = new Set<string>();
  const users: GeneratedUser[] = [];

  // loop to create every user
  for (let i = 0; i < count; i++) {
    const firstName = pickWeighted(CENSUS_FIRST_NAMES, rng).name;
    const lastName = pickWeighted(CENSUS_LAST_NAMES, rng).name;
    const cityId = pickCity();
    const stateCode = stateByCityId.get(cityId) ?? "NY";

    // save user to array
    users.push({
      firstName,
      lastName,
      email: makeUniqueEmail(firstName, lastName, i, emails),
      phone: makeUniquePhone(stateCode, i, rng, phones),
      cityId,
    });
  }

  return users;  
}

// example generated user:
// {
//   firstName: "John",
//   lastName: "Smith",
//   email: "john.smith@petdb.mail",
//   phone: "+14345551234",
//   cityId: "charlottesville-va
// }
