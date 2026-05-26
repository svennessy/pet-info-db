type CityInput = {
    id: string;
    name: string;
    stateCode: string;
    stateName: string;
    population: number;
    latitude: number;
    longitude: number;
    rankInState: number;
  };
  
  export function toCity(city: CityInput) {
    return {
      id: city.id,
      name: city.name,
      stateCode: city.stateCode,
      stateName: city.stateName,
      population: city.population,
      latitude: city.latitude,
      longitude: city.longitude,
      rankInState: city.rankInState,
    };
  }