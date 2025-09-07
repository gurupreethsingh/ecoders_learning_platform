import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaGraduationCap,
  FaUniversity,
  FaTrashAlt,
  FaUser,
  FaCalendar,
  FaTags,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config.js";

export default function AllCourses() {
  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [degreeMap, setDegreeMap] = useState({});
  const [categoryMap, setCategoryMap] = useState({});
  const [subCategoryMap, setSubCategoryMap] = useState({});
  const [semisterMap, setSemisterMap] = useState({});
  const [instructorMap, setInstructorMap] = useState({});

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const makeSlug = (name, serverSlug) => {
    if (serverSlug && typeof serverSlug === "string" && serverSlug.length > 0)
      return serverSlug;
    if (!name) return "course";
    return String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const toTags = (arr) => {
    if (!arr) return [];
    return Array.isArray(arr)
      ? arr
      : String(arr)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
  };

  const shortId = (val) =>
    typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

  const formatPrice = (n) => {
    if (n === 0) return "Free";
    if (!Number.isFinite(Number(n))) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(n));
    } catch {
      return `$${n}`;
    }
  };

  useEffect(() => setPage(1), [searchTerm, pageSize]);

  // lookups for degree/category/subcategory/semister/instructor
  useEffect(() => {
    let alive = true;

    const fetchLookups = async () => {
      try {
        const [degRes, catRes, subCatRes, semRes, instructorsRes] =
          await Promise.allSettled([
            axios.get(`${globalBackendRoute}/api/list-degrees`, {
              params: { page: 1, limit: 500 },
            }),
            axios.get(`${globalBackendRoute}/api/all-categories`),
            axios
              .get(`${globalBackendRoute}/api/all-subcategories`)
              .catch(() => ({ data: { data: [] } })),
            axios
              .get(`${globalBackendRoute}/api/semisters`, {
                params: { page: 1, limit: 2000 },
              })
              .catch(() => ({ data: { data: [] } })),
            axios
              .get(`${globalBackendRoute}/api/get-instructors`)
              .catch(() => ({ data: { data: [] } })),
          ]);

        if (!alive) return;

        // Degrees
        if (degRes.status === "fulfilled") {
          const list = degRes.value?.data?.data || [];
          const map = {};
          list.forEach((d) => {
            map[d._id || d.id] = d.name || d.title || "Untitled Degree";
          });
          setDegreeMap(map);
        }

        // Categories
        if (catRes.status === "fulfilled") {
          const list = catRes.value?.data || catRes.value?.data?.data || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((c) => {
            map[c._id || c.id] = c.category_name || c.name || "Uncategorized";
          });
          setCategoryMap(map);
        }

        // Subcategories (best-effort)
        if (subCatRes.status === "fulfilled") {
          const list =
            subCatRes.value?.data?.data || subCatRes.value?.data || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((s) => {
            map[s._id || s.id] = s.subcategory_name || s.name || "—";
          });
          setSubCategoryMap(map);
        }

        // Semisters
        if (semRes.status === "fulfilled") {
          const list = semRes.value?.data?.data || semRes.value?.data || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((s) => {
            const label =
              s.title ||
              s.semister_name ||
              (s.semNumber ? `Semister ${s.semNumber}` : s.slug) ||
              "Semister";
            map[s._id || s.id] = label;
          });
          setSemisterMap(map);
        }

        // Instructors (best-effort)
        if (instructorsRes.status === "fulfilled") {
          const list =
            instructorsRes.value?.data?.data ||
            instructorsRes.value?.data ||
            [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((u) => {
            map[u._id || u.id] =
              u.name || u.fullName || u.email || "Instructor";
          });
          setInstructorMap(map);
        }
      } catch {
        // ignore; UI will fallback to IDs
      }
    };

    fetchLookups();
    return () => {
      alive = false;
    };
  }, []);

  // fetch courses
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

        const res = await axios.get(`${globalBackendRoute}/api/list-courses`, {
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
        console.error("Error fetching courses:", err);
        setFetchError("Failed to load courses. Please try again.");
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

  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  // Pagination helpers (styled/behavior like AllCategories)
  const goTo = (p) =>
    setPage(Math.min(Math.max(1, Number(p) || 1), meta.totalPages));

  const buildPages = () => {
    const totalPages = meta.totalPages;
    const currentPage = meta.page;
    const maxBtns = 7;
    if (totalPages <= maxBtns) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);
    if (currentPage > 4) pages.push("…");
    const s = Math.max(2, currentPage - 1);
    const e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  const renderBadges = (c) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {c?.published ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">
            Published
          </span>
        ) : (
          <span className="inline-block text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
            Draft
          </span>
        )}
        {c?.isFeatured ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">
            Featured
          </span>
        ) : null}
        {c?.isArchived ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
            Archived
          </span>
        ) : null}
        {c?.accessType ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
            {c.accessType}
          </span>
        ) : null}
      </div>
    );
  };

  const deleteCourse = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete course "${title || "Untitled"}"? This action cannot be undone.`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${globalBackendRoute}/api/delete-course/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Course deleted successfully.");
      } else {
        throw new Error("Failed to delete course.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete course."
      );
    }
  };

  const toggle = async (e, id, kind) => {
    e.preventDefault();
    e.stopPropagation();
    const url =
      kind === "published"
        ? `${globalBackendRoute}/api/courses/${id}/toggle-published`
        : kind === "archived"
        ? `${globalBackendRoute}/api/courses/${id}/toggle-archived`
        : `${globalBackendRoute}/api/courses/${id}/toggle-featured`;
    try {
      const res = await axios.post(url);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
      } else {
        throw new Error("Toggle failed");
      }
    } catch (err) {
      console.error("Toggle failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Courses</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search courses by title, slug, level, language, tags, etc."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} courses
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
        <p className="text-center text-gray-600 mt-6">Loading courses…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-red-600 mt-6">{fetchError}</p>
      )}

      {/* List / Cards */}
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
            {rows.map((c) => {
              const tags = toTags(c.tags);
              const created =
                c?.createdAt &&
                new Date(c.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              const slug = makeSlug(c?.title, c?.slug);
              const path = `/single-course/${slug}/${c?._id || c?.id}`;
              const listLayout = view === "list";

              const degreeName =
                c?.degreeName ||
                degreeMap[c?.degree] ||
                (typeof c?.degree === "object" && c?.degree?.name) ||
                (typeof c?.degree === "string" ? shortId(c.degree) : "—");

              const semisterName =
                c?.semisterName ||
                semisterMap[c?.semister] ||
                (typeof c?.semister === "object" &&
                  (c?.semister?.title ||
                    c?.semister?.semister_name ||
                    (c?.semister?.semNumber
                      ? `Semister ${c?.semister?.semNumber}`
                      : ""))) ||
                (typeof c?.semister === "string" ? shortId(c.semister) : "—");

              const categoryName =
                c?.categoryName ||
                categoryMap[c?.category] ||
                (typeof c?.category === "object" &&
                  (c?.category?.category_name || c?.category?.name)) ||
                (typeof c?.category === "string" ? shortId(c.category) : "—");

              const subCategoryName =
                c?.subCategoryName ||
                subCategoryMap[c?.subCategory] ||
                (typeof c?.subCategory === "object" &&
                  (c?.subCategory?.subcategory_name || c?.subCategory?.name)) ||
                (typeof c?.subCategory === "string"
                  ? shortId(c.subCategory)
                  : "—");

              const instructorName =
                c?.instructorName ||
                instructorMap[c?.instructor] ||
                (typeof c?.instructor === "object" &&
                  (c?.instructor?.name ||
                    c?.instructor?.fullName ||
                    c?.instructor?.email)) ||
                (typeof c?.instructor === "string"
                  ? shortId(c.instructor)
                  : "—");

              const courseId = c?._id || c?.id;

              return (
                <div key={courseId} className="relative">
                  {/* Action buttons */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <button
                      title="Toggle Published"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={(e) => toggle(e, courseId, "published")}
                    >
                      P
                    </button>
                    <button
                      title="Toggle Featured"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-indigo-50 text-indigo-600"
                      onClick={(e) => toggle(e, courseId, "featured")}
                    >
                      F
                    </button>
                    <button
                      title="Toggle Archived"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-gray-50 text-gray-700"
                      onClick={(e) => toggle(e, courseId, "archived")}
                    >
                      A
                    </button>
                    <button
                      title="Delete course"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={(e) => deleteCourse(e, courseId, c?.title)}
                    >
                      <FaTrashAlt className="h-4 w-4" />
                    </button>
                  </div>

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
                          <FaGraduationCap />
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
                            {c?.title || "Untitled Course"}
                          </h3>

                          {/* ✅ Course ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {courseId}
                            </code>
                          </p>

                          {created && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {created}
                            </p>
                          )}

                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUser className="mr-1 text-red-500" />
                            <span className="truncate">
                              <span className="font-medium">Instructor:</span>{" "}
                              {instructorName}{" "}
                              <span className="ml-2 font-medium">Level:</span>{" "}
                              {c?.level || "—"}{" "}
                              <span className="ml-2 font-medium">
                                Language:
                              </span>{" "}
                              {c?.language || "—"}
                            </span>
                          </p>

                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUniversity className="mr-1 text-indigo-500" />
                            <span className="truncate">
                              <span className="font-medium">Degree:</span>{" "}
                              {degreeName}{" "}
                              {semisterName ? (
                                <>
                                  <span className="ml-2 font-medium">
                                    Semister:
                                  </span>{" "}
                                  {semisterName}
                                </>
                              ) : null}
                            </span>
                          </p>

                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Category:</span>{" "}
                            {categoryName}{" "}
                            <span className="ml-2 font-medium">
                              Subcategory:
                            </span>{" "}
                            {subCategoryName}
                          </p>

                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Duration:</span>{" "}
                            {c?.durationInHours ? `${c.durationInHours}h` : "—"}{" "}
                            <span className="ml-2 font-medium">Price:</span>{" "}
                            {formatPrice(c?.price ?? "—")}
                          </p>

                          {toTags(c.tags).length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {toTags(c.tags).join(", ")}
                            </p>
                          )}

                          {renderBadges(c)}
                        </div>

                        {view !== "list" && c?.metaDescription && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {c.metaDescription}
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
            <p className="text-center text-gray-600 mt-6">No courses found.</p>
          )}

          {/* Top-right status like AllCategories (kept above) */}

          {/* ✅ AllCategories-style pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => goTo(1)}
                disabled={meta.page === 1}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === 1
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                « First
              </button>
              <button
                onClick={() => goTo(meta.page - 1)}
                disabled={meta.page === 1}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === 1
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
                      p === meta.page
                        ? "bg-purple-600 text-white border-purple-600 shadow"
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goTo(meta.page + 1)}
                disabled={meta.page === meta.totalPages}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === meta.totalPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                Next ›
              </button>
              <button
                onClick={() => goTo(meta.totalPages)}
                disabled={meta.page === meta.totalPages}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === meta.totalPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                Last »
              </button>
            </div>
          )}

          {/* Small page status (optional) */}
          <div className="mt-3 text-center text-sm text-gray-600">
            Page {meta.page} of {meta.totalPages} • Showing{" "}
            <span className="font-medium">
              {pageCountText.start}-{pageCountText.end}
            </span>{" "}
            of <span className="font-medium">{meta.total}</span> results
          </div>
        </>
      )}
    </div>
  );
}
