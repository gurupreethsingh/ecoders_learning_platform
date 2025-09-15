import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
  FaCalendar,
  FaUser,
  FaUniversity,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaCopy,
  FaFilter,
  FaRedoAlt,
  FaExchangeAlt,
  FaThumbsUp,
  FaThumbsDown,
  FaPaperPlane,
  FaFileExport,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

/** Status choices from your controller/model */
const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const prettyStatus = (s) =>
  ({
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  }[s] || s || "—");

const statusBadge = (s) => {
  switch (s) {
    case "approved":
      return "bg-green-100 text-green-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "under_review":
      return "bg-amber-100 text-amber-700";
    case "withdrawn":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-purple-100 text-purple-700"; // draft/unknown
  }
};

const shortId = (val) =>
  typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

export default function AllAdmissions() {
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

  // lookup maps for rendering
  const [degreeMap, setDegreeMap] = useState({});
  const [semesterMap, setSemesterMap] = useState({});
  const [courseMap, setCourseMap] = useState({});
  const [userMap, setUserMap] = useState({});

  // cascading lists
  const [degreeList, setDegreeList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [yearList, setYearList] = useState([]);

  // filters
  const [filters, setFilters] = useState({
    degreeId: "",
    semesterId: "",
    courseId: "",
    academicYear: "",
    status: "",
    isDeleted: "", // "", "true", "false"
  });

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  // Reset pagination when inputs change
  useEffect(() => setPage(1), [searchTerm, pageSize, filters]);

  /** Load Degrees + distinct facets (years) + preload users map (optional) */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [degRes, facetsRes] = await Promise.allSettled([
          axios.get(`${globalBackendRoute}/api/list-degrees`, {
            params: { page: 1, limit: 1000 },
          }),
          axios.get(`${globalBackendRoute}/api/get-facets`).catch(() => ({
            data: { data: {} },
          })), // /admissions/facets in your controller; router path provided was /get-facets
        ]);

        if (!alive) return;

        if (degRes.status === "fulfilled") {
          const list = degRes.value?.data?.data || [];
          setDegreeList(Array.isArray(list) ? list : []);
          const map = {};
          (Array.isArray(list) ? list : []).forEach((d) => {
            map[d._id || d.id] = d.name || d.title || "Untitled Degree";
          });
          setDegreeMap(map);
        }

        if (facetsRes.status === "fulfilled") {
          const f = facetsRes.value?.data?.data || facetsRes.value?.data || {};
          const years = Array.isArray(f.years) ? f.years : [];
          setYearList(years.filter(Boolean).sort());
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Degree -> Semesters (filtered) */
  useEffect(() => {
    let alive = true;

    // clear downstream
    setSemesterList([]);
    setCourseList([]);
    setFilters((f) => ({ ...f, semesterId: "", courseId: "" }));

    if (!filters.degreeId) {
      setSemesterMap({});
      return;
    }

    (async () => {
      try {
        const res = await axios.get(`${globalBackendRoute}/api/semesters`, {
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
        setSemesterList(sl);

        const map = {};
        sl.forEach((s) => {
          const label =
            s.title ||
            s.semester_name ||
            (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
            "Semester";
          map[s._id || s.id] = label;
        });
        setSemesterMap(map);
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.degreeId]);

  /** Semester -> Courses (filtered by Degree + Semester) */
  useEffect(() => {
    let alive = true;

    setCourseList([]);
    setFilters((f) => ({ ...f, courseId: "" }));

    if (!filters.degreeId || !filters.semesterId) {
      setCourseMap({});
      return;
    }

    (async () => {
      try {
        const res = await axios.get(`${globalBackendRoute}/api/list-courses`, {
          params: {
            page: 1,
            limit: 1000,
            degreeId: filters.degreeId,
            semesterId: filters.semesterId,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || [];
        const cl = Array.isArray(list) ? list : [];
        setCourseList(cl);
        const map = {};
        cl.forEach((c) => {
          map[c._id || c.id] = c.title || c.name || "Untitled Course";
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
  }, [filters.semesterId]);

  /** Fetch Admissions with all active filters */
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

        if (searchTerm.trim()) params.q = searchTerm.trim();

        // cascading filters -> controller expects degree/semester/course
        if (filters.degreeId) params.degree = filters.degreeId;
        if (filters.semesterId) params.semester = filters.semesterId;
        if (filters.courseId) params.course = filters.courseId;

        // attributes
        if (filters.academicYear) params.academicYear = filters.academicYear;
        if (filters.status) params.status = filters.status;
        if (filters.isDeleted !== "") params.isDeleted = filters.isDeleted;

        const res = await axios.get(
          `${globalBackendRoute}/api/list-admissions`,
          {
            params,
            signal: ctrl.signal,
          }
        );

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

        // Build quick user map for display
        const um = {};
        (Array.isArray(data) ? data : []).forEach((r) => {
          const u = r.user;
          if (!u) return;
          const id = u._id || u.id;
          if (!um[id]) {
            um[id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "User";
          }
        });
        setUserMap((prev) => ({ ...prev, ...um }));
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching admissions:", err);
        setFetchError(
          "Admissions data unavailable. Create an admission to get started."
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

  /* ----------------------- actions ----------------------- */

  const deleteAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete this admission?\nThis action cannot be undone.`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${globalBackendRoute}/api/delete-admission/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Admission deleted successfully.");
      } else {
        throw new Error("Failed to delete admission.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete admission."
      );
    }
  };

  const cancelAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Cancel (withdraw) this admission?\nThe record will be marked withdrawn.`
    );
    if (!ok) return;
    try {
      const res = await axios.patch(
        `${globalBackendRoute}/api/cancel-admission/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Admission cancelled (withdrawn).");
      } else {
        throw new Error("Cancel failed");
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const duplicateAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    // minimal prompts for target
    const degree = window.prompt("Enter target Degree ID (required):", "");
    if (!degree) return;
    const academicYear = window.prompt(
      "Enter Academic Year (e.g., 2025-26) (required):",
      ""
    );
    if (!academicYear) return;

    const semester = window.prompt(
      "Enter target Semester ID (optional):",
      ""
    );
    const course = window.prompt("Enter target Course ID (optional):", "");

    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/duplicate-admission/${id}`,
        {
          degree,
          academicYear,
          semester: semester || undefined,
          course: course || undefined,
        }
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Admission duplicated.");
      } else {
        throw new Error("Duplicate failed");
      }
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const transferAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    const degree = window.prompt("Enter NEW Degree ID (required):", "");
    if (!degree) return;
    const semester = window.prompt("Enter NEW Semester ID (optional):", "");
    const course = window.prompt("Enter NEW Course ID (optional):", "");
    const academicYear = window.prompt(
      "Enter NEW Academic Year (optional, e.g., 2025-26):",
      ""
    );

    try {
      const body = { degree };
      if (semester) body.semester = semester;
      if (course) body.course = course;
      if (academicYear) body.academicYear = academicYear;

      const res = await axios.patch(
        `${globalBackendRoute}/api/transfer-admission/${id}`,
        body
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Admission transferred.");
      } else {
        throw new Error("Transfer failed");
      }
    } catch (err) {
      console.error("Transfer failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const approveAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(`${globalBackendRoute}/api/approve/${id}`);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Admission approved.");
      } else throw new Error("Approve failed");
    } catch (err) {
      console.error("Approve failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const submitAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(`${globalBackendRoute}/api/submit/${id}`);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Admission submitted.");
      } else throw new Error("Submit failed");
    } catch (err) {
      console.error("Submit failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const rejectAdmission = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const reason = window.prompt("Reason for rejection (optional):", "");
    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/reject/${id}`,
        { reason: reason || "" }
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Admission rejected.");
      } else throw new Error("Reject failed");
    } catch (err) {
      console.error("Reject failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (filters.degreeId) params.set("degree", filters.degreeId);
    if (filters.semesterId) params.set("semester", filters.semesterId);
    if (filters.courseId) params.set("course", filters.courseId);
    if (filters.academicYear) params.set("academicYear", filters.academicYear);
    if (filters.status) params.set("status", filters.status);
    if (filters.isDeleted !== "") params.set("isDeleted", filters.isDeleted);
    const url = `${globalBackendRoute}/api/export-csv?${params.toString()}`;
    window.open(url, "_blank");
  };

  // reusable select (shows ID)
  const FilterSelect = ({
    label,
    value,
    onChange,
    options,
    getOption,
    disabled = false,
  }) => (
    <label className="flex flex-col text-sm text-gray-700">
      <span className="mb-1">{label}</span>
      <select
        className="border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{disabled ? "Select parent first" : "All"}</option>
        {options.map((o) => {
          const { id, name } = getOption(o);
          return (
            <option key={id} value={id}>
              {name} {id ? `(${shortId(id)})` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );

  const resetFilters = () =>
    setFilters({
      degreeId: "",
      semesterId: "",
      courseId: "",
      academicYear: "",
      status: "",
      isDeleted: "",
    });

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Admissions</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search by student name/email/phone/year/notes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} admissions
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
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-gray-50"
            title="Export CSV"
          >
            <FaFileExport />
            Export
          </button>
        </div>
      </div>

      {/* Cascading Filters */}
      <div className="mb-4 p-3 rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <FaFilter />
          Filters (cascading)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Degree */}
          <FilterSelect
            label="Degree"
            value={filters.degreeId}
            onChange={(v) => setFilters((f) => ({ ...f, degreeId: v }))}
            options={degreeList}
            getOption={(d) => ({
              id: d._id || d.id,
              name: d.name || d.title || "Untitled Degree",
            })}
          />

          {/* Semester (depends on Degree) */}
          <FilterSelect
            label="Semester"
            value={filters.semesterId}
            onChange={(v) => setFilters((f) => ({ ...f, semesterId: v }))}
            options={semesterList}
            disabled={!filters.degreeId}
            getOption={(s) => ({
              id: s._id || s.id,
              name:
                s.title ||
                s.semester_name ||
                (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                "Semester",
            })}
          />

          {/* Course (depends on Degree+Semester) */}
          <FilterSelect
            label="Course"
            value={filters.courseId}
            onChange={(v) => setFilters((f) => ({ ...f, courseId: v }))}
            options={courseList}
            disabled={!filters.degreeId || !filters.semesterId}
            getOption={(c) => ({
              id: c._id || c.id,
              name: c.title || c.name || "Untitled Course",
            })}
          />

          {/* Academic Year */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Academic Year</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.academicYear}
              onChange={(e) =>
                setFilters((f) => ({ ...f, academicYear: e.target.value }))
              }
            >
              <option value="">All</option>
              {yearList.map((y) => (
                <option key={y} value={y}>
                  {y}
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
              {STATUSES.map((s) => (
                <option key={s.value || "all"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {/* Deleted flag */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Deleted</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.isDeleted}
              onChange={(e) =>
                setFilters((f) => ({ ...f, isDeleted: e.target.value }))
              }
            >
              <option value="">All</option>
              <option value="false">Not Deleted</option>
              <option value="true">Deleted</option>
            </select>
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
        <p className="text-center text-gray-600 mt-6">Loading admissions…</p>
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
            {rows.map((r) => {
              const id = r?._id || r?.id;
              const created =
                r?.createdAt &&
                new Date(r.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

              const status = r?.applicationStatus || "draft";
              const isDeleted = r?.isDeleted === true;

              const user = r?.user;
              const studentName =
                (user &&
                  (user.name ||
                    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                    user.email)) ||
                "Student";
              const studentEmail = user?.email || r?.email || "—";

              const ie = r?.intendedEnrollment || {};
              const year = ie?.academicYear || "—";

              const deg =
                ie?.degree?.name ||
                (typeof ie?.degree === "string" ? shortId(ie.degree) : "—");
              const sem =
                ie?.semester?.semester_name ||
                ie?.semester?.title ||
                (ie?.semester?.semNumber
                  ? `Semester ${ie.semester.semNumber}`
                  : "") ||
                (typeof ie?.semester === "string"
                  ? shortId(ie.semester)
                  : "—");
              const course =
                ie?.course?.title ||
                ie?.course?.name ||
                (typeof ie?.course === "string" ? shortId(ie.course) : "—");

              const path = `/single-admission/${id}`;

              return (
                <div key={id} className="relative">
                  {/* Row actions */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    {/* Workflow */}
                    <button
                      title="Submit"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-blue-50 text-blue-600"
                      onClick={(e) => submitAdmission(e, id)}
                    >
                      <FaPaperPlane className="h-4 w-4" />
                    </button>
                    <button
                      title="Approve"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={(e) => approveAdmission(e, id)}
                    >
                      <FaThumbsUp className="h-4 w-4" />
                    </button>
                    <button
                      title="Reject"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-amber-50 text-amber-600"
                      onClick={(e) => rejectAdmission(e, id)}
                    >
                      <FaThumbsDown className="h-4 w-4" />
                    </button>

                    {/* Transfer / Duplicate */}
                    <button
                      title="Transfer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-indigo-50 text-indigo-600"
                      onClick={(e) => transferAdmission(e, id)}
                    >
                      <FaExchangeAlt className="h-4 w-4" />
                    </button>
                    <button
                      title="Duplicate"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-purple-50 text-purple-600"
                      onClick={(e) => duplicateAdmission(e, id)}
                    >
                      <FaCopy className="h-4 w-4" />
                    </button>

                    {/* Cancel / Delete */}
                    <button
                      title="Cancel (Withdraw)"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-gray-50 text-gray-600"
                      onClick={(e) => cancelAdmission(e, id)}
                    >
                      <FaTimesCircle className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-rose-50 text-rose-600"
                      onClick={(e) => deleteAdmission(e, id)}
                    >
                      <FaTrashAlt className="h-4 w-4" />
                    </button>
                  </div>

                  <Link to={path}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden h-full flex ${
                        view === "list" ? "flex-row p-4 items-center" : "flex-col"
                      }`}
                    >
                      <div
                        className={`${
                          view === "list"
                            ? "w-16 h-16 flex-shrink-0 mr-4"
                            : "w-full h-16"
                        } flex items-center justify-center`}
                      >
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-700">
                          <FaUser />
                        </div>
                      </div>

                      <div
                        className={`${
                          view === "list"
                            ? "flex-1 flex flex-col"
                            : "p-4 flex flex-col flex-grow"
                        }`}
                      >
                        <div className="text-left space-y-1 flex-shrink-0">
                          {/* Student */}
                          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {studentName}
                          </h3>

                          {/* ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {id}
                            </code>
                          </p>

                          {/* Date */}
                          {created && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {created}
                            </p>
                          )}

                          {/* Email / AY / Status */}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Email:</span>{" "}
                            {studentEmail}{" "}
                            <span className="ml-3 font-medium">Year:</span>{" "}
                            {year}
                          </p>

                          {/* Degree / Semester / Course */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUniversity className="mr-1 text-indigo-500" />
                            <span className="truncate">
                              <span className="font-medium">Degree:</span>{" "}
                              {deg}
                              {sem && (
                                <>
                                  <span className="ml-2 font-medium">
                                    Semester:
                                  </span>{" "}
                                  {sem}
                                </>
                              )}
                              {course && (
                                <>
                                  <span className="ml-2 font-medium">
                                    Course:
                                  </span>{" "}
                                  {course}
                                </>
                              )}
                            </span>
                          </p>

                          {/* Status + Deleted */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded ${statusBadge(
                                status
                              )}`}
                              title="Application Status"
                            >
                              {prettyStatus(status)}
                            </span>
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded ${
                                isDeleted
                                  ? "bg-gray-200 text-gray-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                              title={isDeleted ? "Deleted" : "Not Deleted"}
                            >
                              {isDeleted ? (
                                <>
                                  <FaTimesCircle className="mr-1" /> Deleted
                                </>
                              ) : (
                                <>
                                  <FaCheckCircle className="mr-1" /> Active
                                </>
                              )}
                            </span>
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
              No admissions found. Adjust filters or create a new admission.
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
