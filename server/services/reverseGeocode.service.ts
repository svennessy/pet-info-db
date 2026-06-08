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

function normalizeStateCode(shortCode?: string) {
  if (!shortCode) return null;

  const parts = shortCode.split("-");
  return parts[parts.length - 1]?.toUpperCase() ?? null;
}

function pickCityAndState(features: MapTilerFeature[]) {
  let municipality: string | null = null;
  let state: string | null = null;

  for (const feature of features) {
    if (
      feature.place_type?.includes("municipality") &&
      feature.text
    ) {
      municipality = feature.text;
    }

    for (const context of feature.context ?? []) {
      if (
        !municipality &&
        context.id?.startsWith("municipality")
      ) {
        municipality = context.text ?? null;
      }

      if (
        !state &&
        context.id?.startsWith("region")
      ) {
        state = context.text ?? null;
      }
    }
  }

  return {
    cityName: municipality,
    stateCode: state,
  };
}

function coordinateFallback(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
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

  console.log("reverse geocode called", { latitude, longitude });
  console.log("has maptiler key", Boolean(key));
  console.log("reverse geocode url", url.toString());

  try {
    const response = await fetch(url);

    console.log("maptiler status", response.status, response.statusText);

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

    console.log(
      "maptiler features",
      JSON.stringify(data.features?.slice(0, 5), null, 2),
    );

    const features = data.features ?? [];
    const { cityName, stateCode } = pickCityAndState(features);

    return {
      cityName,
      stateCode,
      locationLabel:
        cityName && stateCode
          ? `${cityName}, ${stateCode}`
          : features[0]?.place_name ?? coordinateFallback(latitude, longitude),
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