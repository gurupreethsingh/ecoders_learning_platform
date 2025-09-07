// src/pages/quizzes/AllQuizes.jsx
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
  FaBookOpen,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "../../config/Config.js";

const makeSlug = (s) =>
  String(s || "quiz")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function AllQuizzes() {
  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(3); // ✅ default 3/page

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 3, // ✅ default 3/page
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // For course name lookup when list endpoint doesn't populate
  const [courseMap, setCourseMap] = useState({});

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
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

  useEffect(() => setPage(1), [searchTerm, pageSize]);

  // course lookup map (best-effort)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${globalBackendRoute}/api/list-courses`, {
          params: { page: 1, limit: 2000 },
        });
        const list = res.data?.data || [];
        if (!alive) return;
        const map = {};
        (Array.isArray(list) ? list : []).forEach((c) => {
          const id = c?._id || c?.id;
          const name = c?.title || c?.name || c?.code || shortId(id);
          if (id) map[id] = name;
        });
        setCourseMap(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // fetch quizzes
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
          sortOrder: "desc",
        };
        if (searchTerm.trim()) params.q = searchTerm.trim();

        const res = await axios.get(`${globalBackendRoute}/api/list-quizzes`, {
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
        console.error("Error fetching quizzes:", err);
        setFetchError("Failed to load quizzes. Please try again.");
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

  const formatDateTime = (d) => {
    try {
      return new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderBadges = (q) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {q?.isPublished ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700">
            <FaCheckCircle /> Published
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
            <FaTimesCircle /> Draft
          </span>
        )}
        {q?.isPaid ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">
            Paid
          </span>
        ) : (
          <span className="inline-block text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
            Free
          </span>
        )}
        {q?.difficulty ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
            {q.difficulty}
          </span>
        ) : null}
      </div>
    );
  };

  const deleteQuiz = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete quiz "${title || "Untitled"}"? This action cannot be undone.`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${globalBackendRoute}/api/delete-quiz/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Quiz deleted successfully.");
      } else {
        throw new Error("Failed to delete quiz.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message || err?.message || "Failed to delete quiz."
      );
    }
  };

  const togglePublish = async (e, quiz) => {
    e.preventDefault();
    e.stopPropagation();
    const id = quiz?._id || quiz?.id;
    if (!id) return;

    const willPublish = !quiz?.isPublished;
    const url = willPublish
      ? `${globalBackendRoute}/api/publish-quiz/${id}`
      : `${globalBackendRoute}/api/unpublish-quiz/${id}`;

    try {
      const res = await axios.patch(url);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
      } else {
        throw new Error("Publish toggle failed");
      }
    } catch (err) {
      console.error("Publish toggle failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const duplicateQuiz = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/duplicate-quiz/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Quiz duplicated (draft copy created).");
      } else {
        throw new Error("Duplicate failed");
      }
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Quizzes</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search quizzes by name, code, subject, tags…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} quizzes
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
            {[3, 6, 12, 24, 48].map(
              (
                n // ✅ includes 3/page
              ) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading quizzes…</p>
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
            {rows.map((q) => {
              const created =
                q?.createdAt &&
                new Date(q.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

              // course may be populated in controller; fallback
              const courseObj =
                q?.course && typeof q.course === "object" ? q.course : null;
              const courseId =
                (courseObj && (courseObj._id || courseObj.id)) ||
                (typeof q?.course === "string" ? q.course : q?._id || q?.id);
              const courseTitle =
                (courseObj && (courseObj.title || courseObj.name)) ||
                courseMap[q?.course] ||
                (typeof q?.course === "string" ? shortId(q.course) : "—");

              const start = q?.startTime ? formatDateTime(q.startTime) : "";
              const end = q?.endTime ? formatDateTime(q.endTime) : "";

              const quizId = q?._id || q?.id;
              const slugPart = encodeURIComponent(
                q?.slug || makeSlug(q?.quizName || q?.quizCode || quizId)
              );

              // ✅ FIXED: include both slug AND id to match /single-quiz/:slug/:id
              const path = `/single-quiz/${slugPart}/${quizId}`;

              const listLayout = view === "list";

              return (
                <div key={quizId} className="relative">
                  {/* Action buttons */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <button
                      title={q?.isPublished ? "Unpublish" : "Publish"}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-${
                        q?.isPublished ? "yellow" : "green"
                      }-50 text-${q?.isPublished ? "yellow-700" : "green-600"}`}
                      onClick={(e) => togglePublish(e, q)}
                    >
                      P
                    </button>
                    <button
                      title="Duplicate quiz"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-indigo-50 text-indigo-600"
                      onClick={(e) => duplicateQuiz(e, quizId)}
                    >
                      D
                    </button>
                    <button
                      title="Delete quiz"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={(e) => deleteQuiz(e, quizId, q?.quizName)}
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
                          <FaBookOpen />
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
                            {q?.quizName || "Untitled Quiz"}
                          </h3>

                          {/* Quiz Code + ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Code:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {q?.quizCode || "—"}
                            </code>{" "}
                            <span className="ml-2 font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {quizId}
                            </code>
                          </p>

                          {created && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {created}
                            </p>
                          )}

                          {/* Course */}
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Course:</span>{" "}
                            {courseTitle}{" "}
                            {courseId && (
                              <>
                                <span className="ml-2 font-medium">
                                  Course ID:
                                </span>{" "}
                                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                                  {typeof courseId === "string" ? courseId : ""}
                                </code>
                              </>
                            )}
                          </p>

                          {/* Core stats */}
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Duration:</span>{" "}
                            {q?.quizDurationMinutes
                              ? `${q.quizDurationMinutes} min`
                              : "—"}{" "}
                            <span className="ml-2 font-medium">Pass %:</span>{" "}
                            {Number.isFinite(Number(q?.passPercentage))
                              ? q.passPercentage
                              : "—"}{" "}
                            <span className="ml-2 font-medium">Attempts:</span>{" "}
                            {Number.isFinite(Number(q?.numberOfAttemptsAllowed))
                              ? q.numberOfAttemptsAllowed
                              : "—"}{" "}
                            <span className="ml-2 font-medium">Marks:</span>{" "}
                            {Number.isFinite(Number(q?.totalMarks))
                              ? q.totalMarks
                              : "—"}
                          </p>

                          {/* Window */}
                          {(start || end) && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Window:</span>{" "}
                              {start || "—"} {end ? "→ " + end : ""}
                            </p>
                          )}

                          {/* Subject + tags */}
                          {q?.subject && (
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Subject:</span>{" "}
                              {q.subject}
                            </p>
                          )}
                          {toTags(q.tags).length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {toTags(q.tags).join(", ")}
                            </p>
                          )}

                          {renderBadges(q)}
                        </div>

                        {view !== "list" && q?.instructions && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {q.instructions}
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
            <p className="text-center text-gray-600 mt-6">No quizzes found.</p>
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

          {/* Small page status */}
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
