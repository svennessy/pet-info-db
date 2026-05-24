import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchUsers,
  fetchUserStats,
  type PetReportStatus,
  type PetSpeciesFilter,
  type UserPetSummary,
  type UserQuery,
  type UserRow,
} from "../api";
import { COMMONALITY_LABELS } from "../data/breedCommonality";

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

function breedMeta(pet: UserPetSummary) {
  const breed = pet.dogBreed ?? pet.catBreed;
  if (!breed) return null;
  const parts = [COMMONALITY_LABELS[breed.commonality]];
  if (breed.group) parts.push(breed.group.replace(/_/g, " "));
  return parts.join(" · ");
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function UserPetDropdown({ pet }: { pet: UserPetSummary | null }) {
  if (!pet) {
    return <span className="pet-none">—</span>;
  }

  const meta = breedMeta(pet);
  const summary = `${pet.name} · ${STATUS_LABELS[pet.reportStatus]}`;

  return (
    <select
      className="pet-info-select"
      defaultValue={String(pet.id)}
      aria-label={`Pet for ${pet.name}`}
    >
      <option value={String(pet.id)}>{summary}</option>
      <option disabled>──────────</option>
      <option disabled>Status: {STATUS_LABELS[pet.reportStatus]}</option>
      <option disabled>Species: {SPECIES_LABELS[pet.species]}</option>
      <option disabled>Breed: {pet.breedLabel}</option>
      {meta ? <option disabled>{meta}</option> : null}
      {pet.otherKind ? (
        <option disabled>Kind: {pet.otherKind}</option>
      ) : null}
    </select>
  );
}

export function UserExplorer() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stateOptions, setStateOptions] = useState<
    Array<{ stateCode: string; stateName: string; count: number }>
  >([]);
  const [topNames, setTopNames] = useState<
    Array<{ firstName: string; lastName: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [sort, setSort] = useState<UserQuery["sort"]>("lastName");
  const [order, setOrder] = useState<UserQuery["order"]>("asc");

  const query = useMemo<UserQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort,
      order,
      state: stateCode || undefined,
      search: search || undefined,
    }),
    [page, sort, order, stateCode, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, stats] = await Promise.all([
        fetchUsers(query),
        fetchUserStats(),
      ]);
      setUsers(result.users);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setStateOptions(stats.byState);
      setTopNames(stats.topNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, stateCode, sort, order]);

  return (
    <>
      <p className="subtitle">
        20,000 synthetic users linked to cities — assignment weighted by city
        population so metros are denser, with census-style name frequencies.
      </p>

      <div className="stat-row">
        <div className="stat-pill stat-pill-inline">
          <span className="stat-value">{loading ? "…" : total.toLocaleString()}</span>
          <span className="stat-label">users total</span>
        </div>
        {!loading && topNames.length > 0 && (
          <div className="stat-pill stat-pill-inline stat-pill-wide">
            <span className="stat-label">Most common full names</span>
            <span className="stat-hint">
              {topNames
                .slice(0, 3)
                .map((n) => `${n.firstName} ${n.lastName} (${n.count})`)
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
            placeholder="Name or email…"
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
                {s.stateName} ({s.count.toLocaleString()})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as UserQuery["sort"])}
          >
            <option value="lastName">Last name</option>
            <option value="firstName">First name</option>
            <option value="email">Email</option>
            <option value="city">City</option>
            <option value="state">State</option>
          </select>
        </label>

        <label className="field">
          <span>Order</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as UserQuery["order"])}
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>City</th>
              <th>State</th>
              <th>Pet</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No users match your filters.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="name">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="mono">{user.email}</td>
                  <td className="mono">{formatPhone(user.phone)}</td>
                  <td>{user.city.name}</td>
                  <td>
                    {user.city.stateName}{" "}
                    <span className="state-code">({user.city.stateCode})</span>
                  </td>
                  <td className="pet-cell">
                    <UserPetDropdown pet={user.pet} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="pagination" aria-label="User pages">
        <button
          type="button"
          className="tab"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} of {totalPages} ({users.length} shown)
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
