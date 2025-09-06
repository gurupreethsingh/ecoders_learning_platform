import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaArrowLeft,
  FaArrowRight,
  FaCalendar,
  FaUser,
  FaSearch,
  FaTrashAlt,
  FaIdBadge,
  FaTimes,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

/* ========================= helpers & constants ========================= */
const makeURL = (p) => `${globalBackendRoute}${p}`;

function makeSlug(input) {
  return String(input || "instructor")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
const shortId = (val) =>
  typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

const useQueryParams = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "deleted", label: "Deleted" },
];

export default function AllInstructors() {
  const navigate = useNavigate();
  const location = useLocation();
  const qp = useQueryParams();

  // read ONLY from query params
  const effectiveStatus = (qp.get("status") || "all").toLowerCase(); // pending|approved|rejected|deleted|all
  const urlActiveRaw = qp.get("active"); // "true" | "false" | null
  const hasEffectiveActive =
    urlActiveRaw === "true" || urlActiveRaw === "false";
  const effectiveActive = hasEffectiveActive
    ? urlActiveRaw === "true"
    : undefined;

  const [view, setView] = useState("grid"); // 'list' | 'grid' | 'card'
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // status counts for badges
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    deleted: 0,
    active: 0,
    inactive: 0,
  });

  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const displayName = (u) =>
    u.fullName ||
    u.name ||
    (u.firstName || u.lastName
      ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
      : "") ||
    u.email ||
    shortId(u._id || u.id);

  /* =========================== fetch counts (badges) =========================== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(makeURL("/api/instructors/counts"), {
          headers: authHeader,
        });
        if (!alive) return;
        if (res?.data?.success && res.data.data) {
          setCounts(res.data.data);
        }
      } catch (e) {
        // silent fail for badges
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================================ fetch list ================================ */
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setFetchError("");

      try {
        const url = makeURL("/api/instructors/list");
        const params = {};
        if (effectiveStatus && effectiveStatus !== "all")
          params.status = effectiveStatus;
        if (hasEffectiveActive)
          params.active = String(Boolean(effectiveActive));

        const res = await axios.get(url, {
          headers: authHeader,
          signal: ctrl.signal,
          params,
          validateStatus: (s) => s >= 200 && s < 300,
        });

        const payload = res?.data;
        const list = Array.isArray(payload?.data) ? payload.data : [];

        // Sort by created date desc if present
        list.sort((a, b) => {
          const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });

        if (!alive) return;
        setAllRows(list);
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching instructors:", err);
        setFetchError(
          (err?.message || "Failed to load instructors.") +
            "\nHint: Ensure /api/instructors/list route is mounted and reachable."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // reset to first page when search/pageSize change
  useEffect(() => setPage(1), [searchTerm, pageSize]);

  // client-side search + pagination
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = !q
      ? allRows
      : allRows.filter((u) => {
          const name = displayName(u).toLowerCase();
          const email = String(u.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    setRows(filtered.slice(start, end));
    setMeta({ page: currentPage, limit: pageSize, total, totalPages });
  }, [allRows, searchTerm, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // pagination helpers (like your sample)
  const currentPage = meta.page;
  const totalPages = meta.totalPages;
  const goTo = (p) =>
    setPage(Math.min(Math.max(1, Number(p) || 1), totalPages));
  const buildPages = () => {
    const pages = [];
    const maxBtns = 7;
    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 4) pages.push("…");
    const s = Math.max(2, currentPage - 1);
    const e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  const clearFilters = () => {
    navigate("/all-instructors", { replace: true });
  };

  const setStatusInURL = (statusValue) => {
    const usp = new URLSearchParams(location.search);
    if (!statusValue || statusValue === "all") usp.delete("status");
    else usp.set("status", statusValue);
    navigate(`/all-instructors?${usp.toString()}`, { replace: true });
  };

  const StatusBadge = ({ label, value, active, onClick }) => (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm transition",
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow"
          : "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      ].join(" ")}
      title={`${label} instructors`}
    >
      <span className="font-semibold">{label}</span>
      <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-white/80 text-indigo-700 border border-indigo-200">
        {value}
      </span>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Instructors</h2>

          {/* Status badges row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              label="All"
              value={counts.total}
              active={effectiveStatus === "all"}
              onClick={() => setStatusInURL("all")}
            />
            <StatusBadge
              label="Pending"
              value={counts.pending}
              active={effectiveStatus === "pending"}
              onClick={() => setStatusInURL("pending")}
            />
            <StatusBadge
              label="Approved"
              value={counts.approved}
              active={effectiveStatus === "approved"}
              onClick={() => setStatusInURL("approved")}
            />
            <StatusBadge
              label="Rejected"
              value={counts.rejected}
              active={effectiveStatus === "rejected"}
              onClick={() => setStatusInURL("rejected")}
            />
            <StatusBadge
              label="Deleted"
              value={counts.deleted}
              active={effectiveStatus === "deleted"}
              onClick={() => setStatusInURL("deleted")}
            />
            {(effectiveStatus !== "all" || hasEffectiveActive) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full border text-gray-700 hover:bg-gray-50"
                title="Clear filters"
              >
                <FaTimes /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Search (smaller) + Status dropdown + View + Page size */}
        <div className="flex flex-wrap items-center gap-3 justify-end w-full sm:w-auto">
          {/* small search input */}
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search name/email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 max-w-xs rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
            <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* status dropdown (affects backend filter) */}
          <select
            value={effectiveStatus}
            onChange={(e) => setStatusInURL(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Filter by approval status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* view toggles */}
          <div className="flex items-center space-x-2 ml-2">
            <FaThList
              className={`cursor-pointer ${iconStyle.list}`}
              onClick={() => setView("list")}
              title="List view"
            />
            <FaTh
              className={`cursor-pointer ${iconStyle.card}`}
              onClick={() => setView("card")}
              title="Card view"
            />
            <FaThLarge
              className={`cursor-pointer ${iconStyle.grid}`}
              onClick={() => setView("grid")}
              title="Grid view"
            />
          </div>

          {/* per page */}
          <select
            className="border border-gray-300 rounded px-2 py-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Items per page"
          >
            {[6, 12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading instructors…</p>
      )}
      {fetchError && !loading && (
        <pre className="text-center text-red-600 mt-6 whitespace-pre-wrap">
          {fetchError}
        </pre>
      )}

      {/* Cards/List */}
      {!loading && !fetchError && (
        <>
          <motion.div
            className={`grid gap-6 ${
              view === "list"
                ? "grid-cols-1"
                : view === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {rows.map((u) => {
              const name = displayName(u);
              const created =
                u?.createdAt &&
                new Date(u.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

              const slug = makeSlug(u?.slug || name);
              const id = u?._id || u?.id; // instructor _id
              const path = `/single-instructor/${id}/${slug}`;
              const listLayout = view === "list";

              return (
                <div key={u._id || u.id} className="relative">
                  {/* Delete (wire up real endpoint if needed) */}
                  <button
                    title="Delete instructor"
                    className="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      alert("Wire up a real delete endpoint for instructors.");
                    }}
                  >
                    <FaTrashAlt className="h-4 w-4" />
                  </button>

                  <Link to={path}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden h-full flex ${
                        listLayout ? "flex-row p-4 items-center" : "flex-col"
                      }`}
                    >
                      <div
                        className={`${
                          listLayout
                            ? "w-16 h-16 flex-shrink-0 mr-4"
                            : "w-full h-16"
                        } flex items-center justify-center`}
                      >
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-700">
                          <FaIdBadge />
                        </div>
                      </div>

                      <div
                        className={`${
                          listLayout
                            ? "flex-1 flex flex-col"
                            : "p-4 flex flex-col flex-grow"
                        }`}
                      >
                        <div className="text-left space-y-1 flex-shrink-0">
                          <h3 className="text-lg font-bold text-gray-900">
                            {name || "Unnamed Instructor"}
                          </h3>

                          {created && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              Joined {created}
                            </p>
                          )}

                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUser className="mr-1 text-red-500" />
                            <span className="truncate">
                              <span className="font-medium">Email:</span>{" "}
                              {u?.email || "—"}
                              {typeof u?.applicationStatus === "string" && (
                                <>
                                  <span className="ml-2 font-medium">
                                    Status:
                                  </span>{" "}
                                  {u.applicationStatus}
                                </>
                              )}
                              {typeof u?.isActive === "boolean" && (
                                <>
                                  <span className="ml-2 font-medium">
                                    Active:
                                  </span>{" "}
                                  {u.isActive ? "true" : "false"}
                                </>
                              )}
                            </span>
                          </p>
                        </div>

                        <div className="flex-grow" />
                      </div>
                    </motion.div>
                  </Link>
                </div>
              );
            })}
          </motion.div>

          {meta.total === 0 && (
            <p className="text-center text-gray-600 mt-6">
              No instructors found with the current filters.
            </p>
          )}

          {/* Pagination — like your sample */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => goTo(1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-full border text-sm ${
                  currentPage === 1
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                « First
              </button>
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-full border text-sm ${
                  currentPage === 1
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                ‹ Prev
              </button>

              {buildPages().map((p, idx) =>
                p === "…" ? (
                  <span
                    key={`dots-${idx}`}
                    className="px-2 text-gray-400 select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={`min-w-[36px] px-3 py-1 rounded-full border text-sm transition ${
                      p === currentPage
                        ? "bg-purple-600 text-white border-purple-600 shadow"
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-full border text-sm ${
                  currentPage === totalPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                Next ›
              </button>
              <button
                onClick={() => goTo(totalPages)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-full border text-sm ${
                  currentPage === totalPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                Last »
              </button>
            </div>
          )}

          {/* Footer count (like your sample’s top-right text but here at bottom too) */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold">
              {meta.total === 0 ? 0 : pageCountText.start}–{pageCountText.end}
            </span>{" "}
            of <span className="font-semibold">{meta.total}</span>
            {searchTerm ? (
              <span className="ml-2 text-gray-500">
                (search: <span className="italic">"{searchTerm}"</span>)
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
