// src/pages/activities/AllActivities.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
  FaCalendar,
  FaUser,
  FaTags,
  FaUniversity,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaBolt,
  FaFilter,
  FaRedoAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config.js";

const API = globalBackendRoute;

/** axios instance with auth + token-expiry handling */
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || "";
    if (status === 401 && /token expired|jwt expired/i.test(msg)) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

/** Enums (match your model) */
const AUDIENCE_TYPES = [
  { value: "", label: "All Types" },
  { value: "all", label: "All Users" },
  { value: "roles", label: "Roles" },
  { value: "users", label: "Specific Users" },
  { value: "contextual", label: "Contextual" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

/** Helpers */
const toTags = (arr) =>
  !arr
    ? []
    : Array.isArray(arr)
    ? arr
    : String(arr)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

const shortId = (val) =>
  typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function AllActivities() {
  const navigate = useNavigate();

  // view + search
  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination (default 6/page)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // rows + meta
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

  // cascading lists
  const [degreeList, setDegreeList] = useState([]);
  const [semisterList, setSemisterList] = useState([]);
  const [courseList, setCourseList] = useState([]);

  // lookup maps for quick render
  const [degreeMap, setDegreeMap] = useState({});
  const [semisterMap, setSemisterMap] = useState({});
  const [courseMap, setCourseMap] = useState({});

  // filters -> match backend buildActivityFilter keys
  const [filters, setFilters] = useState({
    audienceType: "",
    status: "",
    tag: "", // single tag text
    degreeId: "",
    semisterId: "",
    courseId: "",
    since: "", // ISO date range (optional)
    until: "",
  });

  // Reset pagination when inputs change
  useEffect(() => setPage(1), [searchTerm, pageSize, filters]);

  /** Load Degrees once */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/list-degrees", {
          params: { page: 1, limit: 1000 },
        });
        if (!alive) return;
        const list = r?.data?.data || r?.data || [];
        const arr = Array.isArray(list) ? list : [];
        setDegreeList(arr);
        const map = {};
        arr.forEach((d) => {
          map[d._id || d.id] = d.name || d.title || "Degree";
        });
        setDegreeMap(map);
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Degree -> Semisters */
  useEffect(() => {
    let alive = true;

    // Clear downstream selections
    setSemisterList([]);
    setCourseList([]);
    setFilters((f) => ({ ...f, semisterId: "", courseId: "" }));

    if (!filters.degreeId) {
      setSemisterMap({});
      return;
    }

    (async () => {
      try {
        const res = await api.get("/api/semisters", {
          params: {
            page: 1,
            limit: 1000,
            degreeId: filters.degreeId,
            degree: filters.degreeId,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || res?.data || [];
        const sl = Array.isArray(list) ? list : [];
        setSemisterList(sl);

        const map = {};
        sl.forEach((s) => {
          const label =
            s.title ||
            s.semister_name ||
            (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
            "Semester";
          map[s._id || s.id] = label;
        });
        setSemisterMap(map);
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.degreeId]);

  /** Semister -> Courses (by Degree + Semister) */
  useEffect(() => {
    let alive = true;

    setCourseList([]);
    setFilters((f) => ({ ...f, courseId: "" }));

    if (!filters.degreeId || !filters.semisterId) {
      setCourseMap({});
      return;
    }

    (async () => {
      try {
        const res = await api.get("/api/list-courses", {
          params: {
            page: 1,
            limit: 1000,
            degreeId: filters.degreeId,
            semisterId: filters.semisterId,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || res?.data || [];
        const cl = Array.isArray(list) ? list : [];
        setCourseList(cl);
        const map = {};
        cl.forEach((c) => {
          map[c._id || c.id] = c.title || c.name || "Course";
        });
        setCourseMap(map);
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.semisterId]);

  /** Fetch Activities with active filters */
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
          sort: "-createdAt",
        };

        // search -> use $text via ?q= (backend supports)
        if (searchTerm.trim()) params.q = searchTerm.trim();

        // simple filters
        if (filters.audienceType) params.audienceType = filters.audienceType;
        if (filters.status) params.status = filters.status;
        if (filters.tag) params.tag = filters.tag;

        // contextual filters
        if (filters.degreeId) params.context_degree = filters.degreeId;
        if (filters.semisterId) params.context_semester = filters.semisterId;
        if (filters.courseId) params.context_course = filters.courseId;

        // date range (by createdAt by default)
        if (filters.since) params.since = filters.since;
        if (filters.until) params.until = filters.until;

        const res = await api.get("/api/list-activities", {
          params,
          signal: ctrl.signal,
        });

        const data = res.data?.data || [];
        const m = res.data?.meta || {};
        if (!alive) return;

        const totalPages =
          m.pages ||
          m.totalPages ||
          Math.ceil((m.total || 0) / (m.limit || pageSize)) ||
          1;

        setRows(Array.isArray(data) ? data : []);
        setMeta({
          page: Number(m.page || page),
          limit: Number(m.limit || pageSize),
          total: Number(m.total || data.length),
          totalPages: Number(totalPages || 1),
        });
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching activities:", err);
        setFetchError(
          "Activities not yet created or unavailable. Please add some activities."
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
  }, [page, pageSize, searchTerm, filters, refreshKey]);

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  const goTo = (p) =>
    setPage(Math.min(Math.max(1, Number(p) || 1), meta.totalPages));

  const buildPages = () => {
    const totalPages = meta.totalPages;
    const currentPage = meta.page;
    const maxBtns = 7;
    if (totalPages <= maxBtns)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (currentPage > 4) pages.push("…");
    const s = Math.max(2, currentPage - 1);
    const e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  /** Actions */
  const remove = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete this activity?\nThis will remove the activity and related assignments/submissions.`
    );
    if (!ok) return;
    try {
      const res = await api.delete(`/api/delete-activity/${id}`);
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Activity deleted.");
      } else {
        throw new Error("Failed to delete activity.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete activity."
      );
    }
  };

  const publish = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/api/publish-activity/${id}`);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Activity published.");
      } else {
        throw new Error("Publish failed");
      }
    } catch (err) {
      console.error("Publish failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const archive = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/api/archive-activity/${id}`);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Activity archived.");
      } else {
        throw new Error("Archive failed");
      }
    } catch (err) {
      console.error("Archive failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  /** Small reusable select */
  const FilterSelect = ({
    label,
    value,
    onChange,
    options,
    getOption,
    disabled = false,
    nameKeyPrefix, // ensure unique React keys
  }) => (
    <label className="flex flex-col text-sm text-gray-700">
      <span className="mb-1">{label}</span>
      <select
        className="border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option key={`${nameKeyPrefix}-any`} value="">
          {disabled ? "Select parent first" : "All"}
        </option>
        {options.map((o, idx) => {
          const { id, name } = getOption(o);
          return (
            <option key={`${nameKeyPrefix}-${idx}-${id || "id"}`} value={id}>
              {name} {id ? `(${shortId(id)})` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );

  const resetFilters = () =>
    setFilters({
      audienceType: "",
      status: "",
      tag: "",
      degreeId: "",
      semisterId: "",
      courseId: "",
      since: "",
      until: "",
    });

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Activities</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search (title, instructions, tags)…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} activities
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
            {[3, 6, 12, 24, 48].map((n) => (
              <option key={`pg-${n}`} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-3 rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <FaFilter />
          Filters (cascading)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Audience Type */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Audience Type</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.audienceType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, audienceType: e.target.value }))
              }
            >
              {AUDIENCE_TYPES.map((a, idx) => (
                <option key={`aud-${idx}-${a.value || "any"}`} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          {/* Status */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Status</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              {STATUSES.map((s, idx) => (
                <option key={`st-${idx}-${s.value || "any"}`} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {/* Single Tag (text) */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Tag</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              placeholder="e.g., project"
              value={filters.tag}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tag: e.target.value }))
              }
            />
          </label>

          {/* Degree */}
          <FilterSelect
            label="Degree"
            value={filters.degreeId}
            onChange={(v) => setFilters((f) => ({ ...f, degreeId: v }))}
            options={degreeList}
            nameKeyPrefix="deg"
            getOption={(d) => ({
              id: d._id || d.id,
              name: d.name || d.title || "Degree",
            })}
          />

          {/* Semister */}
          <FilterSelect
            label="Semester"
            value={filters.semisterId}
            onChange={(v) => setFilters((f) => ({ ...f, semisterId: v }))}
            options={semisterList}
            disabled={!filters.degreeId}
            nameKeyPrefix="sem"
            getOption={(s) => ({
              id: s._id || s.id,
              name:
                s.title ||
                s.semister_name ||
                (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                "Semester",
            })}
          />

          {/* Course */}
          <FilterSelect
            label="Course"
            value={filters.courseId}
            onChange={(v) => setFilters((f) => ({ ...f, courseId: v }))}
            options={courseList}
            disabled={!filters.degreeId || !filters.semisterId}
            nameKeyPrefix="course"
            getOption={(c) => ({
              id: c._id || c.id,
              name: c.title || c.name || "Course",
            })}
          />

          {/* Date Range (createdAt by default on backend) */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Since (ISO or yyyy-mm-dd)</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              placeholder="2025-01-01"
              value={filters.since}
              onChange={(e) =>
                setFilters((f) => ({ ...f, since: e.target.value }))
              }
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Until (ISO or yyyy-mm-dd)</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              placeholder="2025-12-31"
              value={filters.until}
              onChange={(e) =>
                setFilters((f) => ({ ...f, until: e.target.value }))
              }
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-gray-50"
            onClick={resetFilters}
            title="Reset all filters"
          >
            <FaRedoAlt />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading activities…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-gray-600 mt-6">{fetchError}</p>
      )}

      {/* Grid/List */}
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
            {rows.map((a) => {
              const id = a?._id || a?.id;
              const createdAt = fmtDate(a?.createdAt);
              const startAt = fmtDate(a?.startAt);
              const endAt = fmtDate(a?.endAt);
              const listLayout = view === "list";

              const degreeNames = (a?.context?.degrees || []).map(
                (d) =>
                  degreeMap[d] ||
                  (typeof d === "string" ? shortId(d) : "Degree")
              );
              const semisterNames = (a?.context?.semesters || []).map(
                (s) =>
                  semisterMap[s] ||
                  (typeof s === "string" ? shortId(s) : "Semester")
              );
              const courseNames = (a?.context?.courses || []).map(
                (c) =>
                  courseMap[c] ||
                  (typeof c === "string" ? shortId(c) : "Course")
              );

              const status = a?.status || "draft";
              const allowLate = !!a?.allowLate;
              const maxMarks =
                typeof a?.maxMarks === "number" ? a.maxMarks : "—";
              const audience = a?.audienceType || "all";

              return (
                <div key={id} className="relative">
                  {/* Row actions */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <button
                      title="Publish"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={(e) => publish(e, id)}
                    >
                      P
                    </button>
                    <button
                      title="Archive"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-amber-50 text-amber-600"
                      onClick={(e) => archive(e, id)}
                    >
                      A
                    </button>
                    <button
                      title="Delete activity"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={(e) => remove(e, id)}
                    >
                      <FaTrashAlt className="h-4 w-4" />
                    </button>
                  </div>

                  <Link to={`/single-activity/${id}`}>
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
                          <FaClipboardList />
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
                          {/* Title */}
                          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {a?.title || "Untitled Activity"}
                          </h3>

                          {/* ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {id}
                            </code>
                          </p>

                          {/* Created */}
                          {a?.createdAt && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {createdAt}
                            </p>
                          )}

                          {/* Author (fallback to ID) */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUser className="mr-1 text-red-500" />
                            <span className="truncate">
                              <span className="font-medium">Author:</span>{" "}
                              {typeof a?.createdBy === "object"
                                ? a.createdBy?.name ||
                                  a.createdBy?.fullName ||
                                  a.createdBy?.email ||
                                  "User"
                                : a?.createdBy
                                ? shortId(String(a.createdBy))
                                : "—"}
                              <span className="ml-2 font-medium">
                                Audience:
                              </span>{" "}
                              {audience}
                            </span>
                          </p>

                          {/* Context */}
                          {(degreeNames.length ||
                            semisterNames.length ||
                            courseNames.length) && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaUniversity className="mr-1 text-indigo-500" />
                              <span className="truncate">
                                {degreeNames.length ? (
                                  <>
                                    <span className="font-medium">
                                      Degrees:
                                    </span>{" "}
                                    {degreeNames.join(", ")}
                                  </>
                                ) : null}
                                {semisterNames.length ? (
                                  <>
                                    <span className="ml-2 font-medium">
                                      Semesters:
                                    </span>{" "}
                                    {semisterNames.join(", ")}
                                  </>
                                ) : null}
                                {courseNames.length ? (
                                  <>
                                    <span className="ml-2 font-medium">
                                      Courses:
                                    </span>{" "}
                                    {courseNames.join(", ")}
                                  </>
                                ) : null}
                              </span>
                            </p>
                          )}

                          {/* Timing */}
                          <p className="text-sm text-gray-700 flex flex-wrap gap-x-4">
                            <span>
                              <span className="font-medium">Start:</span>{" "}
                              {startAt}
                            </span>
                            <span>
                              <span className="font-medium">End:</span> {endAt}
                            </span>
                            <span>
                              <span className="font-medium">Late:</span>{" "}
                              {allowLate ? "Allowed" : "Not allowed"}
                            </span>
                            <span>
                              <span className="font-medium">Max Marks:</span>{" "}
                              {maxMarks}
                            </span>
                          </p>

                          {/* Tags */}
                          {toTags(a?.tags).length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {toTags(a?.tags).join(", ")}
                            </p>
                          )}

                          {/* Status badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                              <FaBolt className="mr-1" />
                              {status}
                            </span>
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded ${
                                allowLate
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                              title={allowLate ? "Late allowed" : "No late"}
                            >
                              {allowLate ? (
                                <FaCheckCircle className="mr-1" />
                              ) : (
                                <FaTimesCircle className="mr-1" />
                              )}
                              {allowLate ? "Late allowed" : "Late not allowed"}
                            </span>
                          </div>
                        </div>

                        {/* Instructions (preview) */}
                        {view !== "list" && a?.instructions && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {a.instructions}
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
              No activities found. Adjust filters or create a new activity.
            </p>
          )}

          {/* Pagination */}
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
                    key={`p-${p}`}
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
