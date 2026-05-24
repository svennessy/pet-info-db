import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchBreeds,
  fetchStats,
  type BreedQuery,
  type BreedRow,
  type Species,
} from "../api";
import {
  COMMONALITY_LABELS,
  COMMONALITY_ORDER,
} from "../data/breedCommonality";
import type { BreedCommonality } from "../data/breedCommonality";

const DOG_GROUP_LABELS: Record<string, string> = {
  sporting: "Sporting",
  hound: "Hound",
  working: "Working",
  terrier: "Terrier",
  toy: "Toy",
  non_sporting: "Non-sporting",
  herding: "Herding",
  misc: "Misc",
  foundation: "Foundation",
};

const CAT_GROUP_LABELS: Record<string, string> = {
  domestic: "Domestic",
  shorthair: "Shorthair",
  longhair: "Longhair",
  semi_longhair: "Semi-longhair",
  oriental: "Oriental",
  natural: "Natural",
  rex: "Rex",
  hairless: "Hairless",
  hybrid: "Hybrid",
  misc: "Misc",
};

function formatGroup(group: string | null, species: Species) {
  if (!group) return "—";
  const labels = species === "cat" ? CAT_GROUP_LABELS : DOG_GROUP_LABELS;
  return labels[group] ?? group;
}

type BreedExplorerProps = {
  species: Species;
  onSpeciesChange: (species: Species) => void;
};

export function BreedExplorer({ species, onSpeciesChange }: BreedExplorerProps) {
  const [breeds, setBreeds] = useState<BreedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [commonality, setCommonality] = useState("");
  const [group, setGroup] = useState("");
  const [sort, setSort] = useState<BreedQuery["sort"]>("weight");
  const [order, setOrder] = useState<BreedQuery["order"]>("desc");

  const groupLabels = species === "cat" ? CAT_GROUP_LABELS : DOG_GROUP_LABELS;

  const query = useMemo<BreedQuery>(
    () => ({
      species,
      sort,
      order,
      commonality: commonality || undefined,
      group: group || undefined,
      search: search || undefined,
    }),
    [species, sort, order, commonality, group, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [breedRows, stats] = await Promise.all([
        fetchBreeds(query),
        fetchStats(species),
      ]);
      setBreeds(breedRows);
      setTotal(stats.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBreeds([]);
    } finally {
      setLoading(false);
    }
  }, [query, species]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchSpecies = (next: Species) => {
    onSpeciesChange(next);
    setGroup("");
    setSearch("");
    setCommonality("");
  };

  const groupOptions = useMemo(
    () => Object.keys(groupLabels).sort(),
    [groupLabels],
  );

  const speciesLabel = species === "cat" ? "cats" : "dogs";

  return (
    <>
      <p className="subtitle">
        Browse {speciesLabel} breeds — filters and sorting update live.
      </p>

      <nav
        className="species-tabs sub-tabs"
        role="tablist"
        aria-label="Breed species"
      >
        <button
          type="button"
          role="tab"
          aria-selected={species === "dog"}
          className={species === "dog" ? "tab active" : "tab"}
          onClick={() => switchSpecies("dog")}
        >
          Dogs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={species === "cat"}
          className={species === "cat" ? "tab active" : "tab"}
          onClick={() => switchSpecies("cat")}
        >
          Cats
        </button>
      </nav>

      <div className="stat-pill stat-pill-inline">
        <span className="stat-value">{loading ? "…" : breeds.length}</span>
        <span className="stat-label">shown / {total} in database</span>
      </div>

      <section className="toolbar">
        <label className="field grow">
          <span>Search</span>
          <input
            type="search"
            placeholder="Name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Commonality</span>
          <select
            value={commonality}
            onChange={(e) => setCommonality(e.target.value)}
          >
            <option value="">All</option>
            {COMMONALITY_ORDER.map((tier) => (
              <option key={tier} value={tier}>
                {COMMONALITY_LABELS[tier as BreedCommonality]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">All</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {formatGroup(g, species)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as BreedQuery["sort"])}
          >
            <option value="weight">Weight</option>
            <option value="name">Name</option>
            <option value="commonality">Commonality</option>
            <option value="group">Group</option>
          </select>
        </label>

        <label className="field">
          <span>Order</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as BreedQuery["order"])}
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
              <th>Name</th>
              <th>Commonality</th>
              <th>Weight</th>
              <th>Group</th>
              <th>Slug</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty">
                  Loading breeds…
                </td>
              </tr>
            ) : breeds.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No breeds match your filters.
                </td>
              </tr>
            ) : (
              breeds.map((breed) => (
                <tr key={breed.slug}>
                  <td className="name">{breed.name}</td>
                  <td>
                    <span className={`badge badge-${breed.commonality}`}>
                      {COMMONALITY_LABELS[breed.commonality]}
                    </span>
                  </td>
                  <td className="num">{breed.weight}</td>
                  <td>{formatGroup(breed.group, species)}</td>
                  <td className="slug">{breed.slug}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
