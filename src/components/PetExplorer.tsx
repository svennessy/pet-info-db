import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMONALITY_LABELS } from "../data/breedCommonality";
import {
  fetchPets,
  fetchPetStats,
  type PetQuery,
  type PetReportStatus,
  type PetRow,
  type PetSpeciesFilter,
} from "../api";
import { getTopCatBreedFilterOptions } from "../data/topCatBreeds";
import { getTopDogBreedFilterOptions } from "../data/topDogBreeds";
import { BreedFilterSelect, type BreedFilterOption } from "./BreedFilterSelect";

const PAGE_SIZE = 50;

const SPECIES_LABELS: Record<PetSpeciesFilter, string> = {
  dog: "Dog",
  cat: "Cat",
  other: "Other",
};

const STATUS_LABELS: Record<PetReportStatus, string> = {
  lost: "Lost",
  found: "Found",
};

function breedDetail(pet: PetRow) {
  const breed = pet.dogBreed ?? pet.catBreed;
  if (!breed) return null;
  return `${COMMONALITY_LABELS[breed.commonality]} · weight ${breed.weight}`;
}

export function PetExplorer() {
  const [pets, setPets] = useState<PetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [bySpecies, setBySpecies] = useState<
    Array<{ species: PetSpeciesFilter; count: number }>
  >([]);
  const [byReportStatus, setByReportStatus] = useState<
    Array<{ reportStatus: PetReportStatus; count: number }>
  >([]);
  const [topDogBreeds, setTopDogBreeds] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [stateOptions, setStateOptions] = useState<
    Array<{ stateCode: string; stateName: string; count: number }>
  >([]);
  const [breedOptions, setBreedOptions] = useState<BreedFilterOption[]>([]);
  const [breedGroups, setBreedGroups] = useState<
    Array<{ label: string; options: BreedFilterOption[] }> | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState<PetSpeciesFilter | "">("");
  const [reportStatus, setReportStatus] = useState<PetReportStatus | "">("");
  const [stateCode, setStateCode] = useState("");
  const [breedSlug, setBreedSlug] = useState("");
  const [sort, setSort] = useState<PetQuery["sort"]>("name");
  const [order, setOrder] = useState<PetQuery["order"]>("asc");

  const sortingByBreed = sort === "breedLabel";

  const query = useMemo<PetQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort,
      order,
      species: species || undefined,
      reportStatus: reportStatus || undefined,
      state: stateCode || undefined,
      breed: sortingByBreed && breedSlug ? breedSlug : undefined,
      search: search || undefined,
    }),
    [
      page,
      sort,
      order,
      species,
      reportStatus,
      stateCode,
      breedSlug,
      sortingByBreed,
      search,
    ],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, stats] = await Promise.all([
        fetchPets(query),
        fetchPetStats(),
      ]);
      setPets(result.pets);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setBySpecies(stats.bySpecies);
      setByReportStatus(stats.byReportStatus);
      setStateOptions(stats.byState);
      setTopDogBreeds(stats.topDogBreeds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPets([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, species, reportStatus, stateCode, breedSlug, sort, order]);

  useEffect(() => {
    if (sort !== "breedLabel") setBreedSlug("");
  }, [sort]);

  useEffect(() => {
    if (species === "other") setBreedSlug("");
  }, [species]);

  useEffect(() => {
    if (species === "other") {
      setBreedOptions([]);
      setBreedGroups(undefined);
      return;
    }

    void (async () => {
      try {
        if (species === "dog") {
          setBreedOptions(getTopDogBreedFilterOptions());
          setBreedGroups(undefined);
        } else if (species === "cat") {
          setBreedOptions(getTopCatBreedFilterOptions());
          setBreedGroups(undefined);
        } else {
          const dogs = getTopDogBreedFilterOptions();
          const cats = getTopCatBreedFilterOptions();
          setBreedOptions([]);
          setBreedGroups([
            {
              label: "Dogs",
              options: dogs.map((b) => ({ slug: b.slug, name: b.name })),
            },
            {
              label: "Cats",
              options: cats.map((b) => ({ slug: b.slug, name: b.name })),
            },
          ]);
        }
      } catch {
        setBreedOptions([]);
        setBreedGroups(undefined);
      }
    })();
  }, [species]);

  return (
    <>
      <p className="subtitle">
        20,000 pets — 60% dogs, 37% cats, 3% other — each linked to an owner.
        Dog and cat breeds use the top 100 dog and top 20 cat breeds by weight. Lost vs found rates follow US report data (more lost than found;
        cats skew slightly more lost than dogs).
      </p>

      <div className="stat-row">
        <div className="stat-pill stat-pill-inline">
          <span className="stat-value">{loading ? "…" : total.toLocaleString()}</span>
          <span className="stat-label">pets total</span>
        </div>
        {!loading && bySpecies.length > 0 && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">By species</span>
            <span className="stat-hint">
              {bySpecies
                .map((s) => `${SPECIES_LABELS[s.species]} ${s.count.toLocaleString()}`)
                .join(" · ")}
            </span>
          </div>
        )}
        {!loading && byReportStatus.length > 0 && total > 0 && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">Reports (US-style)</span>
            <span className="stat-hint">
              {byReportStatus
                .map((s) => {
                  const pct = ((s.count / total) * 100).toFixed(1);
                  return `${STATUS_LABELS[s.reportStatus]} ${s.count.toLocaleString()} (${pct}%)`;
                })
                .join(" · ")}
            </span>
          </div>
        )}
        {!loading && topDogBreeds.length > 0 && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">Top dog breeds</span>
            <span className="stat-hint">
              {topDogBreeds
                .slice(0, 3)
                .map((b) => `${b.name} (${b.count.toLocaleString()})`)
                .join(" · ")}
            </span>
          </div>
        )}
      </div>

      <section className="toolbar">
        <label className="field grow">
          <span>Search</span>
          <input
            type="search"
            placeholder="Pet, breed, or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Species</span>
          <select
            value={species}
            onChange={(e) =>
              setSpecies(e.target.value as PetSpeciesFilter | "")
            }
          >
            <option value="">All</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select
            value={reportStatus}
            onChange={(e) =>
              setReportStatus(e.target.value as PetReportStatus | "")
            }
          >
            <option value="">All</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
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
                {s.stateName} ({s.count.toLocaleString()})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as PetQuery["sort"])}
          >
            <option value="name">Pet name</option>
            <option value="breedLabel">Breed</option>
            <option value="species">Species</option>
            <option value="reportStatus">Status</option>
            <option value="owner">Owner</option>
            <option value="state">State</option>
          </select>
        </label>

        <label className="field">
          <span>Order</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as PetQuery["order"])}
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </label>

        {sortingByBreed && species !== "other" && (
          <BreedFilterSelect
            value={breedSlug}
            onChange={setBreedSlug}
            options={breedOptions}
            groups={breedGroups}
          />
        )}
      </section>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pet</th>
              <th>Status</th>
              <th>Species</th>
              <th>Breed</th>
              <th>Owner</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Loading pets…
                </td>
              </tr>
            ) : pets.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No pets match your filters.
                </td>
              </tr>
            ) : (
              pets.map((pet) => (
                <tr key={pet.id}>
                  <td
                    className={
                      pet.name === "Unknown" ? "name name-unknown" : "name"
                    }
                  >
                    {pet.name}
                  </td>
                  <td>
                    <span
                      className={`badge badge-status-${pet.reportStatus}`}
                    >
                      {STATUS_LABELS[pet.reportStatus]}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-species-${pet.species}`}>
                      {SPECIES_LABELS[pet.species]}
                    </span>
                  </td>
                  <td>
                    <span className="name">{pet.breedLabel}</span>
                    {breedDetail(pet) && (
                      <div className="slug">{breedDetail(pet)}</div>
                    )}
                  </td>
                  <td>
                    {pet.owner.firstName} {pet.owner.lastName}
                  </td>
                  <td>
                    {pet.owner.city.name},{" "}
                    <span className="state-code">
                      {pet.owner.city.stateCode}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="pagination" aria-label="Pet pages">
        <button
          type="button"
          className="tab"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="tab"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </nav>
    </>
  );
}
