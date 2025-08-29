import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaArrowLeft,
  FaArrowRight,
  FaSearch,
  FaUserCheck,
  FaUserTimes,
  FaTrashAlt,
  FaRedo,
  FaGlobe,
  FaLinkedin,
  FaGithub,
  FaYoutube,
  FaTwitter,
  FaLanguage,
  FaTools,
  FaMoneyBillWave,
  FaStar,
  FaUsers,
  FaTimesCircle, // NEW: for top-right hard delete
} from "react-icons/fa";

// ====== API ROUTES (match your backend) ======
const ROUTES = {
  LIST: `${globalBackendRoute}/api/instructors/list`,
  COUNTS: `${globalBackendRoute}/api/instructors/counts`,
  APPROVE: (id) => `${globalBackendRoute}/api/instructors/approve/${id}`, // POST
  REJECT: (id) => `${globalBackendRoute}/api/instructors/reject/${id}`, // POST
  TOGGLE_ACTIVE: (id) =>
    `${globalBackendRoute}/api/instructors/toggle-active/${id}`, // POST
  SOFT_DELETE: (id) => `${globalBackendRoute}/api/instructors/remove/${id}`, // DELETE
  HARD_DELETE: (id) =>
    `${globalBackendRoute}/api/instructors/hard-delete/${id}`, // DELETE
};

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

