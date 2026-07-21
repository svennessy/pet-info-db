type ReverseGeocodeResult = {
  cityName: string | null;
  stateCode: string | null;
  locationLabel: string;
};

type MapTilerFeature = {
  place_name?: string;
  text?: string;
  place_type?: string[];
  context?: Array<{
    id?: string;
    text?: string;
    short_code?: string;
  }>;
};

type MapTilerResponse = {
  features?: MapTilerFeature[];
};

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeStateCode(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const fromShort = trimmed.includes("-")
    ? trimmed.split("-").at(-1)?.toUpperCase()
    : null;
  if (fromShort && /^[A-Z]{2}$/.test(fromShort)) {
    return fromShort;
  }

  return US_STATE_NAME_TO_CODE[trimmed.toLowerCase()] ?? null;
}

function pickCityAndState(features: MapTilerFeature[]) {
  let municipality: string | null = null;
  let state: string | null = null;

  for (const feature of features) {
    if (feature.place_type?.includes("municipality") && feature.text) {
      municipality ??= feature.text;
    }

    for (const context of feature.context ?? []) {
      if (!municipality && context.id?.startsWith("municipality")) {
        municipality = context.text ?? null;
      }

      if (!state && context.id?.startsWith("region")) {
        state =
          normalizeStateCode(context.short_code) ??
          normalizeStateCode(context.text);
      }
    }

    if (municipality && state) break;
  }

  return {
    cityName: municipality,
    stateCode: state,
  };
}

function coordinateFallback(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function buildLocationLabel(
  cityName: string | null,
  stateCode: string | null,
  fallback: string,
) {
  if (cityName && stateCode) return `${cityName}, ${stateCode}`;
  if (cityName) return cityName;
  return fallback;
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const key = process.env.MAPTILER_API_KEY;

  if (!key) {
    console.warn("MAPTILER_API_KEY is missing.");

    return {
      cityName: null,
      stateCode: null,
      locationLabel: coordinateFallback(latitude, longitude),
    };
  }

  const url = new URL(
    `https://api.maptiler.com/geocoding/${longitude},${latitude}.json`,
  );

  url.searchParams.set("key", key);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("maptiler error body", text);

      return {
        cityName: null,
        stateCode: null,
        locationLabel: coordinateFallback(latitude, longitude),
      };
    }

    const data = (await response.json()) as MapTilerResponse;
    const features = data.features ?? [];
    const { cityName, stateCode } = pickCityAndState(features);

    return {
      cityName,
      stateCode,
      locationLabel: buildLocationLabel(
        cityName,
        stateCode,
        features[0]?.place_name ?? coordinateFallback(latitude, longitude),
      ),
    };
  } catch (error) {
    console.error("reverse geocode failed", error);

    return {
      cityName: null,
      stateCode: null,
      locationLabel: coordinateFallback(latitude, longitude),
    };
  }
}
