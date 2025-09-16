// src/pages/student/StudentDashboard.jsx

import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FiChevronDown,
  FiSearch,
  FiGrid,
  FiList,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiBookOpen,
  FiTrendingUp,
  FiAlertTriangle,
  FiPieChart,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
import globalBackendRoute from "../../config/Config";
import {
  getAuthorizationHeader,
  getTokenUserId,
} from "../../components/auth_components/AuthManager";

/* ---------------- Small UI Bits ---------------- */
const TabButton = memo(function TabButton({
  active,
  onClick,
  children,
  className = "",
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      } ${className}`}
    >
      {children}
    </button>
  );
});

const StatusBadge = memo(function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const Base = ({ tone, icon, text }) => (
    <span
      className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border shrink-0 ${tone}`}
    >
      {icon} {text}
    </span>
  );
  if (s === "completed")
    return (
      <Base
        tone="bg-green-50 text-green-700 border-green-200"
        icon={<FiCheckCircle aria-hidden />}
        text="Completed"
      />
    );
  if (s === "ongoing")
    return (
      <Base
        tone="bg-amber-50 text-amber-700 border-amber-200"
        icon={<FiClock aria-hidden />}
        text="Ongoing"
      />
    );
  return (
    <Base
      tone="bg-rose-50 text-rose-700 border-rose-200"
      icon={<FiXCircle aria-hidden />}
      text="Pending"
    />
  );
});

