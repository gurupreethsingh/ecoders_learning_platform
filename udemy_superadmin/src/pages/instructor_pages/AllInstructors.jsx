// src/pages/instructor_pages/AllInstructors.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

// ===== helpers =====
const makeURL = (p) => `${globalBackendRoute}${p}`;
const DELETE_USER = (id) => `${globalBackendRoute}/api/users/delete-user/${id}`;

const PATHS = [
  "/api/get-instructors",
  "/api/instructors",
  "/api/get-users-by-role?role=instructor",
  "/api/all-users", // fallback: fetch all, then filter client-side
];

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

export default function AllInstructors() {
  const [view, setView] = useState("grid"); // 'list' | 'grid' | 'card'
  const [searchTerm, setSearchTerm] = useState("");

  // client-side pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // raw data from API (users with role=instructor)
  const [allRows, setAllRows] = useState([]);

  // derived/paginated
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

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

  // normalize various possible backend payload shapes
  const extractList = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    if (payload?.users && Array.isArray(payload.users)) return payload.users;
    return [];
  };

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setFetchError("");

      try {
        let payload = null;
        let usedPath = "";
        const tried = [];

        for (const path of PATHS) {
          const url = makeURL(path);
          tried.push(url);
          try {
            const res = await axios.get(url, {
              headers: authHeader,
              signal: ctrl.signal,
              validateStatus: (s) => s >= 200 && s < 300,
            });
            payload = res?.data;
            usedPath = path;
            break;
          } catch {
            // keep trying
          }
        }

        if (!alive) return;
        if (!payload) {
          throw new Error(
            `No instructors endpoint responded with 2xx.\nTried:\n${tried.join(
              "\n"
            )}`
          );
        }

        let list = extractList(payload);

        if (usedPath.includes("all-users")) {
          list = list.filter(
            (u) => String(u.role || "").toLowerCase() === "instructor"
          );
        }

        list = list.filter(
          (u) => String(u.role || "").toLowerCase() === "instructor"
        );

        list.sort((a, b) => {
          const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });

        setAllRows(list);
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching instructor users:", err);
        setFetchError(
          (err?.message || "Failed to load instructors.") +
            "\nHint: Check where you mounted the user router (e.g. app.use('/api', router) vs app.use('/api/users', router))."
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
  }, []);

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
  }, [allRows, searchTerm, page, pageSize]);

  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  const buildPageList = () => {
    const total = meta.totalPages;
    const current = meta.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, 2, total - 1, total, current, current - 1, current + 1]);
    [...pages].forEach((p) => {
      if (p < 1 || p > total) pages.delete(p);
    });
    const sorted = [...pages].sort((a, b) => a - b);
    const withDots = [];
    for (let i = 0; i < sorted.length; i++) {
      withDots.push(sorted[i]);
      if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) withDots.push("…");
    }
    return withDots;
  };

  const deleteUser = async (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Permanently delete user "${name || "Untitled"}"? This action cannot be undone.`
    );
    if (!ok) return;

    try {
      const res = await axios.delete(DELETE_USER(id), { headers: authHeader });
      if (res.status >= 200 && res.status < 300) {
        setAllRows((prev) =>
          prev.filter((u) => String(u._id || u.id) !== String(id))
        );
        alert("User deleted successfully.");
      } else {
        throw new Error("Failed to delete user.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message || err?.message || "Failed to delete user."
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">
            All Instructors (Users with role = instructor)
          </h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search instructors by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + Page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} instructors
          </p>

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

          <select
            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
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

              // Build SingleInstructor URL WITHOUT the 'by-slug' segment
              const slug = makeSlug(u?.slug || name);
              const courseId = u?._id || u?.id;
              const path = `/single-instructor/${courseId}/${slug}`;

              const listLayout = view === "list";

              return (
                <div key={u._id || u.id} className="relative">
                  {/* Delete */}
                  <button
                    title="Delete instructor user"
                    className="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                    onClick={(e) => deleteUser(e, u._id || u.id, name)}
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
                            {name || "Unnamed User"}
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
                              {u?.role ? (
                                <>
                                  <span className="ml-2 font-medium">Role:</span>{" "}
                                  {u.role}
                                </>
                              ) : null}
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
              No instructors (users with role=instructor) found.
            </p>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-8 gap-3">
            <div className="text-gray-700 text-sm">
              Page {meta.page} of {meta.totalPages} • Showing{" "}
              <span className="font-medium">
                {pageCountText.start}-{pageCountText.end}
              </span>{" "}
              of <span className="font-medium">{meta.total}</span> results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-white ${
                  meta.page <= 1
                    ? "bg-gray-300"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
                title="Previous page"
              >
                <FaArrowLeft />
              </button>

              <div className="flex items-center gap-1">
                {buildPageList().map((p, idx) =>
                  p === "…" ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 rounded border text-sm ${
                        p === meta.page
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      title={`Go to page ${p}`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-white ${
                  meta.page >= meta.totalPages
                    ? "bg-gray-300"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
                title="Next page"
              >
                <FaArrowRight />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
