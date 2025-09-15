import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
  FaQuestionCircle,
  FaCalendar,
  FaUser,
  FaTags,
  FaUniversity,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaBolt,
  FaCopy,
  FaFilter,
  FaRedoAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

/** Match your model enums exactly */
const QUESTION_TYPES = [
  { value: "", label: "All Types" },
  { value: "mcq", label: "MCQ" },
  { value: "theory", label: "Theory" },
  { value: "programming", label: "Programming" },
  { value: "true_false", label: "True / False" },
  { value: "direct", label: "Direct Q&A" },
];

const DIFFICULTIES = [
  { value: "", label: "All Difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const prettyDiff = (d) =>
  !d ? "—" : { easy: "Easy", medium: "Medium", hard: "Hard" }[d] || d;

export default function AllQuestions() {
  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination (default 3/page)
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

  // lookup maps for rendering
  const [degreeMap, setDegreeMap] = useState({});
  const [semesterMap, setSemesterMap] = useState({});
  const [courseMap, setCourseMap] = useState({});
  const [quizMap, setQuizMap] = useState({});
  const [examMap, setExamMap] = useState({});
  const [userMap, setUserMap] = useState({});

  // cascading lists
  const [degreeList, setDegreeList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [quizList, setQuizList] = useState([]);
  const [examList, setExamList] = useState([]);

  // filters
  const [filters, setFilters] = useState({
    degreeId: "",
    semesterId: "",
    courseId: "",
    quizId: "",
    examId: "",
    question_type: "",
    difficultyLevel: "",
    status: "",
    isActive: "", // "", "true", "false"
  });

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

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

  // Reset pagination when inputs change
  useEffect(() => setPage(1), [searchTerm, pageSize, filters]);

  /** Load initial Degrees and Users */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [degRes, usersRes] = await Promise.allSettled([
          axios.get(`${globalBackendRoute}/api/list-degrees`, {
            params: { page: 1, limit: 1000 },
          }),
          axios
            .get(`${globalBackendRoute}/api/get-instructors`)
            .catch(() => ({ data: { data: [] } })),
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

        if (usersRes.status === "fulfilled") {
          const ulist =
            usersRes.value?.data?.data || usersRes.value?.data || [];
          const umap = {};
          (Array.isArray(ulist) ? ulist : []).forEach((u) => {
            umap[u._id || u.id] = u.name || u.fullName || u.email || "User";
          });
          setUserMap(umap);
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
    setQuizList([]);
    setExamList([]);
    setFilters((f) => ({
      ...f,
      semesterId: "",
      courseId: "",
      quizId: "",
      examId: "",
    }));

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
    setQuizList([]);
    setExamList([]);
    setFilters((f) => ({ ...f, courseId: "", quizId: "", examId: "" }));

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

  /** Course -> Quizzes + Exams */
  useEffect(() => {
    let alive = true;

    setQuizList([]);
    setExamList([]);
    setFilters((f) => ({ ...f, quizId: "", examId: "" }));

    if (!filters.courseId) {
      setQuizMap({});
      setExamMap({});
      return;
    }

    (async () => {
      try {
        // quizzes by course
        const quizPromise = axios
          .get(
            `${globalBackendRoute}/api/list-quizzes-by-course/${filters.courseId}`
          )
          .catch(() => ({ data: { data: [] } }));

        // exams by degree+semester+course
        const examPromise =
          filters.degreeId && filters.semesterId && filters.courseId
            ? axios
                .get(
                  `${globalBackendRoute}/api/get-by-degree-semester-course/${filters.degreeId}/${filters.semesterId}/${filters.courseId}`
                )
                .catch(() => ({ data: { data: [] } }))
            : Promise.resolve({ data: { data: [] } });

        const [quizRes, examRes] = await Promise.all([
          quizPromise,
          examPromise,
        ]);

        if (!alive) return;

        const qList = quizRes?.data?.data || [];
        const eList = examRes?.data?.data || [];
        const quizzes = Array.isArray(qList) ? qList : [];
        const exams = Array.isArray(eList) ? eList : [];

        setQuizList(quizzes);
        setExamList(exams);

        const qMap = {};
        quizzes.forEach((q) => {
          qMap[q._id || q.id] = q.title || q.name || "Quiz";
        });
        setQuizMap(qMap);

        const eMap = {};
        exams.forEach((e) => {
          eMap[e._id || e.id] = e.title || e.name || "Exam";
        });
        setExamMap(eMap);
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.courseId]);

  /** Fetch Questions with all active filters */
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

        // cascading filters
        if (filters.degreeId) params.degreeId = filters.degreeId;
        if (filters.semesterId) params.semesterId = filters.semesterId;
        if (filters.courseId) params.courseId = filters.courseId;
        if (filters.quizId) params.quizId = filters.quizId;
        if (filters.examId) params.examId = filters.examId;

        // question attributes (model names + compat aliases)
        if (filters.question_type) {
          params.question_type = filters.question_type;
          params.type = filters.question_type; // compatibility
        }
        if (filters.difficultyLevel) {
          params.difficultyLevel = filters.difficultyLevel;
          params.difficulty = filters.difficultyLevel; // compatibility
        }
        if (filters.status) params.status = filters.status;
        if (filters.isActive !== "") params.isActive = filters.isActive; // "true"/"false"

        const res = await axios.get(
          `${globalBackendRoute}/api/list-questions`,
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
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching questions:", err);
        setFetchError(
          "Questions data not yet created or unavailable. Please add some questions."
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

  // actions
  const deleteQuestion = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete this question?\nThis action cannot be undone.`
    );
    if (!ok) return;
    try {
      const res = await axios.delete(
        `${globalBackendRoute}/api/delete-question/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Question deleted successfully.");
      } else {
        throw new Error("Failed to delete question.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete question."
      );
    }
  };

  const toggleActive = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/toggle-active/${id}`
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

  const duplicateQuestion = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.post(
        `${globalBackendRoute}/api/duplicate-question/${id}`
      );
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Question duplicated.");
      } else {
        throw new Error("Duplicate failed");
      }
    } catch (err) {
      console.error("Duplicate failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const renderBadges = (q) => {
    const active = q?.isActive;
    const status = q?.status || "draft";
    const qType = q?.question_type || "—";
    const difficulty = prettyDiff(q?.difficultyLevel);
    const marks =
      Number.isFinite(Number(q?.marks_alloted)) || q?.marks_alloted === 0
        ? q?.marks_alloted
        : "—";
    const neg =
      Number.isFinite(Number(q?.negativeMarkPerQuestion)) ||
      q?.negativeMarkPerQuestion === 0
        ? q?.negativeMarkPerQuestion
        : null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <span
          className={`inline-flex items-center text-xs px-2 py-1 rounded ${
            active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
          title={active ? "Active" : "Inactive"}
        >
          {active ? (
            <FaCheckCircle className="mr-1" />
          ) : (
            <FaTimesCircle className="mr-1" />
          )}
          {active ? "Active" : "Inactive"}
        </span>

        <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          <FaBolt className="mr-1" />
          {status}
        </span>

        <span className="inline-block text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700">
          {qType}
        </span>

        <span className="inline-block text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
          Difficulty: {difficulty}
        </span>

        <span className="inline-block text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
          Marks: {marks}
          {neg != null ? ` (−${neg})` : ""}
        </span>
      </div>
    );
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
      quizId: "",
      examId: "",
      question_type: "",
      difficultyLevel: "",
      status: "",
      isActive: "",
    });

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Questions</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search by text, tags, keywords (e.g., 'MCA', 'true/false')"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} questions
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
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
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

          {/* Quiz (depends on Course) */}
          <FilterSelect
            label="Quiz"
            value={filters.quizId}
            onChange={(v) => setFilters((f) => ({ ...f, quizId: v }))}
            options={quizList}
            disabled={!filters.courseId}
            getOption={(qz) => ({
              id: qz._id || qz.id,
              name: qz.title || qz.name || "Quiz",
            })}
          />

          {/* Exam (depends on Degree+Semester+Course) */}
          <FilterSelect
            label="Exam"
            value={filters.examId}
            onChange={(v) => setFilters((f) => ({ ...f, examId: v }))}
            options={examList}
            disabled={
              !filters.degreeId || !filters.semesterId || !filters.courseId
            }
            getOption={(ex) => ({
              id: ex._id || ex.id,
              name: ex.title || ex.name || "Exam",
            })}
          />

          {/* Question attribute filters */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Type</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.question_type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, question_type: e.target.value }))
              }
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value || "all"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Difficulty</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.difficultyLevel}
              onChange={(e) =>
                setFilters((f) => ({ ...f, difficultyLevel: e.target.value }))
              }
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value || "all"} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

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

          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Active</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.isActive}
              onChange={(e) =>
                setFilters((f) => ({ ...f, isActive: e.target.value }))
              }
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
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
        <p className="text-center text-gray-600 mt-6">Loading questions…</p>
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
            {rows.map((q) => {
              const created =
                q?.createdAt &&
                new Date(q.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              const listLayout = view === "list";
              const qId = q?._id || q?.id;

              const degreeName =
                degreeMap[q?.degree] ||
                (typeof q?.degree === "object" &&
                  (q?.degree?.name || q?.degree?.title)) ||
                (typeof q?.degree === "string" ? shortId(q.degree) : "—");

              const semesterName =
                semesterMap[q?.semester] ||
                (typeof q?.semester === "object" &&
                  (q?.semester?.title ||
                    q?.semester?.semester_name ||
                    (q?.semester?.semNumber
                      ? `Semester ${q?.semester?.semNumber}`
                      : ""))) ||
                (typeof q?.semester === "string" ? shortId(q.semester) : "—");

              const courseName =
                courseMap[q?.course] ||
                (typeof q?.course === "object" &&
                  (q?.course?.title || q?.course?.name)) ||
                (typeof q?.course === "string" ? shortId(q.course) : "—");

              const quizName =
                quizMap[q?.quiz] ||
                (typeof q?.quiz === "object" &&
                  (q?.quiz?.title || q?.quiz?.name)) ||
                (typeof q?.quiz === "string" ? shortId(q.quiz) : "—");

              const examName =
                examMap[q?.exam] ||
                (typeof q?.exam === "object" &&
                  (q?.exam?.title || q?.exam?.name)) ||
                (typeof q?.exam === "string" ? shortId(q.exam) : "—");

              const authorName =
                userMap[q?.createdBy] ||
                (typeof q?.createdBy === "object" &&
                  (q?.createdBy?.name ||
                    q?.createdBy?.fullName ||
                    q?.createdBy?.email)) ||
                (typeof q?.createdBy === "string" ? shortId(q.createdBy) : "—");

              // counts per your schema
              const optionsCount =
                q?.question_type === "mcq" && Array.isArray(q?.options)
                  ? q.options.length
                  : q?.question_type === "true_false"
                  ? 2
                  : 0;

              const correctCount =
                q?.question_type === "mcq" &&
                typeof q?.correctOptionIndex === "number"
                  ? 1
                  : q?.question_type === "true_false" &&
                    typeof q?.correctBoolean === "boolean"
                  ? 1
                  : 0;

              const path = `/single-question/${qId}`;

              return (
                <div key={qId} className="relative">
                  {/* Row actions */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <button
                      title="Toggle Active"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={(e) => toggleActive(e, qId)}
                    >
                      A
                    </button>
                    <button
                      title="Duplicate"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-indigo-50 text-indigo-600"
                      onClick={(e) => duplicateQuestion(e, qId)}
                    >
                      <FaCopy className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete question"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={(e) => deleteQuestion(e, qId)}
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
                          <FaQuestionCircle />
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
                          {/* TITLE — uses your schema field */}
                          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {q?.question_text || "Untitled Question"}
                          </h3>

                          {/* ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {qId}
                            </code>
                          </p>

                          {created && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {created}
                            </p>
                          )}

                          {/* Author, type, difficulty */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUser className="mr-1 text-red-500" />
                            <span className="truncate">
                              <span className="font-medium">Author:</span>{" "}
                              {authorName}{" "}
                              <span className="ml-2 font-medium">Type:</span>{" "}
                              {q?.question_type || "—"}{" "}
                              <span className="ml-2 font-medium">
                                Difficulty:
                              </span>{" "}
                              {prettyDiff(q?.difficultyLevel)}
                            </span>
                          </p>

                          {/* Degree / Semester */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUniversity className="mr-1 text-indigo-500" />
                            <span className="truncate">
                              <span className="font-medium">Degree:</span>{" "}
                              {degreeName}{" "}
                              {q?.degree && (
                                <span className="text-xs text-gray-500">
                                  (
                                  {typeof q?.degree === "string"
                                    ? q?.degree
                                    : q?.degree?._id || q?.degree?.id || "—"}
                                  )
                                </span>
                              )}
                              {semesterName ? (
                                <>
                                  <span className="ml-2 font-medium">
                                    Semester:
                                  </span>{" "}
                                  {semesterName}{" "}
                                  {q?.semester && (
                                    <span className="text-xs text-gray-500">
                                      (
                                      {typeof q?.semester === "string"
                                        ? q?.semester
                                        : q?.semester?._id ||
                                          q?.semester?.id ||
                                          "—"}
                                      )
                                    </span>
                                  )}
                                </>
                              ) : null}
                            </span>
                          </p>

                          {/* Course / Quiz / Exam */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaClipboardList className="mr-1 text-green-600" />
                            <span className="truncate">
                              <span className="font-medium">Course:</span>{" "}
                              {courseName}{" "}
                              {q?.course && (
                                <span className="text-xs text-gray-500">
                                  (
                                  {typeof q?.course === "string"
                                    ? q?.course
                                    : q?.course?._id || q?.course?.id || "—"}
                                  )
                                </span>
                              )}
                              <span className="ml-2 font-medium">Quiz:</span>{" "}
                              {quizName}{" "}
                              {q?.quiz && (
                                <span className="text-xs text-gray-500">
                                  (
                                  {typeof q?.quiz === "string"
                                    ? q?.quiz
                                    : q?.quiz?._id || q?.quiz?.id || "—"}
                                  )
                                </span>
                              )}
                              <span className="ml-2 font-medium">Exam:</span>{" "}
                              {examName}{" "}
                              {q?.exam && (
                                <span className="text-xs text-gray-500">
                                  (
                                  {typeof q?.exam === "string"
                                    ? q?.exam
                                    : q?.exam?._id || q?.exam?.id || "—"}
                                  )
                                </span>
                              )}
                            </span>
                          </p>

                          {/* Options / Correct / Marks */}
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Options:</span>{" "}
                            {optionsCount || "—"}{" "}
                            <span className="ml-2 font-medium">Correct:</span>{" "}
                            {correctCount || "—"}{" "}
                            <span className="ml-2 font-medium">Marks:</span>{" "}
                            {Number.isFinite(Number(q?.marks_alloted)) ||
                            q?.marks_alloted === 0
                              ? q?.marks_alloted
                              : "—"}
                          </p>

                          {/* tags */}
                          {toTags(q?.tags).length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {toTags(q?.tags).join(", ")}
                            </p>
                          )}

                          {renderBadges(q)}
                        </div>

                        {/* Explanation (optional) */}
                        {view !== "list" && q?.explanation && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {q.explanation}
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
              No questions found. Adjust filters or create new questions.
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
