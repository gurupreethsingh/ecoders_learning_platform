import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaCalendar,
  FaUser,
  FaSearch,
  FaTrashAlt,
  FaIdBadge,
  FaTimes,
  FaLink,
  FaSitemap,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

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

// extract arrays from many API shapes
const extractArray = (payload) => {
  const d = payload?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};
const getId = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v._id || v.id || null;
  return v;
};

const looksLikeObjectId = (v) =>
  typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

export default function AllInstructors() {
  const navigate = useNavigate();
  const location = useLocation();
  const qp = useQueryParams();

  // read ONLY from query params
  const effectiveStatus = (qp.get("status") || "all").toLowerCase();
  const urlActiveRaw = qp.get("active");
  const hasEffectiveActive =
    urlActiveRaw === "true" || urlActiveRaw === "false";
  const effectiveActive = hasEffectiveActive
    ? urlActiveRaw === "true"
    : undefined;

  const [view, setView] = useState("grid"); // 'list' | 'grid' | 'card'
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);

  // ✅ default to 3/page every load
  const [pageSize, setPageSize] = useState(3);
  useEffect(() => {
    setPageSize(3);
  }, []);

  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 3,
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

  // association maps (id -> name)
  const [degMap, setDegMap] = useState({});
  const [catMap, setCatMap] = useState({});
  const [subcatMap, setSubcatMap] = useState({});
  const [courseMap, setCourseMap] = useState({});
  const [semMap, setSemMap] = useState({});

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
      } catch (e) {}
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======================== fetch association lookups ======================== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await axios.get(makeURL("/api/list-degrees"), {
          params: { page: 1, limit: 2000 },
        });
        const dArr = extractArray(d.data);
        const dMap = {};
        dArr.forEach((x) => {
          const id = x?._id || x?.id;
          const name = x?.name || x?.title || x?.code || x?.slug;
          if (id) dMap[id] = name || "Degree";
        });
        if (!alive) return;
        setDegMap(dMap);
      } catch {}
      try {
        const c = await axios.get(makeURL("/api/all-categories"));
        const cArr = extractArray(c.data);
        const cMap = {};
        cArr.forEach((x) => {
          const id = x?._id || x?.id;
          const name = x?.name || x?.category_name || x?.title;
          if (id) cMap[id] = name || "Category";
        });
        setCatMap(cMap);
      } catch {}
      try {
        const s = await axios.get(makeURL("/api/all-subcategories"));
        const sArr = extractArray(s.data);
        const sMap = {};
        sArr.forEach((x) => {
          const id = x?._id || x?.id;
          const name = x?.name || x?.subCategory_name || x?.title;
          if (id) sMap[id] = name || "Subcategory";
        });
        setSubcatMap(sMap);
      } catch {}
      try {
        const co = await axios.get(makeURL("/api/list-courses"), {
          params: { page: 1, limit: 5000, sortBy: "createdAt", order: "desc" },
        });
        const coArr = extractArray(co.data);
        const coMap = {};
        coArr.forEach((x) => {
          const id = x?._id || x?.id;
          const name = x?.title || x?.name || x?.code || x?.slug;
          if (id) coMap[id] = name || "Course";
        });
        setCourseMap(coMap);
      } catch {}
      try {
        const se = await axios.get(makeURL("/api/semesters"), {
          params: { page: 1, limit: 5000 },
        });
        const seArr = extractArray(se.data);
        const seMap = {};
        seArr.forEach((x) => {
          const id = x?._id || x?.id;
          const label =
            x?.semester_name ||
            (x?.semNumber ? `Semester ${x.semNumber}` : x?.slug);
          if (id) seMap[id] = label || "Semester";
        });
        setSemMap(seMap);
      } catch {}
    })();
    return () => {
      alive = false;
    };
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
          const idText = String(u?._id || u?.id || "").toLowerCase();
          return name.includes(q) || email.includes(q) || idText.includes(q);
        });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    setRows(filtered.slice(start, end));
    setMeta({ page: currentPage, limit: pageSize, total, totalPages });
  }, [allRows, searchTerm, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // pagination helpers
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

  // 🔹 smaller, compact badges
  const StatusBadge = ({ label, value, active, onClick }) => (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs transition whitespace-nowrap",
        active
          ? "bg-indigo-600 text-white border-indigo-600 shadow"
          : "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100",
      ].join(" ")}
      title={`${label} instructors`}
    >
      <span className="font-semibold">{label}</span>
      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/80 text-indigo-700 border border-indigo-200">
        {value}
      </span>
    </button>
  );

  // ---------- association render helpers ----------
  const renderPairs = (pairs) => {
    if (!pairs || pairs.length === 0) return <span>—</span>;
    return (
      <span className="flex flex-wrap gap-2">
        {pairs.map(({ label, id }) => (
          <span
            key={`${label}-${id}`}
            className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded"
            title={id}
          >
            <FaLink className="text-gray-400" />
            <span className="font-medium">{label}</span>
            <code className="bg-white border px-1 rounded">{shortId(id)}</code>
          </span>
        ))}
      </span>
    );
  };

  const findRelated = (u) => {
    const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    const ids = {
      degrees: new Set(),
      categories: new Set(),
      subcategories: new Set(),
      courses: new Set(),
      semesters: new Set(),
    };

    const pushIds = (s, v) => {
      asArray(v)
        .map(getId)
        .filter(Boolean)
        .forEach((id) => ids[s].add(id));
    };

    pushIds("degrees", u.degree);
    pushIds("degrees", u.degrees);
    pushIds("degrees", u.degreeId);
    pushIds("degrees", u.degreeIds);
    if (u.assignments?.degrees) pushIds("degrees", u.assignments.degrees);

    pushIds("categories", u.category);
    pushIds("categories", u.categoryId);
    pushIds("categories", u.categories);

    pushIds("subcategories", u.subCategory);
    pushIds("subcategories", u.subCategoryId);
    pushIds("subcategories", u.subcategories);

    pushIds("courses", u.course);
    pushIds("courses", u.courseId);
    pushIds("courses", u.courses);
    if (u.assignments?.courses) pushIds("courses", u.assignments.courses);

    pushIds("semesters", u.semester);
    pushIds("semesters", u.semesterId);
    pushIds("semesters", u.semesters);
    pushIds("semesters", u.semester);
    pushIds("semesters", u.semesterId);
    pushIds("semesters", u.semesters);

    const toPairs = (set, map, fallback) =>
      Array.from(set).map((id) => ({
        id,
        label: map[id] || (looksLikeObjectId(id) ? fallback : String(id)),
      }));

    return {
      degrees: toPairs(ids.degrees, degMap, "Degree"),
      categories: toPairs(ids.categories, catMap, "Category"),
      subcategories: toPairs(ids.subcategories, subcatMap, "Subcategory"),
      courses: toPairs(ids.courses, courseMap, "Course"),
      semesters: toPairs(ids.semesters, semMap, "Semester"),
    };
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      <h2 className="font-bold text-xl mr-2">All Instructors</h2>
      <div className="flex justify-between items-center flex-wrap">
        <div className="flex items-center gap-2 md:gap-3 mb-4 whitespace-nowrap overflow-x-auto">
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
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border text-gray-700 hover:bg-gray-50"
              title="Clear filters"
            >
              <FaTimes /> Clear
            </button>
          )}
        </div>

        {/* ===================== LINE 2: Search + status dropdown + 3/page + view icons (SAME LINE) ===================== */}
        <div className="flex items-center gap-3 md:gap-4 mb-6 whitespace-nowrap overflow-x-auto">
          {/* Search */}
          <div className="relative min-w-[220px] w-64 md:w-80">
            <input
              type="text"
              placeholder="Search name/email/ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
            <FaSearch className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Status dropdown */}
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

          {/* 3/Page dropdown */}
          <select
            className="border border-gray-300 rounded px-2 py-2 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Items per page"
          >
            {[3, 6, 12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>

          {/* View icons (inline on the same line) */}
          <div className="flex items-center gap-2 pl-1">
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

      {/* ===================== SECTION 3: Cards/List (unchanged) ===================== */}
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
              const id = u?._id || u?.id;
              const path = `/single-instructor/${id}/${slug}`;
              const listLayout = view === "list";

              // Build associations
              const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
              const ids = {
                degrees: new Set(),
                categories: new Set(),
                subcategories: new Set(),
                courses: new Set(),
                semesters: new Set(),
              };
              const pushIds = (s, v) => {
                asArray(v)
                  .map(getId)
                  .filter(Boolean)
                  .forEach((x) => ids[s].add(x));
              };

              pushIds("degrees", u.degree);
              pushIds("degrees", u.degrees);
              pushIds("degrees", u.degreeId);
              pushIds("degrees", u.degreeIds);
              if (u.assignments?.degrees)
                pushIds("degrees", u.assignments.degrees);

              pushIds("categories", u.category);
              pushIds("categories", u.categoryId);
              pushIds("categories", u.categories);

              pushIds("subcategories", u.subCategory);
              pushIds("subcategories", u.subCategoryId);
              pushIds("subcategories", u.subcategories);

              pushIds("courses", u.course);
              pushIds("courses", u.courseId);
              pushIds("courses", u.courses);
              if (u.assignments?.courses)
                pushIds("courses", u.assignments.courses);

              pushIds("semesters", u.semester);
              pushIds("semesters", u.semesterId);
              pushIds("semesters", u.semesters);
              pushIds("semesters", u.semester);
              pushIds("semesters", u.semesterId);
              pushIds("semesters", u.semesters);

              const toPairs = (set, map, fallback) =>
                Array.from(set).map((id) => ({
                  id,
                  label:
                    map[id] || (looksLikeObjectId(id) ? fallback : String(id)),
                }));

              const assoc = {
                degrees: toPairs(ids.degrees, degMap, "Degree"),
                categories: toPairs(ids.categories, catMap, "Category"),
                subcategories: toPairs(
                  ids.subcategories,
                  subcatMap,
                  "Subcategory"
                ),
                courses: toPairs(ids.courses, courseMap, "Course"),
                semesters: toPairs(ids.semesters, semMap, "Semester"),
              };

              const renderPairsLocal = (pairs) => {
                if (!pairs || pairs.length === 0) return <span>—</span>;
                return (
                  <span className="flex flex-wrap gap-2">
                    {pairs.map(({ label, id }) => (
                      <span
                        key={`${label}-${id}`}
                        className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded"
                        title={id}
                      >
                        <FaLink className="text-gray-400" />
                        <span className="font-medium">{label}</span>
                        <code className="bg-white border px-1 rounded">
                          {shortId(id)}
                        </code>
                      </span>
                    ))}
                  </span>
                );
              };

              return (
                <div key={id} className="relative">
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
                      {/* Avatar/Icon */}
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
                            {name || "Unnamed Instructor"}
                          </h3>

                          <div className="text-xs text-gray-700 inline-flex items-center gap-2">
                            <span className="font-medium">ID:</span>
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {id || "—"}
                            </code>
                          </div>

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

                          <div className="mt-1 text-gray-700">
                            <div className="text-xs font-semibold text-gray-900 flex items-center gap-2">
                              <FaSitemap /> Associations
                            </div>

                            <div className="text-xs mt-1">
                              <span className="font-medium">Degrees: </span>
                              {renderPairsLocal(assoc.degrees)}
                            </div>

                            <div className="text-xs mt-1">
                              <span className="font-medium">Categories: </span>
                              {renderPairsLocal(assoc.categories)}
                            </div>
                            <div className="text-xs mt-1">
                              <span className="font-medium">
                                Subcategories:{" "}
                              </span>
                              {renderPairsLocal(assoc.subcategories)}
                            </div>

                            <div className="text-xs mt-1">
                              <span className="font-medium">Courses: </span>
                              {renderPairsLocal(assoc.courses)}
                            </div>

                            <div className="text-xs mt-1">
                              <span className="font-medium">Semesters: </span>
                              {renderPairsLocal(assoc.semesters)}
                            </div>
                          </div>
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

          {/* Footer count */}
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
