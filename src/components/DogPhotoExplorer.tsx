import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMONALITY_LABELS } from "../data/breedCommonality";
import { getTopDogBreedFilterOptions } from "../data/topDogBreeds";
import {
  fetchDogPetPhotos,
  fetchDogPetPhotoStats,
  fetchPetStats,
  type DogPetPhotoQuery,
  type DogPetPhotoRow,
  type PetReportStatus,
} from "../api";
import { photoDisplayUrl } from "../lib/resolveAssetUrl";
import { BreedFilterSelect } from "./BreedFilterSelect";

const PAGE_SIZE = 24;

const STATUS_LABELS: Record<PetReportStatus, string> = {
  lost: "Lost",
  found: "Found",
  resolved: "Resolved",
};

function PetPhotoCard({ pet }: { pet: DogPetPhotoRow }) {
  const [index, setIndex] = useState(0);
  const photos = pet.photos;
  const current = photos[index];

  useEffect(() => {
    setIndex(0);
  }, [pet.id]);

  if (!current) return null;

  const hasMany = photos.length > 1;

  return (
    <article className="pet-photo-card">
      <div className="pet-photo-carousel">
        <img
          src={photoDisplayUrl(current)}
          alt={`${pet.name}, ${pet.breedLabel}`}
          loading="lazy"
          decoding="async"
          className="pet-photo-carousel-img"
        />
        {hasMany && (
          <>
            <button
              type="button"
              className="carousel-btn carousel-prev"
              aria-label="Previous photo"
              onClick={() =>
                setIndex((i) => (i - 1 + photos.length) % photos.length)
              }
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel-btn carousel-next"
              aria-label="Next photo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
            >
              ›
            </button>
            <div className="carousel-dots" aria-hidden>
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={i === index ? "dot active" : "dot"}
                />
              ))}
            </div>
            <span className="carousel-count">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      <div className="pet-photo-card-body">
        <div className="pet-photo-card-title">
          <span
            className={
              pet.name === "Unknown" ? "name name-unknown" : "name"
            }
          >
            {pet.name}
          </span>
          <span className={`badge badge-status-${pet.reportStatus}`}>
            {STATUS_LABELS[pet.reportStatus]}
          </span>
        </div>
        <p className="pet-photo-breed">{pet.breedLabel}</p>
        {pet.dogBreed && (
          <p className="slug">
            {COMMONALITY_LABELS[pet.dogBreed.commonality]}
          </p>
        )}
        <p className="pet-photo-owner">
          {pet.owner.firstName} {pet.owner.lastName}
        </p>
        <p className="pet-photo-location">
          {pet.owner.city.name},{" "}
          <span className="state-code">{pet.owner.city.stateCode}</span>
        </p>
      </div>
    </article>
  );
}

export function DogPhotoExplorer() {
  const [pets, setPets] = useState<DogPetPhotoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<{
    dogsWithPhotos: number;
    photoCount: number;
    byPhotoCount: Array<{ photos: number; dogs: number }>;
  } | null>(null);
  const breedOptions = useMemo(() => getTopDogBreedFilterOptions(), []);
  const [stateOptions, setStateOptions] = useState<
    Array<{ stateCode: string; stateName: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [reportStatus, setReportStatus] = useState<PetReportStatus | "">("");
  const [stateCode, setStateCode] = useState("");
  const [breedSlug, setBreedSlug] = useState("");
  const [sort, setSort] = useState<DogPetPhotoQuery["sort"]>("name");
  const [order, setOrder] = useState<DogPetPhotoQuery["order"]>("asc");
  const sortingByBreed = sort === "breedLabel";

  const query = useMemo<DogPetPhotoQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort,
      order,
      reportStatus: reportStatus || undefined,
      state: stateCode || undefined,
      breed: sortingByBreed && breedSlug ? breedSlug : undefined,
      search: search || undefined,
    }),
    [page, sort, order, reportStatus, stateCode, breedSlug, sortingByBreed, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, photoStats, petStats] = await Promise.all([
        fetchDogPetPhotos(query),
        fetchDogPetPhotoStats(),
        fetchPetStats(),
      ]);
      setPets(result.pets);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setStats(photoStats);
      setStateOptions(petStats.byState);
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
  }, [search, reportStatus, stateCode, breedSlug, sort, order]);

  useEffect(() => {
    if (sort !== "breedLabel") setBreedSlug("");
  }, [sort]);

  useEffect(() => {
    if (breedSlug && !breedOptions.some((b) => b.slug === breedSlug)) {
      setBreedSlug("");
    }
  }, [breedSlug, breedOptions]);

  return (
    <>
      <p className="subtitle">
        Dogs with 1–4 photos each from the Stanford Dogs dataset. Every photo for
        a pet comes from the same real dog instance, so a black Lab always looks
        like the same black Lab.
      </p>

      <div className="stat-row">
        <div className="stat-pill stat-pill-inline">
          <span className="stat-value">
            {loading ? "…" : stats?.dogsWithPhotos.toLocaleString() ?? 0}
          </span>
          <span className="stat-label">dogs with photos</span>
        </div>
        {stats && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">Photos per dog</span>
            <span className="stat-hint">
              {stats.byPhotoCount
                .map((r) => `${r.photos} photo${r.photos === 1 ? "" : "s"}: ${r.dogs}`)
                .join(" · ")}
            </span>
          </div>
        )}
      </div>

      {stats && stats.dogsWithPhotos === 0 && !loading && (
        <p className="hint hint-info">
          Run{" "}
          <code className="mono">npm run dataset:dog:stanford:fetch</code>,{" "}
          <code className="mono">npm run dataset:dog:stanford:process</code>,{" "}
          <code className="mono">npm run dataset:dog:mutt:fetch</code>,{" "}
          <code className="mono">npm run dataset:dog:mutt:process</code>, then{" "}
          <code className="mono">npm run dataset:dog:seed</code>.
        </p>
      )}

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
                {s.stateName}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as DogPetPhotoQuery["sort"])}
          >
            <option value="name">Pet name</option>
            <option value="breedLabel">Breed</option>
            <option value="reportStatus">Status</option>
            <option value="owner">Owner</option>
            <option value="state">State</option>
          </select>
        </label>

        <label className="field">
          <span>Order</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as DogPetPhotoQuery["order"])}
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </label>

        {sortingByBreed && (
          <BreedFilterSelect
            value={breedSlug}
            onChange={setBreedSlug}
            options={breedOptions}
          />
        )}
      </section>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading dog photos…</p>
      ) : pets.length === 0 ? (
        <p className="empty">No dogs with photos match your filters.</p>
      ) : (
        <div className="pet-photo-grid">
          {pets.map((pet) => (
            <PetPhotoCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}

      <nav className="pagination" aria-label="Dog photo pages">
        <button
          type="button"
          className="tab"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {totalPages} ({total.toLocaleString()} dogs)
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

      <p className="data-credit">
        Purebred images from Stanford Dogs (Khosla et al., FGVC 2011). Mixed-breed
        and *-mix pets use Wikimedia Commons mutt photos (
        <code className="mono">data/mixed-breed-dogs</code>).
      </p>
    </>
  );
}
