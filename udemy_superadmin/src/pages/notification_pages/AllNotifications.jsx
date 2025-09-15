import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
  FaCalendar,
  FaTags,
  FaUniversity,
  FaClipboardList,
  FaBolt,
  FaCopy,
  FaFilter,
  FaRedoAlt,
  FaPaperPlane,
  FaStopCircle,
  FaClock,
  FaDownload,
  FaListUl,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

/** --- enums (match your backend model) --- */
const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "exam", label: "Exam" },
  { value: "result", label: "Result" },
  { value: "fees", label: "Fees" },
  { value: "events", label: "Events" },
  { value: "attendance", label: "Attendance" },
  { value: "assignment", label: "Assignment" },
  { value: "system", label: "System" },
];

const PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
  { value: "canceled", label: "Canceled" },
];

const AUDIENCE_TYPES = [
  { value: "", label: "All Audience Types" },
  { value: "all", label: "All users" },
  { value: "roles", label: "By roles" },
  { value: "users", label: "Specific users" },
  { value: "contextual", label: "Contextual" },
];

const CHANNELS = [
  { value: "", label: "All Channels" },
  { value: "inapp", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const ROLES = [
  { value: "", label: "All Roles" },
  { value: "superadmin", label: "superadmin" },
  { value: "admin", label: "admin" },
  { value: "instructor", label: "instructor" },
  { value: "teacher", label: "teacher" },
  { value: "student", label: "student" },
  { value: "author", label: "author" },
];

/** axios instance w/ token */
const api = axios.create({
  baseURL: globalBackendRoute,
});
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

/** helpers */
const shortId = (val) =>
  typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

const toTags = (arr) =>
  !arr
    ? []
    : Array.isArray(arr)
    ? arr
    : String(arr)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

/** main component */
export default function AllNotifications() {
  const [view, setView] = useState("grid"); // grid | list | card
  const [searchTerm, setSearchTerm] = useState("");

  // pagination (default 3/page like AllQuestions)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);

  // rows + meta
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 3,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // lookup maps for rendering (context names)
  const [degreeMap, setDegreeMap] = useState({});
  const [semesterMap, setSemesterMap] = useState({});
  const [courseMap, setCourseMap] = useState({});

  // cascading lists
  const [degreeList, setDegreeList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [courseList, setCourseList] = useState([]);

  // bulk selection
  const [selected, setSelected] = useState(new Set());

  // filters
  const [filters, setFilters] = useState({
    category: "",
    priority: "",
    status: "",
    audienceType: "",
    channel: "",
    role: "",
    tag: "",
    q: "",
    dateField: "createdAt",
    since: "",
    until: "",
    context_degree: "",
    context_semester: "",
    context_course: "",
    context_section: "",
    context_batchYear: "",
  });

  // sorting
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // Reset pagination when inputs change
  useEffect(
    () => setPage(1),
    [searchTerm, pageSize, filters, sortField, sortDir]
  );

  /** load Degrees (context) */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/api/list-degrees`, {
          params: { page: 1, limit: 1000 },
        });
        if (!alive) return;
        const list = r?.data?.data || [];
        setDegreeList(Array.isArray(list) ? list : []);
        const map = {};
        (Array.isArray(list) ? list : []).forEach((d) => {
          map[d._id || d.id] = d.name || d.title || "Untitled Degree";
        });
        setDegreeMap(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Degree -> Semesters */
  useEffect(() => {
    let alive = true;
    setSemesterList([]);
    setCourseList([]);
    setFilters((f) => ({
      ...f,
      context_semester: "",
      context_course: "",
    }));
    if (!filters.context_degree) {
      setSemesterMap({});
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/api/semesters`, {
          params: {
            page: 1,
            limit: 1000,
            degreeId: filters.context_degree,
            degree: filters.context_degree,
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
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.context_degree]);

  /** Semester -> Courses */
  useEffect(() => {
    let alive = true;
    setCourseList([]);
    setFilters((f) => ({ ...f, context_course: "" }));
    if (!filters.context_degree || !filters.context_semester) {
      setCourseMap({});
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/api/list-courses`, {
          params: {
            page: 1,
            limit: 1000,
            degreeId: filters.context_degree,
            semesterId: filters.context_semester,
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
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.context_semester]);

  /** fetch notifications */
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
          sort: `${sortDir === "desc" ? "-" : ""}${sortField}`,
        };

        // textual search
        const q = (filters.q || searchTerm || "").trim();
        if (q) params.q = q;

        // basic filters
        if (filters.category) params.category = filters.category;
        if (filters.priority) params.priority = filters.priority;
        if (filters.status) params.status = filters.status;
        if (filters.audienceType) params.audienceType = filters.audienceType;
        if (filters.channel) params.channel = filters.channel;
        if (filters.role) params.roles = filters.role;
        if (filters.tag) params.tag = filters.tag;

        // date range filters
        if (filters.dateField) params.dateField = filters.dateField;
        if (filters.since) params.since = filters.since;
        if (filters.until) params.until = filters.until;

        // contextual filters (exact matches)
        if (filters.context_degree)
          params.context_degree = filters.context_degree;
        if (filters.context_semester)
          params.context_semester = filters.context_semester;
        if (filters.context_course)
          params.context_course = filters.context_course;
        if (filters.context_section)
          params.context_section = filters.context_section;
        if (filters.context_batchYear)
          params.context_batchYear = filters.context_batchYear;

        const res = await api.get(`/api/list-notifications`, {
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
          totalPages: Number(m.pages || m.totalPages || 1),
        });
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching notifications:", err);
        setFetchError(
          err?.response?.data?.message ||
            "Notifications not available. Create one to get started."
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
  }, [page, pageSize, searchTerm, filters, sortField, sortDir, refreshKey]);

  /** selection helpers */
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const clearSelection = () => setSelected(new Set());
  const allChecked =
    rows.length > 0 && rows.every((r) => selected.has(r._id || r.id));
  const toggleSelectAll = () => {
    if (allChecked) {
      clearSelection();
    } else {
      setSelected(new Set(rows.map((r) => r._id || r.id)));
    }
  };

  /** actions (single) */
  const deleteOne = async (id) => {
    const ok = window.confirm(
      "Delete this notification? This cannot be undone."
    );
    if (!ok) return;
    try {
      await api.delete(`/api/delete-notification/${id}`);
      if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
      setRefreshKey((k) => k + 1);
      alert("Notification deleted.");
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err?.response?.data?.message || "Failed to delete.");
    }
  };

  const duplicateOne = async (id) => {
    try {
      await api.post(`/api/duplicate-notification/${id}`);
      setRefreshKey((k) => k + 1);
      alert("Notification duplicated.");
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert(err?.response?.data?.message || "Failed to duplicate.");
    }
  };

  const cancelOne = async (id) => {
    try {
      await api.post(`/api/cancel-notification/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err?.response?.data?.message || "Failed to cancel.");
    }
  };

  const sendOne = async (id) => {
    try {
      await api.post(`/api/send-notification/${id}`);
      setRefreshKey((k) => k + 1);
      alert("Send queued (or completed).");
    } catch (err) {
      console.error("Send failed:", err);
      alert(err?.response?.data?.message || "Failed to send.");
    }
  };

  const scheduleOne = async (id) => {
    const when = window.prompt(
      "Enter schedule time (ISO like 2025-09-10T14:30:00Z) or leave blank for now:"
    );
    try {
      await api.post(`/api/schedule-notification/${id}`, {
        scheduledAt: when || new Date().toISOString(),
      });
      setRefreshKey((k) => k + 1);
      alert("Scheduled.");
    } catch (err) {
      console.error("Schedule failed:", err);
      alert(err?.response?.data?.message || "Failed to schedule.");
    }
  };

  const exportCsv = async (id) => {
    try {
      const res = await api.get(
        `/api/export-notification-deliveries-csv/${id}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `notification_${id}_deliveries.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV failed:", err);
      alert(err?.response?.data?.message || "Failed to export CSV.");
    }
  };

  const openDeliveries = (id) => {
    window.open(`/notification/${id}/deliveries`, "_blank");
  };

  /** actions (bulk) */
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Delete ${ids.length} notifications?\nThis cannot be undone.`
    );
    if (!ok) return;
    try {
      await api.post(`/api/bulk-delete-notifications`, { ids });
      clearSelection();
      setRefreshKey((k) => k + 1);
      alert("Bulk delete completed.");
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(err?.response?.data?.message || "Bulk delete failed.");
    }
  };

  const bulkDuplicate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await api.post(`/api/bulk-duplicate-notifications`, { ids });
      clearSelection();
      setRefreshKey((k) => k + 1);
      alert("Bulk duplicate completed.");
    } catch (err) {
      console.error("Bulk duplicate failed:", err);
      alert(err?.response?.data?.message || "Bulk duplicate failed.");
    }
  };

  const bulkUpdateStatus = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const status = window.prompt(
      'Enter status for bulk update: "draft" | "scheduled" | "canceled"'
    );
    if (!status) return;
    try {
      await api.post(`/api/bulk-update-notification-status`, { ids, status });
      clearSelection();
      setRefreshKey((k) => k + 1);
      alert("Bulk status update completed.");
    } catch (err) {
      console.error("Bulk status failed:", err);
      alert(err?.response?.data?.message || "Bulk status failed.");
    }
  };

  /** pagination helpers */
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

  /** rendering helpers */
  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const FilterSelect = ({
    label,
    value,
    onChange,
    options,
    getOption,
    disabled = false,
    allLabel = "All",
  }) => (
    <label className="flex flex-col text-sm text-gray-700">
      <span className="mb-1">{label}</span>
      <select
        className="border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{disabled ? "Select parent first" : allLabel}</option>
        {options.map((o, idx) => {
          const { id, name } = getOption(o);
          return (
            <option
              key={`fs-${label}-${idx}-${id ?? name ?? "na"}`}
              value={id ?? ""}
            >
              {name} {id ? `(${shortId(id)})` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );

  const resetFilters = () =>
    setFilters({
      category: "",
      priority: "",
      status: "",
      audienceType: "",
      channel: "",
      role: "",
      tag: "",
      q: "",
      dateField: "createdAt",
      since: "",
      until: "",
      context_degree: "",
      context_semester: "",
      context_course: "",
      context_section: "",
      context_batchYear: "",
    });

  const renderBadges = (n) => {
    const status = n?.status || "draft";
    const priority = n?.priority || "normal";
    const channels = Array.isArray(n?.channels) ? n.channels : [];
    const audienceType = n?.audienceType || "—";
    const category = n?.category || "general";

    const statusColor =
      status === "sent"
        ? "bg-green-100 text-green-700"
        : status === "scheduled"
        ? "bg-amber-100 text-amber-700"
        : status === "sending"
        ? "bg-blue-100 text-blue-700"
        : status === "canceled"
        ? "bg-rose-100 text-rose-700"
        : "bg-gray-100 text-gray-700";

    const prioColor =
      priority === "urgent"
        ? "bg-rose-100 text-rose-700"
        : priority === "high"
        ? "bg-amber-100 text-amber-700"
        : priority === "low"
        ? "bg-gray-100 text-gray-700"
        : "bg-indigo-100 text-indigo-700";

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <span
          className={`inline-flex items-center text-xs px-2 py-1 rounded ${statusColor}`}
        >
          <FaBolt className="mr-1" />
          {status}
        </span>
        <span
          className={`inline-flex items-center text-xs px-2 py-1 rounded ${prioColor}`}
        >
          Priority: {priority}
        </span>
        <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
          Channel: {channels.join(", ") || "—"}
        </span>
        <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-purple-50 text-purple-700">
          Audience: {audienceType}
        </span>
        <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">
          Category: {category}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Notifications</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search title, message, tags…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} notifications
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
              <option key={`ps-${n}`} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort + Bulk bar */}
      <div className="mb-4 p-3 rounded-lg border bg-white shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Sort Field</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option key="sf-createdAt" value="createdAt">
                createdAt
              </option>
              <option key="sf-scheduledAt" value="scheduledAt">
                scheduledAt
              </option>
              <option key="sf-sentAt" value="sentAt">
                sentAt
              </option>
              <option key="sf-priority" value="priority">
                priority
              </option>
              <option key="sf-category" value="category">
                category
              </option>
              <option key="sf-title" value="title">
                title
              </option>
            </select>
          </label>

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Sort Direction</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
            >
              <option key="sd-desc" value="desc">
                desc
              </option>
              <option key="sd-asc" value="asc">
                asc
              </option>
            </select>
          </label>

          {/* Bulk actions */}
          <div className="flex items-end gap-2">
            <button
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100"
              onClick={bulkDelete}
              title="Bulk delete"
              disabled={selected.size === 0}
            >
              <FaTrashAlt className="inline mr-2" /> Delete Selected
            </button>
          </div>
          <div className="flex items-end gap-2">
            <button
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100"
              onClick={bulkDuplicate}
              title="Bulk duplicate"
              disabled={selected.size === 0}
            >
              <FaCopy className="inline mr-2" /> Duplicate Selected
            </button>
            <button
              className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100"
              onClick={bulkUpdateStatus}
              title="Bulk status"
              disabled={selected.size === 0}
            >
              <FaListUl className="inline mr-2" /> Update Status
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-3 rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <FaFilter />
          Filters (cascading + attributes)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Category */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Category</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
            >
              {CATEGORIES.map((o, idx) => (
                <option
                  key={`cat-${idx}-${o.value ?? "any"}`}
                  value={o.value ?? ""}
                >
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Priority */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Priority</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.priority}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priority: e.target.value }))
              }
            >
              {PRIORITIES.map((o, idx) => (
                <option
                  key={`prio-${idx}-${o.value ?? "any"}`}
                  value={o.value ?? ""}
                >
                  {o.label}
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
              {STATUSES.map((o, idx) => (
                <option
                  key={`stat-${idx}-${o.value ?? "any"}`}
                  value={o.value ?? ""}
                >
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Audience Type */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Audience</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.audienceType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, audienceType: e.target.value }))
              }
            >
              {AUDIENCE_TYPES.map((o, idx) => (
                <option
                  key={`aud-${idx}-${o.value ?? "any"}`}
                  value={o.value ?? ""}
                >
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Channel */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Channel</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.channel}
              onChange={(e) =>
                setFilters((f) => ({ ...f, channel: e.target.value }))
              }
            >
              {CHANNELS.map((o, idx) => (
                <option
                  key={`ch-${idx}-${o.value ?? "any"}`}
                  value={o.value ?? ""}
                >
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Role */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Role</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.role}
              onChange={(e) =>
                setFilters((f) => ({ ...f, role: e.target.value }))
              }
            >
              {ROLES.map((o, idx) => (
                <option
                  key={`role-${idx}-${o.value ?? "any"}`}
                  value={o.value ?? ""}
                >
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Tag */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Tag</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.tag}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tag: e.target.value }))
              }
              placeholder="e.g. urgent"
            />
          </label>

          {/* Text query (q) */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Keyword</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search title/message/tags"
            />
          </label>

          {/* Date field + range */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Date Field</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.dateField}
              onChange={(e) =>
                setFilters((f) => ({ ...f, dateField: e.target.value }))
              }
            >
              <option key="df-createdAt" value="createdAt">
                createdAt
              </option>
              <option key="df-scheduledAt" value="scheduledAt">
                scheduledAt
              </option>
              <option key="df-sentAt" value="sentAt">
                sentAt
              </option>
              <option key="df-expiresAt" value="expiresAt">
                expiresAt
              </option>
            </select>
          </label>

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Since</span>
            <input
              type="datetime-local"
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.since}
              onChange={(e) =>
                setFilters((f) => ({ ...f, since: e.target.value }))
              }
            />
          </label>

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Until</span>
            <input
              type="datetime-local"
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.until}
              onChange={(e) =>
                setFilters((f) => ({ ...f, until: e.target.value }))
              }
            />
          </label>

          {/* Context filters */}
          <FilterSelect
            label="Degree (context)"
            value={filters.context_degree}
            onChange={(v) => setFilters((f) => ({ ...f, context_degree: v }))}
            options={degreeList}
            getOption={(d) => ({
              id: d._id || d.id,
              name: d.name || d.title || "Untitled Degree",
            })}
            allLabel="(any)"
          />

          <FilterSelect
            label="Semester (context)"
            value={filters.context_semester}
            onChange={(v) => setFilters((f) => ({ ...f, context_semester: v }))}
            options={semesterList}
            disabled={!filters.context_degree}
            getOption={(s) => ({
              id: s._id || s.id,
              name:
                s.title ||
                s.semester_name ||
                (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                "Semester",
            })}
            allLabel="(any)"
          />

          <FilterSelect
            label="Course (context)"
            value={filters.context_course}
            onChange={(v) => setFilters((f) => ({ ...f, context_course: v }))}
            options={courseList}
            disabled={!filters.context_degree || !filters.context_semester}
            getOption={(c) => ({
              id: c._id || c.id,
              name: c.title || c.name || "Untitled Course",
            })}
            allLabel="(any)"
          />

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Section (context)</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.context_section}
              onChange={(e) =>
                setFilters((f) => ({ ...f, context_section: e.target.value }))
              }
              placeholder="e.g., A"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Batch Year (context)</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.context_batchYear}
              onChange={(e) =>
                setFilters((f) => ({ ...f, context_batchYear: e.target.value }))
              }
              placeholder="e.g., 2025"
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
        <p className="text-center text-gray-600 mt-6">Loading notifications…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-gray-600 mt-6">{fetchError}</p>
      )}

      {/* Grid/List */}
      {!loading && !fetchError && (
        <>
          {/* Select all / selected count */}
          <div className="mb-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleSelectAll}
              />
              <span>Select All on this page</span>
            </label>
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium">{selected.size}</span>
            </div>
          </div>

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
            {rows.map((n) => {
              const id = n?._id || n?.id;
              const created =
                n?.createdAt &&
                new Date(n.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              const scheduled =
                n?.scheduledAt &&
                new Date(n.scheduledAt).toLocaleString("en-US");
              const sentAt =
                n?.sentAt && new Date(n.sentAt).toLocaleString("en-US");

              const ctxDegreeName =
                (typeof n?.context?.degree === "string" &&
                  (degreeMap[n.context.degree] || shortId(n.context.degree))) ||
                (typeof n?.context?.degree === "object" &&
                  (n.context.degree?.name ||
                    n.context.degree?.title ||
                    shortId(n.context.degree?._id))) ||
                (n?.context?.degree ? "Degree" : "—");

              const ctxSemName =
                (typeof n?.context?.semester === "string" &&
                  (semesterMap[n.context.semester] ||
                    shortId(n.context.semester))) ||
                (typeof n?.context?.semester === "object" &&
                  (n.context.semester?.title ||
                    n.context.semester?.semester_name ||
                    (n.context.semester?.semNumber
                      ? `Semester ${n.context.semester?.semNumber}`
                      : ""))) ||
                (n?.context?.semester ? "Semester" : "—");

              const ctxCourseName =
                (typeof n?.context?.course === "string" &&
                  (courseMap[n.context.course] || shortId(n.context.course))) ||
                (typeof n?.context?.course === "object" &&
                  (n.context.course?.title ||
                    n.context.course?.name ||
                    shortId(n.context.course?._id))) ||
                (n?.context?.course ? "Course" : "—");

              // helpers
              const makeSlug = (s) =>
                String(s || "notification")
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");

              const listLayout = view === "list";
              const slug = n?.slug || makeSlug(n?.title) || "notification";
              const path = `/single-notification/${slug}/${id}`;

              return (
                <div key={id} className="relative">
                  {/* Row selection + actions */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <label
                      title="Select"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selected.has(id)}
                        onChange={() => toggleSelect(id)}
                      />
                      <span className="text-sm">
                        {selected.has(id) ? "✓" : "○"}
                      </span>
                    </label>

                    <button
                      title="Send now"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={() => sendOne(id)}
                    >
                      <FaPaperPlane className="h-4 w-4" />
                    </button>
                    <button
                      title="Schedule"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-amber-50 text-amber-600"
                      onClick={() => scheduleOne(id)}
                    >
                      <FaClock className="h-4 w-4" />
                    </button>
                    <button
                      title="Cancel"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-rose-50 text-rose-600"
                      onClick={() => cancelOne(id)}
                    >
                      <FaStopCircle className="h-4 w-4" />
                    </button>
                    <button
                      title="Duplicate"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-indigo-50 text-indigo-600"
                      onClick={() => duplicateOne(id)}
                    >
                      <FaCopy className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={() => deleteOne(id)}
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
                          <FaBolt />
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
                          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {n?.title || "Untitled Notification"}
                          </h3>

                          {/* ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {id}
                            </code>
                          </p>

                          {/* created / scheduled / sent */}
                          <div className="text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {created && (
                              <span className="inline-flex items-center">
                                <FaCalendar className="mr-1 text-yellow-500" />
                                Created {created}
                              </span>
                            )}
                            {scheduled && (
                              <span className="inline-flex items-center">
                                <FaClock className="mr-1 text-amber-600" />
                                Scheduled {scheduled}
                              </span>
                            )}
                            {sentAt && (
                              <span className="inline-flex items-center">
                                <FaPaperPlane className="mr-1 text-green-600" />
                                Sent {sentAt}
                              </span>
                            )}
                          </div>

                          {/* Contextual (if present) */}
                          {(n?.context?.degree ||
                            n?.context?.semester ||
                            n?.context?.course) && (
                            <>
                              <p className="text-sm text-gray-600 flex items-center">
                                <FaUniversity className="mr-1 text-indigo-500" />
                                <span className="truncate">
                                  <span className="font-medium">Degree:</span>{" "}
                                  {ctxDegreeName}
                                  {n?.context?.degree && (
                                    <span className="text-xs text-gray-500">
                                      (
                                      {typeof n?.context?.degree === "string"
                                        ? n?.context?.degree
                                        : n?.context?.degree?._id ||
                                          n?.context?.degree?.id ||
                                          "—"}
                                      )
                                    </span>
                                  )}
                                  {n?.context?.semester ? (
                                    <>
                                      <span className="ml-2 font-medium">
                                        Semester:
                                      </span>{" "}
                                      {ctxSemName}
                                      {n?.context?.semester && (
                                        <span className="text-xs text-gray-500">
                                          (
                                          {typeof n?.context?.semester ===
                                          "string"
                                            ? n?.context?.semester
                                            : n?.context?.semester?._id ||
                                              n?.context?.semester?.id ||
                                              "—"}
                                          )
                                        </span>
                                      )}
                                    </>
                                  ) : null}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600 flex items-center">
                                <FaClipboardList className="mr-1 text-green-600" />
                                <span className="truncate">
                                  <span className="font-medium">Course:</span>{" "}
                                  {ctxCourseName}
                                  {n?.context?.course && (
                                    <span className="text-xs text-gray-500">
                                      (
                                      {typeof n?.context?.course === "string"
                                        ? n?.context?.course
                                        : n?.context?.course?._id ||
                                          n?.context?.course?.id ||
                                          "—"}
                                      )
                                    </span>
                                  )}
                                  {n?.context?.section ? (
                                    <>
                                      <span className="ml-2 font-medium">
                                        Section:
                                      </span>{" "}
                                      {n.context.section}
                                    </>
                                  ) : null}
                                  {n?.context?.batchYear ? (
                                    <>
                                      <span className="ml-2 font-medium">
                                        Batch:
                                      </span>{" "}
                                      {n.context.batchYear}
                                    </>
                                  ) : null}
                                </span>
                              </p>
                            </>
                          )}

                          {/* Tags */}
                          {toTags(n?.tags).length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {toTags(n?.tags).join(", ")}
                            </p>
                          )}

                          {renderBadges(n)}
                        </div>

                        {/* message preview */}
                        {view !== "list" && n?.message && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {n.message}
                          </p>
                        )}

                        <div className="flex-grow" />

                        {/* Row footer actions */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100"
                            onClick={() => openDeliveries(id)}
                          >
                            View Deliveries
                          </button>
                          <button
                            className="px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100"
                            onClick={() => exportCsv(id)}
                          >
                            <FaDownload className="inline mr-2" />
                            Export CSV
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </div>
              );
            })}
          </motion.div>

          {meta.total === 0 && (
            <p className="text-center text-gray-600 mt-6">
              No notifications found. Adjust filters or create a notification.
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
