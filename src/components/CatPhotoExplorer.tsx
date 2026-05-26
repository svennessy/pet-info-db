import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMONALITY_LABELS } from "../data/breedCommonality";
import { getTopCatBreedFilterOptions } from "../data/topCatBreeds";
import {
  fetchCatPetPhotos,
  fetchCatPetPhotoStats,
  fetchPetStats,
  type CatPetPhotoQuery,
  type CatPetPhotoRow,
  type PetReportStatus,
} from "../api";
import { photoDisplayUrl } from "../lib/resolveAssetUrl";
import { BreedFilterSelect } from "./BreedFilterSelect";

const PAGE_SIZE = 24;

const STATUS_LABELS: Record<PetReportStatus, string> = {
  lost: "Lost",
  found: "Found",
};

const PLACEHOLDER_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#e8ecef" width="100%" height="100%"/><text x="50%" y="50%" fill="#6c757d" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">Photo unavailable</text></svg>',
  );

function PetPhotoCard({ pet }: { pet: CatPetPhotoRow }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, true>>({});
  const photos = pet.photos;
  const current = photos[index];

  useEffect(() => {
    setIndex(0);
    setBroken({});
  }, [pet.id]);

  if (!current) return null;

  const hasMany = photos.length > 1;
  const src =
    broken[index] === true
      ? PLACEHOLDER_SRC
      : photoDisplayUrl(current);

  return (
    <article className="pet-photo-card">
      <div className="pet-photo-carousel">
        <img
          key={`${pet.id}-${index}-${src}`}
          src={src}
          alt={`${pet.name}, ${pet.breedLabel}`}
          loading="lazy"
          decoding="async"
          className="pet-photo-carousel-img"
          onError={() => {
            setBroken((prev) =>
              prev[index] === true ? prev : { ...prev, [index]: true },
            );
          }}
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
                <span key={i} className={i === index ? "dot active" : "dot"} />
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
            className={pet.name === "Unknown" ? "name name-unknown" : "name"}
          >
            {pet.name}
          </span>
          <span className={`badge badge-status-${pet.reportStatus}`}>
            {STATUS_LABELS[pet.reportStatus]}
          </span>
        </div>
        <p className="pet-photo-breed">{pet.breedLabel}</p>
        {pet.catBreed && (
          <p className="slug">{COMMONALITY_LABELS[pet.catBreed.commonality]}</p>
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

export function CatPhotoExplorer() {
  const [pets, setPets] = useState<CatPetPhotoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<{
    catsWithPhotos: number;
    photoCount: number;
    byPhotoCount: Array<{ photos: number; cats: number }>;
  } | null>(null);
  const breedOptions = useMemo(() => getTopCatBreedFilterOptions(), []);
  const [stateOptions, setStateOptions] = useState<
    Array<{ stateCode: string; stateName: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [reportStatus, setReportStatus] = useState<PetReportStatus | "">("");
  const [stateCode, setStateCode] = useState("");
  const [breedSlug, setBreedSlug] = useState("");
  const [sort, setSort] = useState<CatPetPhotoQuery["sort"]>("name");
  const [order, setOrder] = useState<CatPetPhotoQuery["order"]>("asc");
  const sortingByBreed = sort === "breedLabel";

  const query = useMemo<CatPetPhotoQuery>(
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
    [
      page,
      sort,
      order,
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
      const [result, photoStats, petStats] = await Promise.all([
        fetchCatPetPhotos(query),
        fetchCatPetPhotoStats(),
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
        Cats with candid Pixabay photos (top 20 breeds). Tags are checked so
        each breed&apos;s photos actually match.
      </p>

      <div className="stat-row">
        <div className="stat-pill stat-pill-inline">
          <span className="stat-value">
            {loading ? "…" : (stats?.catsWithPhotos.toLocaleString() ?? 0)}
          </span>
          <span className="stat-label">cats with photos</span>
        </div>
        {stats && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">Photos per cat</span>
            <span className="stat-hint">
              {stats.byPhotoCount
                .map(
                  (r) =>
                    `${r.photos} photo${r.photos === 1 ? "" : "s"}: ${r.cats}`,
                )
                .join(" · ")}
            </span>
          </div>
        )}
      </div>

      {stats && stats.catsWithPhotos === 0 && !loading && (
        <p className="hint hint-info">
          Add <code className="mono">PIXABAY_KEY</code> to{" "}
          <code className="mono">.env</code>
          Run <code className="mono">npm run dataset:cat:fetch</code>, then{" "}
          <code className="mono">npm run dataset:cat:process</code> and{" "}
          <code className="mono">npm run dataset:cat:seed</code>.
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
            onChange={(e) =>
              setSort(e.target.value as CatPetPhotoQuery["sort"])
            }
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
            onChange={(e) =>
              setOrder(e.target.value as CatPetPhotoQuery["order"])
            }
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
        <p className="empty">Loading cat photos…</p>
      ) : pets.length === 0 ? (
        <p className="empty">No cats with photos match your filters.</p>
      ) : (
        <div className="pet-photo-grid">
          {pets.map((pet) => (
            <PetPhotoCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}

      <nav className="pagination" aria-label="Cat photo pages">
        <button
          type="button"
          className="tab"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {totalPages} ({total.toLocaleString()} cats)
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
        Candid cat photos from Pixabay (breed tag–verified).
      </p>
    </>
  );
}
