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
import globalBackendRoute from "@/config/Config.js";

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
  const [semesterMap, setSemisterMap] = useState({});
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

  // lookups for degree/category/subcategory/semester/instructor
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
              .get(`${globalBackendRoute}/api/semesters`, {
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
              s.semester_name ||
              (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
              "Semester";
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

              const semesterName =
                c?.semesterName ||
                semesterMap[c?.semester] ||
                (typeof c?.semester === "object" &&
                  (c?.semester?.title ||
                    c?.semester?.semester_name ||
                    (c?.semester?.semNumber
                      ? `Semester ${c?.semester?.semNumber}`
                      : ""))) ||
                (typeof c?.semester === "string" ? shortId(c.semester) : "—");

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
                              {semesterName ? (
                                <>
                                  <span className="ml-2 font-medium">
                                    Semester:
                                  </span>{" "}
                                  {semesterName}
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

//

//

//

// // src/pages/courses/AllCourses.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { FaThList, FaThLarge, FaTh, FaSearch } from "react-icons/fa";
// import { FiChevronDown, FiChevronRight } from "react-icons/fi";
// import globalBackendRoute from "../../config/Config";

// // --------------------------- helpers / normalizers ---------------------------
// const API = `${globalBackendRoute}/api`;

// const firstNonEmpty = (...vals) =>
//   vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

// const safeId = (obj) => {
//   if (!obj) return null;
//   if (typeof obj === "string") return obj;
//   if (typeof obj === "object") return obj._id || obj.id || null;
//   return null;
// };

// const normalizeDegree = (raw) => ({
//   id: raw?._id || raw?.id || null,
//   name:
//     firstNonEmpty(raw?.name, raw?.degree_name, raw?.title, "Degree") ||
//     "Degree",
//   slug: raw?.slug || null,
// });

// const normalizeSemester = (raw) => ({
//   id: raw?._id || raw?.id || null,
//   name:
//     firstNonEmpty(
//       raw?.name,
//       raw?.semester_name,
//       raw?.title,
//       raw?.slug && `Sem ${raw.slug}`,
//       raw?.semNumber && `Sem ${raw.semNumber}`
//     ) || "Semester",
//   degreeId: safeId(raw?.degree) || raw?.degreeId || null,
//   slug: raw?.slug || null,
// });

// const normalizeCourse = (raw) => ({
//   id: raw?._id || raw?.id || null,
//   title: firstNonEmpty(raw?.title, raw?.name, raw?.code, "Course") || "Course",
//   degreeId: safeId(raw?.degree) || raw?.degreeId || null,
//   semesterId: safeId(raw?.semester) || raw?.semesterId || null,
//   level: raw?.level || raw?.difficulty || null, // optional facets if you have them
//   accessType: raw?.access || raw?.accessType || null,
//   featured: !!raw?.featured,
// });

// // --------------------------------- page -------------------------------------
// export default function AllCourses() {
//   const [degrees, setDegrees] = useState([]);
//   const [semesters, setSemesters] = useState([]);
//   const [courses, setCourses] = useState([]);

//   // sidebar expand/collapse state by degreeId
//   const [openDegreeIds, setOpenDegreeIds] = useState(new Set());

//   // selection state
//   const [selectedDegreeId, setSelectedDegreeId] = useState(null);
//   const [selectedSemesterId, setSelectedSemesterId] = useState(null);

//   // top filters
//   const [view, setView] = useState("grid"); // list | card | grid
//   const [searchQuery, setSearchQuery] = useState("");
//   const [rowsPerPage, setRowsPerPage] = useState(12);
//   const [page, setPage] = useState(1);

//   const navigate = useNavigate();

//   // ------------------------------ fetch data ------------------------------
//   useEffect(() => {
//     const load = async () => {
//       try {
//         const [degRes, semRes, crsRes] = await Promise.all([
//           axios.get(`${API}/list-degrees`),
//           axios.get(`${API}/semesters?page=1&limit=2000`),
//           axios.get(`${API}/list-courses?page=1&limit=5000`),
//         ]);

//         const degList = Array.isArray(degRes?.data?.data)
//           ? degRes.data.data
//           : Array.isArray(degRes?.data)
//           ? degRes.data
//           : [];
//         const semList = Array.isArray(semRes?.data?.data)
//           ? semRes.data.data
//           : Array.isArray(semRes?.data)
//           ? semRes.data
//           : [];
//         const crsList = Array.isArray(crsRes?.data?.data)
//           ? crsRes.data.data
//           : Array.isArray(crsRes?.data)
//           ? crsRes.data
//           : [];

//         setDegrees(degList.map(normalizeDegree));
//         setSemesters(semList.map(normalizeSemester));
//         setCourses(crsList.map(normalizeCourse));
//       } catch (e) {
//         console.error("Failed to load degrees/semesters/courses", e);
//       }
//     };
//     load();
//   }, []);

//   // ------------------------------ derived ------------------------------
//   const semestersByDegree = useMemo(() => {
//     const map = new Map();
//     for (const s of semesters) {
//       const key = String(s.degreeId || "");
//       if (!map.has(key)) map.set(key, []);
//       map.get(key).push(s);
//     }
//     // Optional: stable ordering by name/id
//     for (const arr of map.values()) {
//       arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
//     }
//     return map;
//   }, [semesters]);

//   const degreeName = useMemo(() => {
//     const d = degrees.find((x) => String(x.id) === String(selectedDegreeId));
//     return d?.name || "All Degrees";
//   }, [degrees, selectedDegreeId]);

//   // right-panel semester dropdown options (based on selected degree)
//   const degreeSemesters = useMemo(() => {
//     if (!selectedDegreeId) return [];
//     return semestersByDegree.get(String(selectedDegreeId)) || [];
//   }, [selectedDegreeId, semestersByDegree]);

//   // master filter: degree + semester
//   const filteredByDegreeSemester = useMemo(() => {
//     // If nothing selected: show all courses across degrees/semesters
//     if (!selectedDegreeId && !selectedSemesterId) return courses;

//     // If degree selected but not semester: show all courses under that degree
//     if (selectedDegreeId && !selectedSemesterId) {
//       return courses.filter(
//         (c) => String(c.degreeId) === String(selectedDegreeId)
//       );
//     }

//     // If a semester is selected, that implies a degree constraint as well
//     return courses.filter(
//       (c) =>
//         String(c.degreeId) === String(selectedDegreeId) &&
//         String(c.semesterId) === String(selectedSemesterId)
//     );
//   }, [courses, selectedDegreeId, selectedSemesterId]);

//   // search filter
//   const filteredBySearch = useMemo(() => {
//     const q = searchQuery.trim().toLowerCase();
//     if (!q) return filteredByDegreeSemester;
//     const words = q.split(/\s+/).filter(Boolean);
//     if (!words.length) return filteredByDegreeSemester;

//     return filteredByDegreeSemester.filter((c) => {
//       const t = String(c.title || "").toLowerCase();
//       return words.some(
//         (w) => t.includes(w) || t.includes(w.replace(/s$/, ""))
//       );
//     });
//   }, [filteredByDegreeSemester, searchQuery]);

//   // pagination
//   useEffect(
//     () => setPage(1),
//     [searchQuery, selectedDegreeId, selectedSemesterId, rowsPerPage]
//   );

//   const total = filteredBySearch.length;
//   const totalPages = Math.max(1, Math.ceil(total / Math.max(1, rowsPerPage)));
//   const currentPage = Math.min(page, totalPages);
//   const startIdx = (currentPage - 1) * rowsPerPage;
//   const endIdx = Math.min(startIdx + rowsPerPage, total);
//   const visible = filteredBySearch.slice(startIdx, endIdx);

//   const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages));
//   const buildPages = () => {
//     const pages = [];
//     const maxBtns = 7;
//     if (totalPages <= maxBtns) {
//       for (let i = 1; i <= totalPages; i++) pages.push(i);
//       return pages;
//     }
//     pages.push(1);
//     if (currentPage > 4) pages.push("…");
//     const s = Math.max(2, currentPage - 1);
//     const e = Math.min(totalPages - 1, currentPage + 1);
//     for (let i = s; i <= e; i++) pages.push(i);
//     if (currentPage < totalPages - 3) pages.push("…");
//     pages.push(totalPages);
//     return pages;
//   };

//   // ------------------------------ handlers ------------------------------
//   const toggleDegreeOpen = (degreeId) => {
//     setOpenDegreeIds((prev) => {
//       const next = new Set(prev);
//       const key = String(degreeId);
//       if (next.has(key)) next.delete(key);
//       else next.add(key);
//       return next;
//     });
//   };

//   const onSelectDegree = (degreeId) => {
//     setSelectedDegreeId(degreeId);
//     setSelectedSemesterId(null); // reset semester selection on degree change
//     setPage(1);
//   };

//   const onSelectSemester = (semesterId) => {
//     setSelectedSemesterId(semesterId || null);
//     setPage(1);
//   };

//   const clearSelection = () => {
//     setSelectedDegreeId(null);
//     setSelectedSemesterId(null);
//     setSearchQuery("");
//     setPage(1);
//   };

//   // ------------------------------ UI bits ------------------------------
//   const CourseCard = ({ course }) => {
//     const go = () => navigate(`/single-course/${course.id}`);
//     return (
//       <button
//         type="button"
//         onClick={go}
//         className={`text-left bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition w-full`}
//         title={course.title}
//       >
//         <div className="font-semibold text-gray-900 truncate">
//           {course.title}
//         </div>
//         <div className="mt-1.5 text-xs text-gray-600">
//           Degree:{" "}
//           <span className="font-medium">
//             {degrees.find((d) => String(d.id) === String(course.degreeId))
//               ?.name || "—"}
//           </span>
//         </div>
//         <div className="mt-0.5 text-[11px] text-gray-500">
//           <span className="mr-1">Course ID:</span>
//           <code className="bg-gray-100 border px-1 py-0.5 rounded">
//             {course.id}
//           </code>
//         </div>
//       </button>
//     );
//   };

//   // -------------------------------- render --------------------------------
//   return (
//     <div className="p-4 sm:p-6 max-w-7xl mx-auto border-b">
//       <div className="flex flex-col lg:flex-row gap-6">
//         {/* -------------------- Left Sidebar: Degrees + Semesters -------------------- */}
//         <aside className="lg:w-1/4 space-y-4">
//           {/* Sidebar header */}
//           <div className="flex items-center justify-between">
//             <h3 className="text-xl font-bold">Degrees</h3>
//             <button
//               onClick={clearSelection}
//               className="px-2 py-1 text-xs border rounded text-indigo-600 border-indigo-300 hover:bg-indigo-50"
//               title="Show all courses"
//             >
//               Clear
//             </button>
//           </div>

//           {/* Scrollable list */}
//           <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 custom-scroll">
//             {degrees.map((deg) => {
//               const isOpen = openDegreeIds.has(String(deg.id));
//               const sems = semestersByDegree.get(String(deg.id)) || [];
//               const isSelected = String(selectedDegreeId) === String(deg.id);

//               return (
//                 <div
//                   key={deg.id}
//                   className={`border rounded transition bg-white ${
//                     isSelected ? "border-indigo-500" : "border-gray-300"
//                   }`}
//                 >
//                   {/* Degree row */}
//                   <button
//                     className={`w-full flex items-center justify-between p-2 rounded-t cursor-pointer ${
//                       isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
//                     }`}
//                     onClick={() => {
//                       onSelectDegree(deg.id);
//                       toggleDegreeOpen(deg.id);
//                     }}
//                     title={deg.name}
//                   >
//                     <div className="text-left min-w-0">
//                       <div className="font-medium text-sm truncate">
//                         {deg.name}
//                       </div>
//                       <div className="mt-0.5 text-[11px] text-gray-500">
//                         <span className="mr-1">ID:</span>
//                         <code className="bg-gray-100 border px-1 py-0.5 rounded">
//                           {deg.id}
//                         </code>
//                       </div>
//                     </div>
//                     <FiChevronRight
//                       className={`ml-2 shrink-0 text-gray-500 transition-transform ${
//                         isOpen ? "rotate-90" : ""
//                       }`}
//                     />
//                   </button>

//                   {/* Semesters under degree */}
//                   {isOpen && (
//                     <div className="px-2 pb-2">
//                       {sems.length === 0 && (
//                         <div className="text-xs text-gray-500 px-2 py-1">
//                           No semesters.
//                         </div>
//                       )}
//                       <div className="mt-1 space-y-1">
//                         {sems.map((s) => {
//                           const semSelected =
//                             String(selectedSemesterId) === String(s.id);
//                           return (
//                             <button
//                               key={s.id}
//                               onClick={() => {
//                                 onSelectDegree(deg.id);
//                                 onSelectSemester(s.id);
//                               }}
//                               className={`w-full text-left text-xs px-2 py-1 rounded border ${
//                                 semSelected
//                                   ? "bg-indigo-100 text-indigo-800 border-indigo-300"
//                                   : "hover:bg-gray-50 border-gray-200 text-gray-700"
//                               }`}
//                               title={s.name}
//                             >
//                               {s.name}
//                             </button>
//                           );
//                         })}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}

//             {degrees.length === 0 && (
//               <div className="text-sm text-gray-500 py-6 text-center">
//                 No degrees found.
//               </div>
//             )}
//           </div>
//         </aside>

//         {/* -------------------- Right Panel: Courses + Toolbar -------------------- */}
//         <section className="flex-1">
//           {/* Top bar: title + actions + semester dropdown */}
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
//             <div>
//               <h2 className="text-xl font-bold">
//                 {selectedSemesterId
//                   ? "Courses in Selected Semester"
//                   : selectedDegreeId
//                   ? "Courses in Selected Degree"
//                   : "All Courses"}{" "}
//                 <span className="ml-2 text-gray-500 text-sm">({total})</span>
//               </h2>
//               <div className="text-sm text-gray-600 mt-1">
//                 Showing{" "}
//                 <span className="font-semibold">
//                   {total === 0 ? 0 : startIdx + 1}–{endIdx}
//                 </span>{" "}
//                 of <span className="font-semibold">{total}</span>
//               </div>
//             </div>

//             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
//               {/* Semester dropdown for the selected degree */}
//               <div className="relative">
//                 <select
//                   disabled={!selectedDegreeId}
//                   value={selectedSemesterId || ""}
//                   onChange={(e) => onSelectSemester(e.target.value || null)}
//                   className={`appearance-none pr-8 pl-3 py-2 rounded border text-sm bg-white hover:border-gray-400 cursor-pointer min-w-[220px] ${
//                     !selectedDegreeId ? "text-gray-400" : "text-gray-800"
//                   }`}
//                   title={
//                     selectedDegreeId
//                       ? "Select semester"
//                       : "Select a degree first"
//                   }
//                 >
//                   {!selectedDegreeId && (
//                     <option value="">Select a degree first</option>
//                   )}
//                   {selectedDegreeId && (
//                     <>
//                       <option value="">All semesters in this degree</option>
//                       {degreeSemesters.map((s) => (
//                         <option key={s.id} value={s.id}>
//                           {s.name}
//                         </option>
//                       ))}
//                     </>
//                   )}
//                 </select>
//                 <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
//               </div>

//               {/* View toggles */}
//               <div className="flex items-center gap-3 border rounded-full px-3 py-1.5">
//                 <FaThList
//                   className={`text-lg cursor-pointer ${
//                     view === "list" ? "text-indigo-600" : "text-gray-500"
//                   }`}
//                   onClick={() => setView("list")}
//                   title="List view"
//                 />
//                 <FaThLarge
//                   className={`text-lg cursor-pointer ${
//                     view === "card" ? "text-indigo-600" : "text-gray-500"
//                   }`}
//                   onClick={() => setView("card")}
//                   title="Card view"
//                 />
//                 <FaTh
//                   className={`text-lg cursor-pointer ${
//                     view === "grid" ? "text-indigo-600" : "text-gray-500"
//                   }`}
//                   onClick={() => setView("grid")}
//                   title="Grid view"
//                 />
//               </div>

//               {/* Search */}
//               <div className="relative">
//                 <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
//                 <input
//                   type="text"
//                   placeholder="Search courses…"
//                   className="pl-8 pr-3 py-2 border rounded-md w-40 sm:w-56 text-sm"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                 />
//               </div>

//               {/* Rows selector */}
//               <div className="flex items-center gap-2">
//                 <label className="text-sm text-gray-600">Rows:</label>
//                 <select
//                   className="text-sm border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
//                   value={rowsPerPage}
//                   onChange={(e) => setRowsPerPage(Number(e.target.value) || 12)}
//                 >
//                   {[6, 12, 24, 48].map((n) => (
//                     <option key={n} value={n}>
//                       {n}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//           </div>

//           {/* Courses list/grid */}
//           <div
//             className={
//               view === "list"
//                 ? "space-y-3"
//                 : view === "card"
//                 ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
//                 : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
//             }
//           >
//             {visible.map((course) =>
//               view === "list" ? (
//                 <Link
//                   key={course.id}
//                   to={`/single-course/${course.id}`}
//                   className="block"
//                 >
//                   <div className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition flex items-center justify-between">
//                     <div className="min-w-0">
//                       <div className="font-semibold text-gray-900 truncate">
//                         {course.title}
//                       </div>
//                       <div className="mt-1 text-xs text-gray-600">
//                         Degree:{" "}
//                         <span className="font-medium">
//                           {degrees.find(
//                             (d) => String(d.id) === String(course.degreeId)
//                           )?.name || "—"}
//                         </span>
//                       </div>
//                     </div>
//                     <div className="ml-3 text-[11px] text-gray-500 shrink-0">
//                       <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
//                         {course.id}
//                       </code>
//                     </div>
//                   </div>
//                 </Link>
//               ) : (
//                 <CourseCard key={course.id} course={course} />
//               )
//             )}
//           </div>

//           {/* Empty state */}
//           {total === 0 && (
//             <div className="text-center text-gray-500 mt-8">
//               No courses found.
//             </div>
//           )}

//           {/* Pagination */}
//           {totalPages > 1 && (
//             <div className="mt-8 flex items-center justify-center gap-2">
//               <button
//                 onClick={() => goTo(1)}
//                 disabled={currentPage === 1}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   currentPage === 1
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
//                 }`}
//               >
//                 « First
//               </button>
//               <button
//                 onClick={() => goTo(currentPage - 1)}
//                 disabled={currentPage === 1}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   currentPage === 1
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
//                 }`}
//               >
//                 ‹ Prev
//               </button>

//               {buildPages().map((p, idx) =>
//                 p === "…" ? (
//                   <span
//                     key={`dots-${idx}`}
//                     className="px-2 text-gray-400 select-none"
//                   >
//                     …
//                   </span>
//                 ) : (
//                   <button
//                     key={p}
//                     onClick={() => goTo(p)}
//                     className={`min-w-[36px] px-3 py-1 rounded-full border text-sm transition ${
//                       p === currentPage
//                         ? "bg-indigo-600 text-white border-indigo-600 shadow"
//                         : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
//                     }`}
//                   >
//                     {p}
//                   </button>
//                 )
//               )}

//               <button
//                 onClick={() => goTo(currentPage + 1)}
//                 disabled={currentPage === totalPages}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   currentPage === totalPages
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
//                 }`}
//               >
//                 Next ›
//               </button>
//               <button
//                 onClick={() => goTo(totalPages)}
//                 disabled={currentPage === totalPages}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   currentPage === totalPages
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
//                 }`}
//               >
//                 Last »
//               </button>
//             </div>
//           )}
//         </section>
//       </div>

//       {/* Optional: light custom scrollbar for the sidebar */}
//       <style>{`
//         .custom-scroll::-webkit-scrollbar { width: 8px; }
//         .custom-scroll::-webkit-scrollbar-thumb {
//           background-color: rgba(99, 102, 241, 0.25);
//           border-radius: 9999px;
//         }
//         .custom-scroll::-webkit-scrollbar-track {
//           background-color: rgba(0,0,0,0.03);
//           border-radius: 9999px;
//         }
//       `}</style>
//     </div>
//   );
// }
