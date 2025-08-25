// src/pages/degree_pages/AllDegrees.jsx
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
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

export default function AllDegrees() {
  // view state (match Blogs)
  const [view, setView] = useState("grid"); // 'list' | 'grid' | 'card'
  const [searchTerm, setSearchTerm] = useState("");

  // server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6); // default like Blogs page layout

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

  // icon color match (kept same feel as Blogs)
  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const makeSlug = (name, serverSlug) => {
    if (serverSlug && typeof serverSlug === "string" && serverSlug.length > 0)
      return serverSlug;
    if (!name) return "degree";
    return String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const toTags = (accreditation) => {
    if (!accreditation) return [];
    return Array.isArray(accreditation)
      ? accreditation
      : String(accreditation)
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

        const res = await axios.get(`${globalBackendRoute}/api/list-degrees`, {
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
        console.error("Error fetching degrees:", err);
        setFetchError("Failed to load degrees. Please try again.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [page, pageSize, searchTerm]);

  // numbers for the “Showing … of …” summary
  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  // better numeric pagination (compact with ellipses)
  const buildPageList = () => {
    const total = meta.totalPages;
    const current = meta.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([
      1,
      2,
      total - 1,
      total,
      current,
      current - 1,
      current + 1,
    ]);
    // remove out-of-range
    [...pages].forEach((p) => {
      if (p < 1 || p > total) pages.delete(p);
    });
    const sorted = [...pages].sort((a, b) => a - b);
    // insert ellipses markers
    const withDots = [];
    for (let i = 0; i < sorted.length; i++) {
      withDots.push(sorted[i]);
      if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) {
        withDots.push("…");
      }
    }
    return withDots;
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Search + Count + View Switcher (same shape as Blogs) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Degrees</h2>
        </div>

        {/* Search (server-side) */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search degrees by name, code, slug, department, awarding body, accreditation…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + Page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} degrees
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
        <p className="text-center text-gray-600 mt-6">Loading degrees…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-red-600 mt-6">{fetchError}</p>
      )}

      {/* Degree Cards/List */}
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
              const tags = toTags(d.accreditation);
              const created =
                d?.createdAt &&
                new Date(d.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              const slug = makeSlug(d?.name, d?.slug);
              const path = `/single-degree/${slug}/${d?._id || d?.id}`;

              // list layout uses a horizontal flex; grid/card are stacked
              const listLayout = view === "list";

              return (
                <Link key={d._id || d.id} to={path}>
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
                      {/* Title & key details (compact like Blogs) */}
                      <div className="text-left space-y-1 flex-shrink-0">
                        <h3 className="text-lg font-bold text-gray-900">
                          {d?.name || "Untitled Degree"}
                        </h3>

                        {created && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaCalendar className="mr-1 text-yellow-500" />
                            {created}
                          </p>
                        )}

                        <p className="text-sm text-gray-600 flex items-center">
                          <FaUser className="mr-1 text-red-500" />
                          <span className="truncate">
                            <span className="font-medium">Code:</span>{" "}
                            {d?.code || "—"}{" "}
                            <span className="ml-2 font-medium">Level:</span>{" "}
                            {d?.level || "—"}
                          </span>
                        </p>

                        <p className="text-sm text-gray-600 flex items-center">
                          <FaUniversity className="mr-1 text-indigo-500" />
                          <span className="truncate">
                            <span className="font-medium">Department:</span>{" "}
                            {d?.department || "—"}{" "}
                            {d?.awardingBody ? (
                              <>
                                <span className="ml-2 font-medium">
                                  Awarding Body:
                                </span>{" "}
                                {d.awardingBody}
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

                      {/* Optional summary-like block: show duration & semesters when not list */}
                      {view !== "list" &&
                        (d?.durationYears || d?.totalSemesters) && (
                          <p className="text-gray-700 mt-2 flex-shrink-0">
                            {d?.durationYears ? (
                              <span className="mr-3">
                                <span className="font-medium">Duration:</span>{" "}
                                {d.durationYears} year
                                {d.durationYears > 1 ? "s" : ""}
                              </span>
                            ) : null}
                            {d?.totalSemesters ? (
                              <span>
                                <span className="font-medium">Semesters:</span>{" "}
                                {d.totalSemesters}
                              </span>
                            ) : null}
                          </p>
                        )}

                      {/* Spacer */}
                      <div className="flex-grow" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </motion.div>

          {meta.total === 0 && (
            <p className="text-center text-gray-600 mt-6">No degrees found.</p>
          )}

          {/* Improved Pagination */}
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

              {/* numeric buttons w/ ellipses */}
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