const chip = (text, color) => (
  <span
    className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${color}`}
  >
    {text}
  </span>
);

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return chip("approved", "bg-green-100 text-green-700");
  if (s === "rejected") return chip("rejected", "bg-red-100 text-red-700");
  if (s === "deleted") return chip("deleted", "bg-gray-200 text-gray-700");
  return chip("pending", "bg-yellow-100 text-yellow-700");
};

const ActiveBadge = ({ active }) =>
  active
    ? chip("active", "bg-indigo-100 text-indigo-700")
    : chip("inactive", "bg-gray-100 text-gray-600");

const ListSeparator = () => (
  <span className="mx-2 text-gray-300 select-none">•</span>
);

const SocialLinks = ({ i }) => {
  const IconLink = ({ href, children, title }) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center h-8 w-8 rounded-full border hover:bg-gray-50"
        title={title}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
    ) : null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <IconLink href={i.website} title="Website">
        <FaGlobe />
      </IconLink>
      <IconLink href={i.linkedin} title="LinkedIn">
        <FaLinkedin />
      </IconLink>
      <IconLink href={i.github} title="GitHub">
        <FaGithub />
      </IconLink>
      <IconLink href={i.youtube} title="YouTube">
        <FaYoutube />
      </IconLink>
      <IconLink href={i.twitter} title="Twitter/X">
        <FaTwitter />
      </IconLink>
    </div>
  );
};

export default function AllInstructorsApplications() {
  const [view, setView] = useState("grid"); // list | grid | card
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // pending|approved|rejected|deleted|all
  const [active, setActive] = useState("all"); // all|true|false
  const [showDeleted, setShowDeleted] = useState(false);

  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    deleted: 0,
    active: 0,
    inactive: 0,
  });

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

  // reset page when filters change
  useEffect(
    () => setPage(1),
    [search, status, active, showDeleted, limit, sort]
  );

  // counts
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await axios.get(ROUTES.COUNTS, { headers: authHeader });
        if (!alive) return;
        const d = r?.data?.data || {};
        setCounts({
          total: d.total || 0,
          pending: d.pending || 0,
          approved: d.approved || 0,
          rejected: d.rejected || 0,
          deleted: d.deleted || 0,
          active: d.active || 0,
          inactive: d.inactive || 0,
        });
      } catch (e) {
        // silent
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // list
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const params = { page, limit, sort };
        if (search.trim()) params.q = search.trim();
        if (status !== "all") params.status = status;
        if (active !== "all")
          params.active = active === "true" ? "true" : "false";
        if (showDeleted) params.deleted = "true";

        const r = await axios.get(ROUTES.LIST, {
          params,
          headers: authHeader,
          signal: controller.signal,
        });

        if (!alive) return;
        const items = r?.data?.data || [];
        const p = r?.data?.pagination || {};
        setRows(Array.isArray(items) ? items : []);
        setPagination({
          page: Number(p.page || page),
          limit: Number(p.limit || limit),
          total: Number(p.total || items.length || 0),
          totalPages: Number(
            p.totalPages ||
              Math.max(1, Math.ceil((p.total || 0) / (p.limit || limit || 1)))
          ),
        });
      } catch (err) {
        if (!alive) return;
        console.error("Fetch instructors failed:", err);
        setMsg(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load instructors."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [page, limit, search, status, active, showDeleted, sort, refreshKey]);

  const pageWindow = useMemo(() => {
    const start =
      pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.limit);
    return { start, end };
  }, [pagination]);

  const buildPages = () => {
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set([
      1,
      2,
      total - 1,
      total,
      current,
      current - 1,
      current + 1,
    ]);
    [...set].forEach((n) => (n < 1 || n > total) && set.delete(n));
    const arr = [...set].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      out.push(arr[i]);
      if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("…");
    }
    return out;
  };

  // actions
  const refresh = () => setRefreshKey((k) => k + 1);

  const approve = async (id) => {
    try {
      await axios.post(ROUTES.APPROVE(id), {}, { headers: authHeader });
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Approve failed");
    }
  };
  const reject = async (id) => {
    const reason = window.prompt("Reason for rejection? (optional)", "");
    try {
      await axios.post(
        ROUTES.REJECT(id),
        { reason },
        {
          headers: {
            "Content-Type": "application/json",
            ...(authHeader || {}),
          },
        }
      );
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Reject failed");
    }
  };
  const toggleActive = async (id) => {
    try {
      await axios.post(ROUTES.TOGGLE_ACTIVE(id), {}, { headers: authHeader });
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Toggle failed");
    }
  };
  const softDelete = async (id) => {
    if (!window.confirm("Soft delete this instructor?")) return;
    try {
      await axios.delete(ROUTES.SOFT_DELETE(id), { headers: authHeader });
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Delete failed");
    }
  };
  const hardDelete = async (id) => {
    if (
      !window.confirm(
        "⚠️ PERMANENTLY delete this instructor application? This cannot be undone."
      )
    )
      return;
    try {
      await axios.delete(ROUTES.HARD_DELETE(id), { headers: authHeader });
      refresh();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || "Hard delete failed");
    }
  };

  // UI helpers
  const renderLangs = (i) =>
    Array.isArray(i.languages) && i.languages.length ? (
      <div className="text-xs text-gray-700 flex items-center gap-2 mt-1">
        <FaLanguage className="text-teal-600" />
        <span className="truncate">{i.languages.join(", ")}</span>
      </div>
    ) : null;

  const renderSkills = (i) =>
    Array.isArray(i.skills) && i.skills.length ? (
      <div className="text-xs text-gray-700 flex items-center gap-2 mt-1">
        <FaTools className="text-amber-600" />
        <span className="truncate">
          {i.skills.slice(0, 6).join(", ")}
          {i.skills.length > 6 ? "…" : ""}
        </span>
      </div>
    ) : null;

  const renderTopStats = (i) => (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700 mt-2">
      <span className="inline-flex items-center gap-1">
        <FaMoneyBillWave className="text-emerald-600" />
        {Number.isFinite(Number(i.hourlyRate)) ? `₹${i.hourlyRate}/hr` : "—"}
      </span>
      <ListSeparator />
      <span className="inline-flex items-center gap-1">
        <FaStar className="text-yellow-500" />
        {i.rating?.toFixed
          ? i.rating.toFixed(1)
          : Number(i.rating || 0).toFixed(1)}{" "}
        ({i.ratingCount || 0})
      </span>
      <ListSeparator />
      <span className="inline-flex items-center gap-1">
        <FaUsers className="text-indigo-600" />
        {i.studentsTaught || 0} taught
      </span>
    </div>
  );

  const displayName = (i) =>
    i.fullName ||
    i.name ||
    (i.firstName || i.lastName
      ? `${i.firstName || ""} ${i.lastName || ""}`.trim()
      : "") ||
    i.email ||
    shortId(i._id || i.id);

  const updateLink = (i) => {
    const slug = makeSlug(displayName(i));
    return `/update-instructor/${slug}/${i._id || i.id}`;
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b bg-gradient-to-b from-white to-gray-50">
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">All Instructors</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review, moderate, and manage instructor applications.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {chip(`Total: ${counts.total}`, "bg-gray-100 text-gray-700")}
            {chip(
              `Pending: ${counts.pending}`,
              "bg-yellow-100 text-yellow-700"
            )}
            {chip(
              `Approved: ${counts.approved}`,
              "bg-green-100 text-green-700"
            )}
            {chip(`Rejected: ${counts.rejected}`, "bg-red-100 text-red-700")}
            {chip(`Deleted: ${counts.deleted}`, "bg-gray-200 text-gray-700")}
            {chip(`Active: ${counts.active}`, "bg-indigo-100 text-indigo-700")}
            {chip(
              `Inactive: ${counts.inactive}`,
              "bg-purple-100 text-purple-700"
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative md:w-96">
            <input
              type="text"
              placeholder="Search by text (q)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              className="border border-gray-300 rounded px-2 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Application status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="deleted">Deleted</option>
            </select>

            <select
              className="border border-gray-300 rounded px-2 py-2 text-sm"
              value={active}
              onChange={(e) => setActive(e.target.value)}
              title="Active filter"
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              Show deleted
            </label>

            <select
              className="border border-gray-300 rounded px-2 py-2 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              title="Sort"
            >
              <option value="-createdAt">Newest</option>
              <option value="createdAt">Oldest</option>
              <option value="-rating">Rating ↓</option>
              <option value="rating">Rating ↑</option>
              <option value="-studentsTaught">Students taught ↓</option>
              <option value="studentsTaught">Students taught ↑</option>
              <option value="-hourlyRate">Hourly rate ↓</option>
              <option value="hourlyRate">Hourly rate ↑</option>
            </select>

            <select
              className="border border-gray-300 rounded px-2 py-2 text-sm"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              title="Items per page"
            >
              {[6, 12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>

            {/* View toggles */}
            <div className="flex items-center gap-2 ml-1">
              <FaThList
                className={`cursor-pointer ${
                  view === "list" ? "text-blue-500" : "text-gray-500"
                }`}
                onClick={() => setView("list")}
                title="List view"
              />
              <FaTh
                className={`cursor-pointer ${
                  view === "card" ? "text-purple-500" : "text-gray-500"
                }`}
                onClick={() => setView("card")}
                title="Card view"
              />
              <FaThLarge
                className={`cursor-pointer ${
                  view === "grid" ? "text-green-500" : "text-gray-500"
                }`}
                onClick={() => setView("grid")}
                title="Grid view"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading instructors…</p>
      )}
      {msg && !loading && (
        <p className="text-center text-red-600 mt-6">{msg}</p>
      )}

      {/* Grid */}
      {!loading && !msg && (
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
            {rows.map((i) => {
              const title = displayName(i);
              const listLayout = view === "list";

              const degCount = Array.isArray(i.degrees) ? i.degrees.length : 0;
              const semCount = Array.isArray(i.semesters)
                ? i.semesters.length
                : 0;
              const crsCount = Array.isArray(i.courses) ? i.courses.length : 0;

              return (
                <div key={i._id || i.id} className="relative">
                  {/* Card */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`relative rounded-2xl bg-white ring-1 ring-gray-100 shadow-md hover:shadow-lg overflow-hidden h-full ${
                      listLayout ? "p-4" : "p-5"
                    }`}
                  >
                    {/* Top-right hard delete (outside but touching) */}
                    <button
                      title="Permanently delete"
                      className="absolute -top-2 -right-2 translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white ring-1 ring-gray-200 shadow hover:bg-red-50 text-red-600 flex items-center justify-center"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        hardDelete(i._id || i.id);
                      }}
                    >
                      <FaTimesCircle />
                    </button>

                    {/* Header area */}
                    <div
                      className={`flex ${
                        listLayout ? "items-center gap-4" : "items-start gap-4"
                      }`}
                    >
                      <div
                        className={`${
                          listLayout ? "w-14 h-14" : "w-14 h-14"
                        } flex items-center justify-center rounded-full bg-gray-100 text-gray-700`}
                      >
                        <span className="font-semibold text-sm">
                          {String(title || "?")
                            .split(" ")
                            .map((s) => s[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                            {title}
                          </h3>
                          <StatusBadge status={i.applicationStatus} />
                          <ActiveBadge active={!!i.isActive} />
                        </div>

                        {renderTopStats(i)}
                        {renderLangs(i)}
                        {renderSkills(i)}

                        <div className="text-xs text-gray-600 mt-2">
                          <span className="font-medium">Assignments:</span>{" "}
                          {degCount} degree(s), {semCount} semester(s),{" "}
                          {crsCount} course(s)
                        </div>

                        <SocialLinks i={i} />
                      </div>
                    </div>

                    {/* Footer actions (kept inside, aligned, wraps on small) */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={updateLink(i)}
                          className="inline-flex items-center gap-1 h-8 px-3 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                          title="Open update page"
                        >
                          Edit
                        </Link>

                        <button
                          className="inline-flex items-center gap-1 h-8 px-3 text-xs rounded-md border border-green-200 text-green-700 hover:bg-green-50"
                          title="Approve"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            approve(i._id || i.id);
                          }}
                        >
                          <FaUserCheck />
                          Approve
                        </button>

                        <button
                          className="inline-flex items-center gap-1 h-8 px-3 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                          title="Reject"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            reject(i._id || i.id);
                          }}
                        >
                          <FaUserTimes />
                          Reject
                        </button>

                        <button
                          className="inline-flex items-center gap-1 h-8 px-3 text-xs rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          title="Toggle Active"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleActive(i._id || i.id);
                          }}
                        >
                          <FaRedo />
                          Toggle
                        </button>

                        <button
                          className="ml-auto inline-flex items-center gap-1 h-8 px-3 text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                          title="Soft delete (can restore later)"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            softDelete(i._id || i.id);
                          }}
                          onAuxClick={(e) => {
                            // Alt+click for hard delete (optional shortcut)
                            if (e.altKey) {
                              e.preventDefault();
                              e.stopPropagation();
                              hardDelete(i._id || i.id);
                            }
                          }}
                        >
                          <FaTrashAlt />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>

          {pagination.total === 0 && (
            <p className="text-center text-gray-600 mt-6">
              No instructors found.
            </p>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-8 gap-3">
            <div className="text-gray-700 text-sm">
              Page {pagination.page} of {pagination.totalPages} • Showing{" "}
              <span className="font-medium">
                {pageWindow.start}-{pageWindow.end}
              </span>{" "}
              of <span className="font-medium">{pagination.total}</span> results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-white ${
                  pagination.page <= 1
                    ? "bg-gray-300"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
                title="Previous page"
              >
                <FaArrowLeft />
              </button>

              <div className="flex items-center gap-1">
                {buildPages().map((p, idx) =>
                  p === "…" ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 rounded border text-sm ${
                        p === pagination.page
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
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={pagination.page >= pagination.totalPages}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-white ${
                  pagination.page >= pagination.totalPages
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
