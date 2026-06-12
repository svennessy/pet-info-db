import { useCallback, useEffect, useMemo, useState } from "react";
import { OTHER_PET_PHOTO_KINDS } from "../data/otherPetPhotoKinds";
import { photoDisplayUrl } from "../lib/resolveAssetUrl";
import {
  fetchOtherPetPhotos,
  fetchOtherPetPhotoStats,
  fetchPetStats,
  type OtherPetPhotoQuery,
  type OtherPetPhotoRow,
  type PetReportStatus,
} from "../api";

const PAGE_SIZE = 24;

const STATUS_LABELS: Record<PetReportStatus, string> = {
  lost: "Lost",
  found: "Found",
  resolved: "Resolved",
};

function PetPhotoCard({ pet }: { pet: OtherPetPhotoRow }) {
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

export function OtherPhotoExplorer() {
  const [pets, setPets] = useState<OtherPetPhotoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<{
    petsWithPhotos: number;
    photoCount: number;
    byPhotoCount: Array<{ photos: number; pets: number }>;
    byKind: Array<{ kind: string; count: number }>;
  } | null>(null);
  const [stateOptions, setStateOptions] = useState<
    Array<{ stateCode: string; stateName: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [reportStatus, setReportStatus] = useState<PetReportStatus | "">("");
  const [stateCode, setStateCode] = useState("");
  const [kind, setKind] = useState<"Bird" | "Rabbit" | "">("");
  const [sort, setSort] = useState<OtherPetPhotoQuery["sort"]>("name");
  const [order, setOrder] = useState<OtherPetPhotoQuery["order"]>("asc");

  const query = useMemo<OtherPetPhotoQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort,
      order,
      reportStatus: reportStatus || undefined,
      state: stateCode || undefined,
      kind: kind || undefined,
      search: search || undefined,
    }),
    [page, sort, order, reportStatus, stateCode, kind, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, photoStats, petStats] = await Promise.all([
        fetchOtherPetPhotos(query),
        fetchOtherPetPhotoStats(),
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
  }, [search, reportStatus, stateCode, kind, sort, order]);

  return (
    <>
      <p className="subtitle">
        Birds and bunnies with Pixabay photos — tags are checked so each
        picture matches the animal type.
      </p>

      <div className="stat-row">
        <div className="stat-pill stat-pill-inline">
          <span className="stat-value">
            {loading ? "…" : stats?.petsWithPhotos.toLocaleString() ?? 0}
          </span>
          <span className="stat-label">with photos</span>
        </div>
        {stats && stats.byKind.length > 0 && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">By kind</span>
            <span className="stat-hint">
              {stats.byKind.map((r) => `${r.kind}: ${r.count}`).join(" · ")}
            </span>
          </div>
        )}
      </div>

      {stats && stats.petsWithPhotos === 0 && !loading && (
        <p className="hint hint-info">
          Run <code className="mono">npm run dataset:other:fetch</code>, then{" "}
          <code className="mono">npm run dataset:other:process</code> and{" "}
          <code className="mono">npm run dataset:other:seed</code>.
        </p>
      )}

      <section className="toolbar">
        <label className="field grow">
          <span>Search</span>
          <input
            type="search"
            placeholder="Pet or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "Bird" | "Rabbit" | "")}
          >
            <option value="">Birds & bunnies</option>
            {OTHER_PET_PHOTO_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.kind === "Rabbit" ? "Bunnies" : k.kind}
              </option>
            ))}
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
              setSort(e.target.value as OtherPetPhotoQuery["sort"])
            }
          >
            <option value="name">Pet name</option>
            <option value="breedLabel">Kind</option>
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
              setOrder(e.target.value as OtherPetPhotoQuery["order"])
            }
          >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </label>
      </section>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading photos…</p>
      ) : pets.length === 0 ? (
        <p className="empty">
          No birds or bunnies with photos match your filters.
        </p>
      ) : (
        <div className="pet-photo-grid">
          {pets.map((pet) => (
            <PetPhotoCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}

      <nav className="pagination" aria-label="Bird and bunny photo pages">
        <button
          type="button"
          className="tab"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {totalPages} ({total.toLocaleString()} pets)
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
        Bird and bunny photos from Pixabay (tag-verified).
      </p>
    </>
  );
}