const CompletionPill = memo(function CompletionPill({ pct = 0 }) {
  const n = Math.max(0, Math.min(100, Number(pct || 0)));
  return (
    <span
      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border shrink-0 ${
        n === 100
          ? "bg-green-50 text-green-700 border-green-200"
          : n === 0
          ? "bg-gray-50 text-gray-600 border-gray-200"
          : "bg-sky-50 text-sky-700 border-sky-200"
      }`}
    >
      {n}% complete
    </span>
  );
});

/* ---------------- Helpers (normalizers & guards) ---------------- */
const API = `${globalBackendRoute}/api`;
const auth = () => ({ headers: { ...getAuthorizationHeader() } });

const firstNonEmpty = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

const safeId = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v) return v;
    if (typeof v === "object" && (v?._id || v?.id)) return v._id || v.id;
  }
  return null;
};

const normalizeDegree = (raw) => ({
  id: raw?._id || raw?.id || null,
  name:
    firstNonEmpty(raw?.name, raw?.title, raw?.degree_name, "Degree") ||
    "Degree",
});

const normalizeSemester = (raw) => ({
  id: raw?._id || raw?.id || null,
  name:
    firstNonEmpty(
      raw?.name,
      raw?.title,
      raw?.semester_name,
      raw?.slug && `Sem ${raw.slug}`,
      raw?.semNumber && `Sem ${raw.semNumber}`
    ) || "Semester",
  degreeId:
    safeId(raw, "degree", "degreeId", "program", "programId") ||
    (typeof raw?.degree === "string" && raw.degree) ||
    null,
});

const normalizeCourse = (raw) => ({
  id: raw?._id || raw?.id || null,
  title: firstNonEmpty(raw?.title, raw?.name, raw?.code, "Course") || "Course",
  degreeId:
    safeId(raw, "degree", "degreeId", "program", "programId") ||
    (typeof raw?.degree === "string" && raw.degree) ||
    null,
  semesterId:
    safeId(raw, "semester", "semesterId") ||
    (typeof raw?.semester === "string" && raw.semester) ||
    null,
  completion:
    Number(
      firstNonEmpty(
        raw?.completion,
        raw?.completionPercent,
        raw?.progressPercent,
        0
      )
    ) || 0,
});

const normalizeAssignmentActivity = (raw) => {
  const act = raw?.activity || {};
  const course = act?.course || raw?.course || {};
  const courseId =
    (typeof course === "object" && (course?._id || course?.id)) ||
    (typeof course === "string" && course) ||
    null;

  return {
    id:
      raw?._id ||
      raw?.id ||
      act?._id ||
      act?.id ||
      raw?.activityId ||
      "activity",
    title:
      firstNonEmpty(
        act?.title,
        act?.name,
        raw?.title,
        raw?.label,
        "Activity"
      ) || "Activity",
    status: (raw?.status || act?.status || "pending").toLowerCase(),
    courseId,
    due:
      firstNonEmpty(raw?.due, raw?.dueDate, act?.due, act?.dueDate, null) ||
      null,
  };
};

/* ------------------- Degree resolution (unchanged endpoints) ------------------- */
const fetchDegreeDetails = async (idOrSlug) => {
  try {
    const r1 = await axios.get(
      `${API}/get-degree-by-id/slug/${idOrSlug}`,
      auth()
    );
    const d = r1?.data?.data || r1?.data;
    if (d) return normalizeDegree(d);
  } catch {}
  try {
    const r2 = await axios.get(
      `${API}/get-degree-by-slug/slug/${idOrSlug}`,
      auth()
    );
    const d = r2?.data?.data || r2?.data;
    if (d) return normalizeDegree(d);
  } catch {}
  try {
    const r3 = await axios.get(`${API}/list-degrees?page=1&limit=2000`, auth());
    const list = Array.isArray(r3?.data?.data)
      ? r3.data.data
      : Array.isArray(r3?.data)
      ? r3.data
      : [];
    const found = list.find(
      (d) =>
        String(d?._id) === String(idOrSlug) ||
        String(d?.id) === String(idOrSlug) ||
        String(d?.slug) === String(idOrSlug) ||
        String(d?.code) === String(idOrSlug)
    );
    if (found) return normalizeDegree(found);
  } catch {}
  return normalizeDegree({ _id: idOrSlug, name: "Degree" });
};

const resolveDegreeForUser = async (uid, userObj) => {
  const idFromUser =
    safeId(userObj, "degree", "degreeId", "program", "programId") ||
    userObj?.degree ||
    userObj?.degreeId ||
    null;

  if (idFromUser) return await fetchDegreeDetails(idFromUser);

  try {
    const res = await axios.get(`${API}/list-admissions`, {
      params: {
        userId: uid,
        page: 1,
        limit: 1,
        sortBy: "createdAt",
        sortDir: "desc",
      },
      ...auth(),
    });
    const list = Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : [];
    const doc = list[0];
    const degId =
      safeId(doc?.intendedEnrollment, "degree") ||
      doc?.intendedEnrollment?.degree ||
      null;
    if (degId) return await fetchDegreeDetails(degId);
  } catch {}
  throw new Error("Degree not found for this user.");
};

/* ---------------- Main Component ---------------- */
export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Degree & Semesters
  const [degree, setDegree] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);

  // Courses & Activities
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Attendance & Gradebook (right panel)
  const [attendancePct, setAttendancePct] = useState(null);
  const [gradebook, setGradebook] = useState([]); // [{courseId, courseTitle, exams:[{examId, examTitle, marks, maxMarks}]}]
  const [gradebookOpen, setGradebookOpen] = useState(false);

  // “Current course” for the right panel
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Activities status tab (within section)
  const [activitiesTab, setActivitiesTab] = useState("ongoing"); // ongoing | completed | pending | all

  // Search (debounced for perf)
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 150);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Refs to scroll
  const topRef = useRef(null);
  const coursesRef = useRef(null);
  const activitiesRef = useRef(null);

  /* --------------------------- Load data chain --------------------------- */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const uid = getTokenUserId();
        if (!uid) throw new Error("Not logged in.");

        const userRes = await axios.get(`${API}/getUserById/${uid}`, auth());
        const user = userRes?.data?.data || userRes?.data || {};

        const degreeObj = await resolveDegreeForUser(uid, user);
        if (!degreeObj?.id) throw new Error("Degree not found for this user.");
        if (!alive) return;
        setDegree(degreeObj);

        const semRes = await axios.get(
          `${API}/semesters?page=1&limit=2000`,
          auth()
        );
        const semListRaw = Array.isArray(semRes?.data?.data)
          ? semRes.data.data
          : Array.isArray(semRes?.data)
          ? semRes.data
          : [];
        const allSem = semListRaw.map(normalizeSemester);
        const degSem = allSem.filter(
          (s) => String(s.degreeId) === String(degreeObj.id)
        );
        if (!alive) return;
        setSemesters(degSem);

        const firstSemId = degSem[0]?.id || null;
        setSelectedSemesterId((prev) => prev || firstSemId);

        const courseRes = await axios.get(
          `${API}/list-courses?page=1&limit=2000`,
          auth()
        );
        const courseRaw = Array.isArray(courseRes?.data?.data)
          ? courseRes.data.data
          : Array.isArray(courseRes?.data)
          ? courseRes.data
          : [];
        const allCourses = courseRaw.map(normalizeCourse);
        if (!alive) return;
        setCourses(allCourses);

        const aRes = await axios.get(`${API}/my-activity-assignments`, auth());
        const aRaw = Array.isArray(aRes?.data?.data)
          ? aRes.data.data
          : Array.isArray(aRes?.data)
          ? aRes.data
          : [];
        const myActs = aRaw.map(normalizeAssignmentActivity);
        if (!alive) return;
        setAssignments(myActs);
      } catch (e) {
        if (alive)
          setErr(
            e?.response?.data?.message ||
              e.message ||
              "Failed to load dashboard."
          );
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  /* --------------------------- Attendance & Gradebook fetch --------------------------- */
  useEffect(() => {
    let alive = true;

    const fetchAttendance = async () => {
      try {
        if (!selectedSemesterId) return;
        const res = await axios
          .get(
            `${API}/my-attendance-summary?semesterId=${selectedSemesterId}`,
            auth()
          )
          .catch(() => null);
        const pct =
          res?.data?.data?.percentage ??
          res?.data?.percentage ??
          res?.data?.pct ??
          null;
        if (alive) setAttendancePct(pct != null ? Number(pct) : null);
      } catch {
        if (alive) setAttendancePct(null);
      }
    };

    const fetchGradebook = async () => {
      try {
        if (!selectedSemesterId) return;

        const try1 = await axios
          .get(`${API}/my-gradebook?semesterId=${selectedSemesterId}`, auth())
          .catch(() => null);

        if (try1?.data) {
          const raw = Array.isArray(try1.data?.data)
            ? try1.data.data
            : Array.isArray(try1.data)
            ? try1.data
            : [];
          if (alive)
            setGradebook(
              raw.map((g) => ({
                courseId:
                  g.courseId ||
                  g.course?._id ||
                  g.course?.id ||
                  (typeof g.course === "string" ? g.course : null),
                courseTitle:
                  g.courseTitle ||
                  g.course?.title ||
                  g.course?.name ||
                  "Course",
                exams: (g.exams || []).map((e) => ({
                  examId: e.examId || e._id || e.id,
                  examTitle: e.title || e.name || "Exam",
                  marks: Number(e.marks ?? e.score ?? 0),
                  maxMarks: Number(e.maxMarks ?? e.total ?? 100),
                })),
              }))
            );
          return;
        }

        const courseIdsThisSem = new Set(
          courses
            .filter((c) => String(c.semesterId) === String(selectedSemesterId))
            .map((c) => String(c.id))
        );

        const exRes = await axios
          .get(`${API}/list-exams?page=1&limit=2000`, auth())
          .catch(() => null);
        const examsRaw = Array.isArray(exRes?.data?.data)
          ? exRes.data.data
          : Array.isArray(exRes?.data)
          ? exRes.data
          : [];

        const exams = examsRaw
          .map((e) => ({
            examId: e._id || e.id,
            examTitle: e.title || e.name || "Exam",
            courseId:
              safeId(e, "course", "courseId") ||
              (typeof e?.course === "string" ? e.course : null),
            maxMarks: Number(e.maxMarks ?? e.total ?? 100),
          }))
          .filter((e) => courseIdsThisSem.has(String(e.courseId)));

        const resultsRes = await axios
          .get(`${API}/my-exam-results?page=1&limit=5000`, auth())
          .catch(() => null);
        const resultsRaw = Array.isArray(resultsRes?.data?.data)
          ? resultsRes.data.data
          : Array.isArray(resultsRes?.data)
          ? resultsRes.data
          : [];

        const resultsMap = new Map();
        for (const r of resultsRaw) {
          const k =
            (r.exam?._id || r.exam?.id || r.examId || r.exam) + "::" + "me";
          resultsMap.set(k, Number(r.marks ?? r.score ?? 0));
        }

        const byCourse = new Map();
        for (const ex of exams) {
          const k = ex.courseId;
          if (!byCourse.has(k))
            byCourse.set(k, {
              courseId: k,
              courseTitle:
                courses.find((c) => String(c.id) === String(k))?.title ||
                "Course",
              exams: [],
            });
          const myMarks = resultsMap.get((ex.examId || "") + "::me") ?? null;
          byCourse.get(k).exams.push({
            examId: ex.examId,
            examTitle: ex.examTitle,
            marks: myMarks != null ? Number(myMarks) : 0,
            maxMarks: ex.maxMarks,
          });
        }

        if (alive) setGradebook([...byCourse.values()]);
      } catch {
        if (alive) setGradebook([]);
      }
    };

    fetchAttendance();
    fetchGradebook();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSemesterId, courses]);

  /* --------------------------- Derived / Filters -------------------------- */
  const degreeName = degree?.name || "Degree";

  const degreeSemesters = useMemo(() => semesters, [semesters]);

  const semesterCourses = useMemo(() => {
    if (!selectedSemesterId) return [];
    return courses.filter(
      (c) =>
        String(c.degreeId) === String(degree?.id) &&
        String(c.semesterId) === String(selectedSemesterId)
    );
  }, [courses, selectedSemesterId, degree?.id]);

  // Pick a current course (for right panel). Default to the first filtered one.
  useEffect(() => {
    if (!semesterCourses.length) {
      setSelectedCourseId(null);
      return;
    }
    if (!selectedCourseId) {
      setSelectedCourseId(semesterCourses[0].id);
    } else {
      const stillThere = semesterCourses.some(
        (c) => String(c.id) === String(selectedCourseId)
      );
      if (!stillThere) setSelectedCourseId(semesterCourses[0].id);
    }
  }, [semesterCourses, selectedCourseId]);

  const filteredCourses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return semesterCourses;
    return semesterCourses.filter((c) =>
      c.title.toLowerCase().includes(needle)
    );
  }, [semesterCourses, search]);

  const searchActivities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return assignments;
    return assignments.filter((a) => a.title.toLowerCase().includes(needle));
  }, [assignments, search]);

  const semesterCourseIds = useMemo(
    () => new Set(semesterCourses.map((c) => String(c.id))),
    [semesterCourses]
  );

  const semesterActivities = useMemo(
    () =>
      searchActivities.filter((a) => semesterCourseIds.has(String(a.courseId))),
    [searchActivities, semesterCourseIds]
  );

  const tabbedActivities = useMemo(() => {
    const tab = String(activitiesTab || "").toLowerCase();
    if (tab === "all") return semesterActivities;
    return semesterActivities.filter((a) => String(a.status) === tab);
  }, [activitiesTab, semesterActivities]);

  // Right pane stats
  const completedCount = useMemo(
    () => semesterActivities.filter((a) => a.status === "completed").length,
    [semesterActivities]
  );
  const ongoingCount = useMemo(
    () => semesterActivities.filter((a) => a.status === "ongoing").length,
    [semesterActivities]
  );
  const pendingCount = useMemo(
    () => semesterActivities.filter((a) => a.status === "pending").length,
    [semesterActivities]
  );
  const incompleteCount = ongoingCount;
  const atRiskCount = pendingCount;

  const currentCourse = useMemo(
    () =>
      semesterCourses.find((c) => String(c.id) === String(selectedCourseId)) ||
      null,
    [semesterCourses, selectedCourseId]
  );

  /* --------------------------- Renderers --------------------------- */
  const ActivityCard = memo(function ActivityCard({ item }) {
    return (
      <div className="border rounded-lg p-3 sm:p-4 bg-white flex justify-between items-start min-w-0 hover:shadow-sm transition-shadow overflow-hidden">
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate break-words">
            {item.title}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="text-[10px] sm:text-xs text-gray-500 shrink-0 ml-2"
            title={String(item.id)}
          >
            #{String(item.id).slice(0, 8)}
          </div>
          <StatusBadge status={item.status} />
        </div>
      </div>
    );
  });

  const ActivityRow = memo(function ActivityRow({ item }) {
    return (
      <div className="grid grid-cols-12 gap-2 sm:gap-3 border-b py-2.5 sm:py-3 items-center">
        <div className="col-span-12 sm:col-span-7 text-gray-900 font-medium truncate break-words min-w-0">
          {item.title}
        </div>
        <div className="col-span-6 sm:col-span-2 text-xs text-gray-600">
          {item.due ? new Date(item.due).toLocaleDateString() : "—"}
        </div>
        <div className="col-span-6 sm:col-span-3 flex justify-end sm:justify-start">
          <StatusBadge status={item.status} />
        </div>
      </div>
    );
  });

  const CourseCard = memo(function CourseCard({ c }) {
    const width = Math.max(0, Math.min(100, c.completion));
    const isSelected = String(c.id) === String(selectedCourseId);
    return (
      <button
        type="button"
        onClick={() => setSelectedCourseId(c.id)}
        className={`text-left border rounded-lg p-3 sm:p-4 bg-white min-w-0 hover:shadow-sm transition-shadow w-full overflow-hidden ${
          isSelected ? "ring-2 ring-indigo-400" : ""
        }`}
      >
        <div className="font-medium text-gray-900 truncate flex items-center gap-2 min-w-0">
          {isSelected ? (
            <FiChevronRight className="text-indigo-500 shrink-0" />
          ) : (
            <FiChevronLeft className="text-transparent shrink-0" />
          )}
          <span className="truncate break-words min-w-0">{c.title}</span>
        </div>
        <div className="mt-2">
          <CompletionPill pct={c.completion} />
        </div>
        <div className="mt-2 w-full bg-gray-100 h-2 rounded overflow-hidden">
          <div
            className={`h-2 ${
              c.completion === 100 ? "bg-green-500" : "bg-indigo-500"
            }`}
            style={{ width: `${width}%` }}
          />
        </div>
      </button>
    );
  });

  const StatCard = ({ icon, label, value, tone }) => {
    const tones = {
      good: "bg-green-50 text-green-700 border-green-200",
      warn: "bg-amber-50 text-amber-700 border-amber-200",
      bad: "bg-rose-50 text-rose-700 border-rose-200",
      base: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return (
      <div
        className={`flex items-center gap-2 sm:gap-3 border rounded-lg px-2.5 sm:px-3 py-2 ${
          tones[tone] || tones.base
        }`}
      >
        <div className="text-lg sm:text-xl shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-xs">{label}</div>
          <div className="text-sm sm:text-lg font-semibold leading-tight">
            {value}
          </div>
        </div>
      </div>
    );
  };

  const RightPane = () => (
    <aside className="w-full lg:w-[32%] xl:w-[30%] 2xl:w-[28%] flex-shrink-0 space-y-3 sm:space-y-4 min-w-0">
      {/* Degree & Semester */}
      <div className="border rounded-xl bg-white p-3 sm:p-4 md:p-5 overflow-hidden">
        <div className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500 mb-1">
          Program
        </div>
        <div className="text-sm sm:text-base font-semibold text-gray-900 truncate break-words">
          {degreeName}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-gray-500">Semester</span>
          <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
            {degreeSemesters.find((s) => s.id === selectedSemesterId)?.name ||
              "—"}
          </span>
        </div>
      </div>

      {/* Current Course */}
      <div className="border rounded-xl bg-white p-3 sm:p-4 md:p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FiBookOpen className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Current Course
            </h3>
          </div>
          {currentCourse && <CompletionPill pct={currentCourse.completion} />}
        </div>
        <div className="text-sm sm:text-base font-medium text-gray-900 truncate break-words">
          {currentCourse ? currentCourse.title : "—"}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          {semesterCourses.length} course
          {semesterCourses.length === 1 ? "" : "s"} this semester
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<FiCheckCircle />}
          label="Completed"
          value={completedCount}
          tone="good"
        />
        <StatCard
          icon={<FiTrendingUp />}
          label="Incomplete"
          value={incompleteCount}
          tone="warn"
        />
        <StatCard
          icon={<FiAlertTriangle />}
          label="At Risk"
          value={atRiskCount}
          tone="bad"
        />
      </div>

      {/* Attendance */}
      <div className="border rounded-xl bg-white p-3 sm:p-4 md:p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-900">Attendance</div>
          <FiPieChart className="text-gray-500" />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm text-gray-600">
            Overall attendance
          </div>
          <div className="text-sm sm:text-lg font-semibold text-gray-900">
            {attendancePct != null ? `${Math.round(attendancePct)}%` : "—"}
          </div>
        </div>
        <div className="mt-3 w-full bg-gray-100 h-2 rounded overflow-hidden">
          <div
            className="h-2 bg-indigo-500"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, Number(attendancePct || 0))
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Gradebook Accordion */}
      <div className="border rounded-xl bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setGradebookOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3"
        >
          <span className="text-sm font-semibold text-gray-900">Gradebook</span>
          <FiChevronDown
            className={`transition-transform ${
              gradebookOpen ? "rotate-180" : ""
            } text-gray-500`}
          />
        </button>
        {gradebookOpen && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            {gradebook.length === 0 && (
              <div className="text-sm text-gray-500">No grades yet.</div>
            )}
            <div className="space-y-3">
              {gradebook.map((g) => (
                <div
                  key={g.courseId}
                  className="border rounded-lg p-3 overflow-hidden"
                >
                  <div className="text-xs sm:text-sm font-medium text-gray-900 mb-2 truncate break-words">
                    {courses.find((c) => String(c.id) === String(g.courseId))
                      ?.title ?? g.courseTitle}
                  </div>
                  {g.exams?.length ? (
                    <div className="space-y-2">
                      {g.exams.map((e) => {
                        const pct =
                          e.maxMarks > 0
                            ? Math.round(
                                (Number(e.marks || 0) / e.maxMarks) * 100
                              )
                            : 0;
                        return (
                          <div
                            key={e.examId}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] sm:text-xs text-gray-700 truncate break-words">
                                {e.examTitle}
                              </div>
                            </div>
                            <div className="text-[11px] sm:text-xs text-gray-500 shrink-0">
                              {e.marks}/{e.maxMarks} ({pct}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] sm:text-xs text-gray-500">
                      No exams.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  /* --------------------------- UI --------------------------- */
  if (loading) {
    return (
      <div className="container mx-auto w-full px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <header className="mb-4">
          <div className="h-7 sm:h-8 w-44 sm:w-56 bg-gray-200 rounded animate-pulse" />
        </header>
        <div className="border rounded-xl bg-white p-3 sm:p-4 md:p-5 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-9 sm:h-10 w-full bg-gray-100 rounded" />
            <div className="h-20 sm:h-24 w-full bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container mx-auto w-full px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <div className="border rounded-xl bg-white p-4">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200 break-words">
            {err}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={topRef}
      className="container mx-auto w-full px-3 sm:px-4 md:px-6 py-4 md:py-6"
    >
      {/* Header */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 break-words">
        Student Dashboard
      </h1>

      {/* Sticky toolbar */}
      <div
        className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border rounded-xl shadow-sm px-2.5 sm:px-3 md:px-4 py-2 mb-4 sm:mb-6 overflow-x-auto"
        role="navigation"
        aria-label="Dashboard toolbar"
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
          {/* Degree name */}
          <span className="text-sm md:text-base font-semibold text-gray-900 truncate break-words max-w-[60%] sm:max-w-none">
            {degreeName}
          </span>

          <span className="hidden md:inline text-gray-300">•</span>

          {/* Semester dropdown */}
          <div className="relative">
            <select
              value={selectedSemesterId || ""}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="appearance-none pr-8 pl-3 py-1.5 sm:py-2 rounded border text-xs sm:text-sm bg-white hover:border-gray-400 cursor-pointer max-w-full sm:max-w-[240px]"
              title="Select semester"
            >
              {degreeSemesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>

          <span className="hidden sm:inline text-gray-300">|</span>

          {/* In-page links */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
              onClick={() =>
                topRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Overview
            </button>
            <button
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
              onClick={() =>
                coursesRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Courses
            </button>
            <button
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
              onClick={() =>
                activitiesRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            >
              Activities
            </button>
          </div>

          {/* External pages */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/grade-book"
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              Grade Book
            </Link>
            <Link
              to="/attendance"
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              Attendance
            </Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-full sm:w-64 md:w-72 max-w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses or activities…"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="w-full rounded-full border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400"
              aria-label="Search courses or activities"
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: 2-column responsive layout */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 min-w-0">
        {/* LEFT: content */}
        <main className="w-full lg:flex-1 space-y-3 sm:space-y-4 min-w-0">
          {/* ---------------- COURSES SECTION ---------------- */}
          <section
            ref={coursesRef}
            className="border rounded-xl bg-white p-3 sm:p-4 md:p-5 overflow-hidden scroll-mt-24"
          >
            <div className="flex items-center justify-between min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate break-words">
                {degreeSemesters.find((s) => s.id === selectedSemesterId)
                  ?.name || "Semester"}{" "}
                • Courses
              </h2>
            </div>
            <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredCourses.map((c) => (
                <CourseCard key={c.id} c={c} />
              ))}
              {filteredCourses.length === 0 && (
                <div className="text-sm text-gray-500">No courses found.</div>
              )}
            </div>
          </section>

          {/* ---------------- ACTIVITIES SECTION ---------------- */}
          <section
            ref={activitiesRef}
            className="border rounded-xl bg-white p-3 sm:p-4 md:p-5 overflow-hidden scroll-mt-24"
          >
            <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Activities
              </h2>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {["ongoing", "completed", "pending", "all"].map((k) => (
                  <TabButton
                    key={k}
                    active={activitiesTab === k}
                    onClick={() => setActivitiesTab(k)}
                  >
                    {k[0].toUpperCase() + k.slice(1)}
                  </TabButton>
                ))}
              </div>
            </div>

            {/* Card grid for mobile, rows for wider screens */}
            <div className="mt-3 sm:mt-4 block sm:hidden">
              <div className="grid grid-cols-1 gap-2.5">
                {tabbedActivities.map((a) => (
                  <ActivityCard key={a.id} item={a} />
                ))}
                {tabbedActivities.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No activities found.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 sm:mt-4 hidden sm:block">
              <div className="grid grid-cols-12 gap-2 sm:gap-3 border-b pb-2 text-[11px] sm:text-xs text-gray-500">
                <div className="col-span-7">Title</div>
                <div className="col-span-2">Due</div>
                <div className="col-span-3">Status</div>
              </div>
              <div className="min-w-0">
                {tabbedActivities.map((a) => (
                  <ActivityRow key={a.id} item={a} />
                ))}
                {tabbedActivities.length === 0 && (
                  <div className="text-sm text-gray-500 mt-2">
                    No activities found.
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* RIGHT: panel */}
        <RightPane />
      </div>
    </div>
  );
}
