import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaArrowLeft,
  FaArrowRight,
  FaCalendar,
  FaTags,
  FaUser,
  FaSearch,
  FaGraduationCap,
  FaUniversity,
  FaTrashAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

export default function Allsemesters() {
  const [view, setView] = useState("grid"); // 'list' | 'grid' | 'card'
  const [searchTerm, setSearchTerm] = useState("");

  // server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // data + meta
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // re-fetch after delete

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const makeSlug = (name, serverSlug, semNumber) => {
    if (serverSlug && typeof serverSlug === "string" && serverSlug.length > 0)
      return serverSlug;
    const base = name || (semNumber ? `semester ${semNumber}` : "semester");
    return String(base)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // For semesters, show academicYear as a "tag" (so the UI matches)
  const toTags = (academicYear) => {
    if (!academicYear) return [];
    if (Array.isArray(academicYear)) return academicYear.filter(Boolean);
    return String(academicYear)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  };

  // reset to first page when search/pageSize change
  useEffect(() => setPage(1), [searchTerm, pageSize]);

  // fetch from server (search + pagination)
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setFetchError("");
      try {
        const params = {
          page,
          limit: pageSize,
          sortBy: "createdAt",
          sortDir: "desc",
        };
        if (searchTerm.trim()) params.search = searchTerm.trim();

        // semester listing endpoint
        const res = await axios.get(`${globalBackendRoute}/api/semesters`, {
          params,
          signal: ctrl.signal,
        });

        const data = res.data?.data || [];
        const m = res.data?.meta || {};
        if (!alive) return;

        setRows(Array.isArray(data) ? data : []);
        setMeta({
          page: Number(m.page || page),
          limit: Number(m.limit || pageSize),
          total: Number(m.total || data.length),
          totalPages: Number(m.totalPages || 1),
        });
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching semesters:", err);
        setFetchError("Failed to load semesters. Please try again.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [page, pageSize, searchTerm, refreshKey]);

  // numbers for the “Showing … of …” summary
  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  // ---- New pagination builder (styled like AllCategories) ----
  const currentPage = meta.page || 1;
  const totalPages = Math.max(1, meta.totalPages || 1);
  const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages));
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

  // --- delete one semester ---
  const deletesemester = async (e, id, name) => {
    // ensure clicking delete does not trigger the card link
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Delete semester "${name || "Untitled"}"? This action cannot be undone.`
    );
    if (!ok) return;

    try {
      // semester delete endpoint
      const res = await axios.delete(
        `${globalBackendRoute}/api/semesters/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        // if deleting last item on the page, step back a page
        if (rows.length === 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        }
        setRefreshKey((k) => k + 1);
        alert("semester deleted successfully.");
      } else {
        throw new Error("Failed to delete semester.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete semester."
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Search + Count + View Switcher (same shape as Degrees) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All semesters</h2>
        </div>

        {/* Search (server-side) */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search semesters by name, code, slug, academic year, description…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + Page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} semesters
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
        <p className="text-center text-gray-600 mt-6">Loading semesters…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-red-600 mt-6">{fetchError}</p>
      )}

      {/* semester Cards/List */}
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
            {rows.map((d) => {
              const tags = toTags(d?.academicYear);
              const created =
                d?.createdAt &&
                new Date(d.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

              const title =
                d?.semester_name ||
                (d?.semNumber
                  ? `Semester ${d.semNumber}`
                  : "Untitled semester");

              const slug = makeSlug(d?.semester_name, d?.slug, d?.semNumber);
              const path = `/single-semester/${slug}/${d?._id || d?.id}`;

              const listLayout = view === "list";

              // derive a small “summary” line like durations in degrees:
              const dateRange =
                d?.startDate || d?.endDate
                  ? `${
                      d?.startDate
                        ? new Date(d.startDate).toLocaleDateString()
                        : "—"
                    } → ${
                      d?.endDate
                        ? new Date(d.endDate).toLocaleDateString()
                        : "—"
                    }`
                  : null;

              // ✅ Pull ID once
              const semId = d?._id || d?.id || "—";

              return (
                <div key={semId} className="relative">
                  {/* Delete button (outside the card link, absolute on container) */}
                  <button
                    title="Delete semester"
                    className="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                    onClick={(e) => deletesemester(e, semId, title)}
                  >
                    <FaTrashAlt className="h-4 w-4" />
                  </button>

                  {/* Card link (whole card navigates) */}
                  <Link to={path}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden h-full flex ${
                        listLayout ? "flex-row p-4 items-center" : "flex-col"
                      }`}
                    >
                      {/* Icon badge (no images) */}
                      <div
                        className={`${
                          listLayout
                            ? "w-16 h-16 flex-shrink-0 mr-4"
                            : "w-full h-16"
                        } flex items-center justify-center`}
                      >
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-700">
                          <FaGraduationCap />
                        </div>
                      </div>

                      {/* Content */}
                      <div
                        className={`${
                          listLayout
                            ? "flex-1 flex flex-col"
                            : "p-4 flex flex-col flex-grow"
                        }`}
                      >
                        <div className="text-left space-y-1 flex-shrink-0">
                          <h3 className="text-lg font-bold text-gray-900">
                            {title}
                          </h3>

                          {/* ✅ semester ID (visible on card) */}
                          <div className="text-xs text-gray-700">
                            <span className="font-medium mr-1">
                              semester ID:
                            </span>
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {semId}
                            </code>
                          </div>

                          {created && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {created}
                            </p>
                          )}

                          {/* Code + Sem # (mirrors Code + Level) */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUser className="mr-1 text-red-500" />
                            <span className="truncate">
                              <span className="font-medium">Code:</span>{" "}
                              {d?.semester_code || "—"}{" "}
                              <span className="ml-2 font-medium">Sem #:</span>{" "}
                              {d?.semNumber ?? "—"}
                            </span>
                          </p>

                          {/* Academic Year + Credits (mirrors Department + Awarding Body) */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUniversity className="mr-1 text-indigo-500" />
                            <span className="truncate">
                              <span className="font-medium">
                                Academic Year:
                              </span>{" "}
                              {d?.academicYear || "—"}{" "}
                              {d?.totalCredits != null ? (
                                <>
                                  <span className="ml-2 font-medium">
                                    Credits:
                                  </span>{" "}
                                  {d.totalCredits}
                                </>
                              ) : null}
                            </span>
                          </p>

                          {tags.length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {tags.join(", ")}
                            </p>
                          )}
                        </div>

                        {/* Optional summary-like block */}
                        {view !== "list" &&
                          (dateRange || d?.totalCoursesPlanned != null) && (
                            <p className="text-gray-700 mt-2 flex-shrink-0">
                              {dateRange ? (
                                <span className="mr-3">
                                  <span className="font-medium">Dates:</span>{" "}
                                  {dateRange}
                                </span>
                              ) : null}
                              {d?.totalCoursesPlanned != null ? (
                                <span>
                                  <span className="font-medium">
                                    Courses Planned:
                                  </span>{" "}
                                  {d.totalCoursesPlanned}
                                </span>
                              ) : null}
                            </p>
                          )}

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
              No semesters found.
            </p>
          )}

          {/* ---- Updated Pagination (styled like AllCategories) ---- */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-gray-700 text-sm">
                Page {currentPage} of {totalPages} • Showing{" "}
                <span className="font-medium">
                  {pageCountText.start}-{pageCountText.end}
                </span>{" "}
                of <span className="font-medium">{meta.total}</span> results
              </div>

              <div className="flex items-center justify-center gap-2">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
