import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCities,
  fetchCityStats,
  type CityQuery,
  type CityRow,
} from "../api";

function formatPopulation(n: number) {
  return n.toLocaleString("en-US");
}

function formatCoord(n: number) {
  return n.toFixed(4);
}

export function CityExplorer() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stateOptions, setStateOptions] = useState<
    Array<{ stateCode: string; stateName: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [sort, setSort] = useState<CityQuery["sort"]>("population");
  const [order, setOrder] = useState<CityQuery["order"]>("desc");

  const query = useMemo<CityQuery>(
    () => ({
      sort,
      order,
      state: stateCode || undefined,
      search: search || undefined,
    }),
    [sort, order, stateCode, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, stats] = await Promise.all([
        fetchCities(query),
        fetchCityStats(),
      ]);
      setCities(rows);
      setTotal(stats.total);
      setStateOptions(stats.byState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <p className="subtitle">
        Top 20 cities by population in each US state — lat/long ready for a map
        view later.
      </p>

      <div className="stat-pill stat-pill-inline">
        <span className="stat-value">{loading ? "…" : cities.length}</span>
        <span className="stat-label">shown / {total} cities (50 × 20)</span>
      </div>

      <section className="toolbar">
        <label className="field grow">
          <span>Search</span>
          <input
            type="search"
            placeholder="City name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>State</span>
          <select
            value={stateCode}
            onChange={(e) => setStateCode(e.target.value)}
          >
            <option value="">All states</option>
            {stateOptions.map((s) => (
              <option key={s.stateCode} value={s.stateCode}>
                {s.stateName} ({s.stateCode})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CityQuery["sort"])}
          >
            <option value="population">Population</option>
            <option value="name">Name</option>
            <option value="stateCode">State</option>
            <option value="rankInState">Rank in state</option>
            <option value="latitude">Latitude</option>
            <option value="longitude">Longitude</option>
          </select>
        </label>

        <label className="field">
          <span>Order</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as CityQuery["order"])}
          >
            <option value="desc">High → low</option>
            <option value="asc">Low → high</option>
          </select>
        </label>
      </section>

      {error && <div className="banner error" role="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>City</th>
              <th>State</th>
              <th>Rank</th>
              <th>Population</th>
              <th>Latitude</th>
              <th>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Loading cities…
                </td>
              </tr>
            ) : cities.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No cities match your filters.
                </td>
              </tr>
            ) : (
              cities.map((city) => (
                <tr key={city.id}>
                  <td className="name">{city.name}</td>
                  <td>
                    {city.stateName}{" "}
                    <span className="state-code">({city.stateCode})</span>
                  </td>
                  <td className="num">#{city.rankInState}</td>
                  <td className="num">{formatPopulation(city.population)}</td>
                  <td className="num">{formatCoord(city.latitude)}</td>
                  <td className="num">{formatCoord(city.longitude)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="data-credit">
        City coordinates and populations from GeoNames (via all-the-cities).
      </p>
    </>
  );
}
