import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import axios from "axios";
import {
  FiChevronDown,
  FiSearch,
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

import { NavLink, Link } from "react-router-dom";

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

const firstId = (v) =>
  Array.isArray(v) && v.length ? String(v[0]) : v ? String(v) : null;

const mapStatus = (s) => {
  const t = String(s || "").toLowerCase();
  if (t === "completed") return "completed";
  if (t === "inprogress" || t === "ongoing" || t === "new") return "ongoing";
  return "pending";
};

// helper to pull a number out of a string (e.g., "Semester 3" -> 3)
const extractNum = (v) => {
  const m = String(v ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
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
  order:
    (raw?.semNumber != null ? Number(raw.semNumber) : null) ??
    extractNum(raw?.slug) ??
    extractNum(raw?.name) ??
    9999,
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

/* per-user assignment -> ALWAYS key by underlying activity id */
const normalizeAssignmentActivity = (raw) => {
  const act = raw?.activity || {};
  const ctx = act?.context || {};
  const activityId = act?._id || act?.id || raw?.activityId || null;
  return {
    id: String(activityId || "activity"),
    title:
      firstNonEmpty(
        act?.title,
        act?.name,
        raw?.title,
        raw?.label,
        "Activity"
      ) || "Activity",
    status: mapStatus(raw?.status || act?.status),
    degreeId: firstId(ctx.degrees),
    semesterId: firstId(ctx.semesters),
    due: act?.endAt || ctx?.endAt || null,
  };
};

/* direct activity (role-targeted, from /list-activities) */
const normalizeActivity = (raw) => {
  const ctx = raw?.context || {};
  const now = Date.now();
  const start = raw?.startAt ? new Date(raw.startAt).getTime() : null;
  const end = raw?.endAt ? new Date(raw.endAt).getTime() : null;

  let status = "pending";
  if (String(raw?.status).toLowerCase() === "published") {
    const hasStarted = start == null || now >= start;
    const notEnded = end == null || now <= end;
    status = hasStarted && notEnded ? "ongoing" : "pending";
  }

  return {
    id: raw?._id || raw?.id || "activity",
    title: firstNonEmpty(raw?.title, "Activity") || "Activity",
    status,
    degreeId: firstId(ctx.degrees),
    semesterId: firstId(ctx.semesters),
    due: raw?.endAt || ctx?.endAt || null,
  };
};

/* degree resolution (unchanged endpoints) */
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

  // Courses (for the left section UI)
  const [courses, setCourses] = useState([]);

  // Activities
  const [assignmentActivities, setAssignmentActivities] = useState([]); // /my-activity-assignments
  const [roleActivities, setRoleActivities] = useState([]); // /list-activities (roles=student, degree, semester)
  const [activitiesTab, setActivitiesTab] = useState("ongoing"); // ongoing | completed | pending | all

  // Attendance & Gradebook (right panel)
  const [attendancePct, setAttendancePct] = useState(null);
  const [gradebook, setGradebook] = useState([]);
  const [gradebookOpen, setGradebookOpen] = useState(false);

  // “Current course” (left section)
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Search (debounced)
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");

  // Active attendance links for this student's cohort context
  const [activeLinks, setActiveLinks] = useState([]);

  // keep search input responsive
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 150);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Refs to scroll
  const topRef = useRef(null);
  const coursesRef = useRef(null);
  const activitiesRef = useRef(null);

  /* --------------------------- Initial load --------------------------- */
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

        // Semesters for this degree (SORT and pick Sem 1 by default)
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
        const degSem = allSem
          .filter((s) => String(s.degreeId) === String(degreeObj.id))
          .sort(
            (a, b) =>
              (a.order ?? 9999) - (b.order ?? 9999) ||
              String(a.name).localeCompare(String(b.name))
          );
        if (!alive) return;
        setSemesters(degSem);

        // Choose Semester 1 if present; else first in sorted list
        const sem1 = degSem.find((s) => s.order === 1);
        const defaultSemId = sem1?.id ?? degSem[0]?.id ?? null;
        setSelectedSemesterId((prev) => prev || defaultSemId);

        // Courses (UI only)
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

        // Per-user assignments
        const aRes = await axios.get(`${API}/my-activity-assignments`, auth());
        const aRaw = Array.isArray(aRes?.data?.data)
          ? aRes.data.data
          : Array.isArray(aRes?.data)
          ? aRes.data
          : [];
        const myActs = aRaw.map(normalizeAssignmentActivity);
        if (!alive) return;
        setAssignmentActivities(myActs);
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

  /* -------- Fetch role-targeted activities for selected degree + semester ------- */
  useEffect(() => {
    let alive = true;
    const fetchRoleActivities = async () => {
      try {
        if (!degree?.id || !selectedSemesterId) return;
        const params = {
          page: 1,
          limit: 2000,
          audienceType: "roles",
          roles: "student",
          role: "student",
          status: "published",
          degreeId: degree.id,
          semesterId: selectedSemesterId,
        };
        const lr = await axios.get(`${API}/list-activities`, {
          params,
          ...auth(),
        });
        const lraw = Array.isArray(lr?.data?.data)
          ? lr.data.data
          : Array.isArray(lr?.data)
          ? lr.data
          : [];
        const acts = lraw.map(normalizeActivity);
        if (alive) setRoleActivities(acts);
      } catch {
        if (alive) setRoleActivities([]);
      }
    };
    fetchRoleActivities();
    return () => {
      alive = false;
    };
  }, [degree?.id, selectedSemesterId]);

  /* -------------------- Active attendance links for cohort -------------------- */
  useEffect(() => {
    let alive = true;
    const loadActive = async () => {
      try {
        if (!degree?.id || !selectedSemesterId) return;

        const params = new URLSearchParams({
          activeNow: "true",
          degreeId: degree.id,
          semesterId: selectedSemesterId,
        });
        if (selectedCourseId) params.set("courseId", selectedCourseId);

        // This endpoint returns active links within the window (validFrom/validTo and isActive=true)
        const res = await axios.get(
          `${API}/list-links?` + params.toString(),
          auth()
        );
        const arr = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];
        if (alive) setActiveLinks(arr);
      } catch {
        if (alive) setActiveLinks([]);
      }
    };
    loadActive();
    return () => {
      alive = false;
    };
  }, [degree?.id, selectedSemesterId, selectedCourseId]);

  /* --------------------------- Attendance & Gradebook fetch --------------------------- */
  useEffect(() => {
    let alive = true;

    const fetchAttendance = async () => {
      try {
        if (!selectedSemesterId) return;
        const uid = getTokenUserId(); // << include the logged-in student's id
        const res = await axios
          .get(
            `${API}/my-attendance-summary?semesterId=${selectedSemesterId}${
              uid ? `&studentId=${uid}` : ""
            }`,
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

        if (alive) setGradebook([]);
      } catch {
        if (alive) setGradebook([]);
      }
    };

    fetchAttendance();
    fetchGradebook();

    return () => {
      alive = false;
    };
  }, [selectedSemesterId]);

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

  // Merge activities (dedupe by id). Per-user assignment records overwrite role items.
  const allActivities = useMemo(() => {
    const map = new Map();
    for (const a of roleActivities) {
      if (a?.id) map.set(String(a.id), a);
    }
    for (const a of assignmentActivities) {
      if (a?.id) map.set(String(a.id), a);
    }
    return [...map.values()];
  }, [roleActivities, assignmentActivities]);

  // STRICT degree + semester filter (no course dependency)
  const degreeSemesterActivities = useMemo(() => {
    return allActivities.filter(
      (a) =>
        String(a.degreeId || "") === String(degree?.id || "") &&
        String(a.semesterId || "") === String(selectedSemesterId || "")
    );
  }, [allActivities, degree?.id, selectedSemesterId]);

  // Search
  const searchedActivities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return degreeSemesterActivities;
    return degreeSemesterActivities.filter((a) =>
      String(a.title || "")
        .toLowerCase()
        .includes(needle)
    );
  }, [degreeSemesterActivities, search]);

  // Tabs
  const tabbedActivities = useMemo(() => {
    const tab = String(activitiesTab || "").toLowerCase();
    if (tab === "all") return searchedActivities;
    return searchedActivities.filter((a) => String(a.status) === tab);
  }, [activitiesTab, searchedActivities]);

  // Right pane stats
  const completedCount = useMemo(
    () =>
      degreeSemesterActivities.filter((a) => a.status === "completed").length,
    [degreeSemesterActivities]
  );
  const ongoingCount = useMemo(
    () => degreeSemesterActivities.filter((a) => a.status === "ongoing").length,
    [degreeSemesterActivities]
  );
  const pendingCount = useMemo(
    () => degreeSemesterActivities.filter((a) => a.status === "pending").length,
    [degreeSemesterActivities]
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
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
    Student Dashboard
  </h1>

  <nav className="ai_links -mr-1">
    <ul className="flex items-center gap-2 overflow-x-auto">
      {[
        { to: "/ai-tutor", label: "AI Tutor" },
        { to: "/ai-tutor", label: "Code Generator" },
        { to: "/ai-tutor", label: "Code Summary" }, // fixed spelling
        { to: "/ai-tutor", label: "Roadmap Generator" },
        { to: "/ai-tutor", label: "Dashboard Generator" },
      ].map(({ to, label }) => (
        <li key={label} className="shrink-0">
          <NavLink
            to={to}
            className={({ isActive }) =>
              [
                "inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs sm:text-sm transition-all",
                "focus:outline-none focus:ring-2 focus:ring-indigo-300",
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200",
              ].join(" ")
            }
          >
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
</div>


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
              to="/my-attendance"
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              My Attendance
            </Link>

            {/* ATTENDANCE quick action */}
            {/* ATTENDANCE quick action */}
            {activeLinks.length > 0 ? (
              activeLinks.length === 1 ? (
                <Link
                  to={`/mark-attendance/${activeLinks[0].code}`}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-green-100 hover:bg-green-200 text-gray-800"
                  title="Mark attendance for the current active window"
                >
                  Mark Attendance
                </Link>
              ) : (
                <div className="relative group">
                  <button className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-green-100 hover:bg-green-200 text-gray-800">
                    Mark Attendance ▾
                  </button>
                  <div className="absolute mt-1 hidden group-hover:block bg-white border rounded-lg shadow z-10 min-w-[220px]">
                    {activeLinks.map((lk) => (
                      <Link
                        key={lk._id || lk.code}
                        to={`/mark-attendance/${lk.code}`}
                        className="block px-3 py-1.5 text-sm hover:bg-gray-50 break-all"
                        title={`${new Date(
                          lk.validFrom
                        ).toLocaleString()} – ${new Date(
                          lk.validTo
                        ).toLocaleString()}`}
                      >
                        {lk.title || "Attendance"} ({lk.code.slice(0, 6)}…)
                      </Link>
                    ))}
                  </div>
                </div>
              )
            ) : (
              // Fallback: let user go to the page to enter code or mark manually
              <Link
                to="/mark-attendance"
                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
                title="Open the Mark Attendance page to enter a code or mark manually"
              >
                Mark Attendance
              </Link>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-full sm:w-64 md:w-72 max-w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities or courses…"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              className="w-full rounded-full border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400"
              aria-label="Search activities or courses"
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
              {semesterCourses.map((c) => (
                <CourseCard key={c.id} c={c} />
              ))}
              {semesterCourses.length === 0 && (
                <div className="text-sm text-gray-500">No courses found.</div>
              )}
            </div>
          </section>

          {/* ---------------- ACTIVITIES SECTION (degree + semester) ---------------- */}
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
