import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaCalendar,
  FaTags,
  FaSearch,
  FaGraduationCap,
  FaTrashAlt,
  FaClock,
  FaPercent,
  FaCheck,
  FaIdBadge,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

export default function AllExams() {
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

  // lookups
  const [degreeMap, setDegreeMap] = useState({});
  const [semesterMap, setSemesterMap] = useState({});
  const [courseMap, setCourseMap] = useState({});
  const [userMap, setUserMap] = useState({}); // fallback labels for createdBy (optional)

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const makeSlug = (name, code) => {
    const base = name || code || "exam";
    return String(base)
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

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (d) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const EXAM_TYPE_LABELS = {
    weekly: "Weekly",
    monthly: "Monthly",
    half_yearly: "Half Yearly",
    mid_term: "Mid Term",
    preparatory: "Preparatory",
    final: "Final Exam",
  };

  useEffect(() => setPage(1), [searchTerm, pageSize]);

  // lookups for degree/semester/course/(optional)users
  useEffect(() => {
    let alive = true;

    const fetchLookups = async () => {
      try {
        const [degRes, semRes, courseRes, usersRes] = await Promise.allSettled([
          axios.get(`${globalBackendRoute}/api/list-degrees`, {
            params: { page: 1, limit: 1000 },
          }),
          axios
            .get(`${globalBackendRoute}/api/semesters`, {
              params: { page: 1, limit: 5000 },
            })
            .catch(() => ({ data: { data: [] } })),
          axios
            .get(`${globalBackendRoute}/api/list-courses`, {
              params: { page: 1, limit: 5000 },
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
          (Array.isArray(list) ? list : []).forEach((d) => {
            map[d._id || d.id] = d.name || d.title || "Untitled Degree";
          });
          setDegreeMap(map);
        }

        // Semesters
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
          setSemesterMap(map);
        }

        // Courses
        if (courseRes.status === "fulfilled") {
          const list =
            courseRes.value?.data?.data || courseRes.value?.data || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((c) => {
            map[c._id || c.id] =
              c.title || c.name || c.code || "Untitled Course";
          });
          setCourseMap(map);
        }

        // Users (best-effort)
        if (usersRes.status === "fulfilled") {
          const list = usersRes.value?.data?.data || usersRes.value?.data || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((u) => {
            map[u._id || u.id] = u.name || u.fullName || u.email || "User";
          });
          setUserMap(map);
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

  // fetch exams
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

        const res = await axios.get(`${globalBackendRoute}/api/list-exams`, {
          params,
          signal: ctrl.signal,
        });

        const data = res.data?.data || res.data || [];
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
        console.error("Error fetching exams:", err);
        setFetchError("Failed to load exams. Please try again.");
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

  const buildPages = () => {
    const totalPages = meta.totalPages;
    const currentPage = meta.page;
    const list = [];
    const maxBtns = 7;

    if (totalPages <= maxBtns) {
      for (let i = 1; i <= totalPages; i++) list.push(i);
      return list;
    }
    list.push(1);
    if (currentPage > 4) list.push("…");
    const s = Math.max(2, currentPage - 1),
      e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) list.push(i);
    if (currentPage < totalPages - 3) list.push("…");
    list.push(totalPages);
    return list;
  };

  const deleteExam = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete exam "${title || "Untitled"}"? This action cannot be undone.`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${globalBackendRoute}/api/delete-exam/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Exam deleted successfully.");
      } else {
        throw new Error("Failed to delete exam.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message || err?.message || "Failed to delete exam."
      );
    }
  };

  const togglePublish = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/toggle-publish/${id}`
      );
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

  const bumpAttempt = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/increment-attempt/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
      } else {
        throw new Error("Increment failed");
      }
    } catch (err) {
      console.error("Increment failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const renderBadges = (x) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {x?.isPublished ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-700">
            Published
          </span>
        ) : (
          <span className="inline-block text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
            Draft
          </span>
        )}
        {x?.difficultyLevel ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">
            {x.difficultyLevel}
          </span>
        ) : null}
        {x?.examType ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
            {EXAM_TYPE_LABELS[x.examType] || x.examType}
          </span>
        ) : null}
        {x?.isPaid ? (
          <span className="inline-block text-xs px-2 py-1 rounded bg-red-100 text-red-700">
            Paid
          </span>
        ) : (
          <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
            Free
          </span>
        )}
      </div>
    );
  };

  // Pagination controls like AllCategories
  const goTo = (p) =>
    setPage(Math.min(Math.max(1, p), Math.max(1, meta.totalPages)));

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Exams</h2>
        </div>

        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search exams by name, code, subject, tags, etc."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} exams
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

      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading exams…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-red-600 mt-6">{fetchError}</p>
      )}

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
            {rows.map((x) => {
              const tags = toTags(x.tags);
              const created = formatDate(x?.createdAt);
              const examDate = formatDate(x?.examDate);
              const start = formatDateTime(x?.startTime);
              const end = formatDateTime(x?.endTime);

              const slug = makeSlug(x?.examName, x?.examCode);
              const path = `/single-exam/${slug}/${x?._id || x?.id}`;
              const listLayout = view === "list";
              const examId = x._id || x.id;

              // Degree
              const degreeId =
                typeof x?.degree === "object" ? x?.degree?._id : x?.degree;
              const degreeName =
                (typeof x?.degree === "object" &&
                  (x?.degree?.name || x?.degree?.title)) ||
                degreeMap[degreeId] ||
                (typeof degreeId === "string" ? shortId(degreeId) : "—");

              // Semester/Semester
              const semField = x?.semester ?? x?.semester;
              const semId =
                typeof semField === "object" ? semField?._id : semField;
              const semName =
                (typeof semField === "object" &&
                  (semField?.title ||
                    semField?.semester_name ||
                    (semField?.semNumber
                      ? `Semester ${semField?.semNumber}`
                      : ""))) ||
                semesterMap[semId] ||
                (typeof semId === "string" ? shortId(semId) : "—");

              // Course
              const courseId =
                typeof x?.course === "object" ? x?.course?._id : x?.course;
              const courseName =
                (typeof x?.course === "object" &&
                  (x?.course?.title || x?.course?.name || x?.course?.code)) ||
                courseMap[courseId] ||
                (typeof courseId === "string" ? shortId(courseId) : "—");

              // createdBy (best-effort)
              const userId =
                typeof x?.createdBy === "object"
                  ? x?.createdBy?._id
                  : x?.createdBy;
              const createdByName =
                (typeof x?.createdBy === "object" &&
                  (x?.createdBy?.name ||
                    x?.createdBy?.fullName ||
                    x?.createdBy?.email)) ||
                userMap[userId] ||
                (typeof userId === "string" ? shortId(userId) : "—");

              return (
                <div key={examId} className="relative">
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <button
                      title="Toggle Published"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={(e) => togglePublish(e, examId)}
                    >
                      P
                    </button>
                    <button
                      title="Increment Attempt Count"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-blue-50 text-blue-600"
                      onClick={(e) => bumpAttempt(e, examId)}
                    >
                      <FaCheck className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete exam"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={(e) => deleteExam(e, examId, x?.examName)}
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
                            {x?.examName || "Untitled Exam"}
                          </h3>

                          {/* ✅ Exam ID display */}
                          <div className="text-xs text-gray-600 flex items-center gap-2">
                            <FaIdBadge className="text-purple-600" />
                            <code className="bg-gray-100 border px-2 py-0.5 rounded">
                              {examId}
                            </code>
                          </div>

                          <p className="text-sm text-gray-600 flex items-center">
                            <FaCalendar className="mr-1 text-yellow-500" />
                            Created: {created}
                            {x?.examDate ? (
                              <span className="ml-3">
                                • Exam Date: <strong>{examDate}</strong>
                              </span>
                            ) : null}
                          </p>

                          {(x?.startTime || x?.endTime) && (
                            <p className="text-sm text-gray-600">
                              Window:{" "}
                              <span className="font-medium">
                                {start || "—"}
                              </span>{" "}
                              →{" "}
                              <span className="font-medium">{end || "—"}</span>
                            </p>
                          )}

                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Subject:</span>{" "}
                            {x?.subject || "—"}{" "}
                            <span className="ml-2 font-medium">Code:</span>{" "}
                            {x?.examCode || "—"}
                          </p>

                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Degree:</span>{" "}
                            {degreeName}
                            {semName ? (
                              <>
                                <span className="ml-2 font-medium">
                                  Semester:
                                </span>{" "}
                                {semName}
                              </>
                            ) : null}
                            <span className="ml-2 font-medium">Course:</span>{" "}
                            {courseName}
                          </p>

                          <p className="text-sm text-gray-700">
                            <FaClock className="inline mr-1 text-indigo-500" />
                            Duration:{" "}
                            <span className="font-medium">
                              {x?.examDurationMinutes
                                ? `${x.examDurationMinutes} min`
                                : "—"}
                            </span>
                            <FaPercent className="inline ml-3 mr-1 text-green-600" />
                            Pass %:{" "}
                            <span className="font-medium">
                              {x?.passPercentage ?? "—"}
                            </span>
                            <span className="ml-3">
                              Total Marks:{" "}
                              <span className="font-medium">
                                {x?.totalMarks ?? "—"}
                              </span>
                            </span>
                          </p>

                          <p className="text-sm text-gray-600">
                            Attempts:{" "}
                            <span className="font-medium">
                              {x?.attemptCount ?? 0}
                            </span>{" "}
                            / Allowed:{" "}
                            <span className="font-medium">
                              {x?.numberOfAttemptsAllowed ?? 1}
                            </span>{" "}
                            • Created By:{" "}
                            <span className="font-medium">{createdByName}</span>
                          </p>

                          {tags.length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {tags.join(", ")}
                            </p>
                          )}

                          {renderBadges(x)}
                        </div>

                        {view !== "list" && x?.instructions && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {x.instructions}
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
            <p className="text-center text-gray-600 mt-6">No exams found.</p>
          )}

          {/* ✅ Pagination styled like AllCategories */}
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

          {/* Page summary (kept, optional) */}
          <div className="mt-3 text-center text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold">
              {pageCountText.start}-{pageCountText.end}
            </span>{" "}
            of <span className="font-semibold">{meta.total}</span>
          </div>
        </>
      )}
    </div>
  );
}
