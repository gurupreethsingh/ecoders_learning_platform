// src/pages/student/StudentDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiChevronDown,
  FiSearch,
  FiGrid,
  FiList,
  FiCheckCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi";
import globalBackendRoute from "../../config/Config";
import {
  getAuthorizationHeader,
  getTokenUserId,
} from "../../components/auth_components/AuthManager";

/* ---------------- Small UI Bits ---------------- */
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm transition whitespace-nowrap ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`}
  >
    {children}
  </button>
);

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();
  if (s === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        <FiCheckCircle /> Completed
      </span>
    );
  if (s === "ongoing")
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <FiClock /> Ongoing
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
      <FiXCircle /> Pending
    </span>
  );
};

const CompletionPill = ({ pct = 0 }) => {
  const n = Math.max(0, Math.min(100, Number(pct || 0)));
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${
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
};

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
    safeId(raw, "semester", "semesterId", "semester", "semesterId") ||
    (typeof raw?.semester === "string" && raw.semester) ||
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


/* ------------------- UPDATED: robust degree resolution ------------------- */

// Match your routes that include `/slug/` in the path.
const fetchDegreeDetails = async (idOrSlug) => {
  // by id
  try {
    const r1 = await axios.get(
      `${API}/get-degree-by-id/slug/${idOrSlug}`,
      auth()
    );
    const d = r1?.data?.data || r1?.data;
    if (d) return normalizeDegree(d);
  } catch {}

  // by slug
  try {
    const r2 = await axios.get(
      `${API}/get-degree-by-slug/slug/${idOrSlug}`,
      auth()
    );
    const d = r2?.data?.data || r2?.data;
    if (d) return normalizeDegree(d);
  } catch {}

  // fall back: scan list
  try {
    const r3 = await axios.get(
      `${API}/list-degrees?page=1&limit=2000`,
      auth()
    );
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

// Prefer user.degree; else take latest admission.intendedEnrollment.degree
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

  // UI state
  const [activeMainTab, setActiveMainTab] = useState("overview"); // overview | activities | courses
  const [activitiesTab, setActivitiesTab] = useState("ongoing"); // ongoing | completed | pending | all
  const [search, setSearch] = useState("");

  // Advanced view for Activities
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [activityView, setActivityView] = useState("cards"); // cards | list
  const [statusFilter, setStatusFilter] = useState(new Set(["all"]));

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

  const tabbedActivities = useMemo(() => {
    const tab = String(activitiesTab || "").toLowerCase();
    if (tab === "all") return searchActivities;
    return searchActivities.filter((a) => String(a.status) === tab);
  }, [activitiesTab, searchActivities]);

  const [allViewStatusFilter, setAllViewStatusFilter] = useState(
    new Set(["all"])
  );
  const toggleFilter = (val) => {
    setAllViewStatusFilter((prev) => {
      const next = new Set(prev);
      if (val === "all") return new Set(["all"]);
      if (next.has("all")) next.delete("all");
      if (next.has(val)) next.delete(val);
      else next.add(val);
      if (next.size === 0) next.add("all");
      return next;
    });
  };

  const allActivitiesFiltered = useMemo(() => {
    if (allViewStatusFilter.has("all")) return searchActivities;
    return searchActivities.filter((a) =>
      allViewStatusFilter.has(String(a.status))
    );
  }, [allViewStatusFilter, searchActivities]);

  /* --------------------------- Renderers --------------------------- */
  const ActivityCard = ({ item }) => (
    <div className="border rounded-lg p-4 bg-white flex justify-between items-start min-w-0">
      <div className="min-w-0">
        <div className="font-medium text-gray-900 truncate">{item.title}</div>
        <div className="text-xs text-gray-500 mt-1">
          Due: {item.due ? new Date(item.due).toLocaleDateString() : "—"}
        </div>
        <div className="mt-2">
          <StatusBadge status={item.status} />
        </div>
      </div>
      <div className="text-xs text-gray-500 shrink-0 ml-3">#{item.id}</div>
    </div>
  );

  const ActivityRow = ({ item }) => (
    <div className="grid grid-cols-12 gap-3 border-b py-3 items-center">
      <div className="col-span-7 md:col-span-7 text-gray-900 font-medium truncate">
        {item.title}
      </div>
      <div className="col-span-2 md:col-span-2 text-xs text-gray-600">
        {item.due ? new Date(item.due).toLocaleDateString() : "—"}
      </div>
      <div className="col-span-3 md:col-span-3 flex justify-end md:justify-start">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );

  const CourseCard = ({ c }) => (
    <div className="border rounded-lg p-4 bg-white min-w-0">
      <div className="font-medium text-gray-900 truncate">{c.title}</div>
      <div className="mt-2">
        <CompletionPill pct={c.completion} />
      </div>
      <div className="mt-2 w-full bg-gray-100 h-2 rounded overflow-hidden">
        <div
          className={`h-2 ${
            c.completion === 100 ? "bg-green-500" : "bg-indigo-500"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, c.completion))}%` }}
        />
      </div>
    </div>
  );

  /* --------------------------- UI --------------------------- */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-6">
        <header className="border rounded-xl bg-white p-4 md:p-5 mb-5 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-8 w-full bg-gray-200 rounded" />
          </div>
        </header>
        <section className="grid grid-cols-1 gap-5">
          <div className="border rounded-xl bg-white p-5">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-6">
        <div className="border rounded-xl bg-white p-5">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-6">
      {/* Top App Header (stacked on mobile, two columns on large) */}
      <header className="border rounded-xl bg-white p-4 md:p-5 mb-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left: Title + Degree + Semester */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 shrink-0">
              Student Dashboard
            </h1>
            <div className="hidden md:block w-px bg-gray-300 mx-2" />
            <div className="flex items-center flex-wrap gap-3">
              <span className="text-lg font-semibold text-gray-900 truncate">
                {degreeName}
              </span>
              <div className="relative">
                <select
                  value={selectedSemesterId || ""}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="appearance-none pr-8 pl-3 py-2 rounded border text-sm bg-white hover:border-gray-400 cursor-pointer max-w-[240px]"
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
              <ul className="flex items-center flex-wrap -m-1">
                <li className="m-1">
                  <a
                    href="/grade-book"
                    className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    Grade Book
                  </a>
                </li>
                <li className="m-1">
                  <a
                    href="/attendance"
                    className="px-3 py-1.5 text-sm rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800"
                  >
                    Attendance
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Search + Tabs (stack vertically on mobile) */}
          <div className="flex flex-col gap-3 w-full">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses or activities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <TabButton
                active={activeMainTab === "overview"}
                onClick={() => {
                  setActiveMainTab("overview");
                  setShowAllActivities(false);
                }}
              >
                Overview
              </TabButton>
              <TabButton
                active={activeMainTab === "activities"}
                onClick={() => setActiveMainTab("activities")}
              >
                Activities
              </TabButton>
              <TabButton
                active={activeMainTab === "courses"}
                onClick={() => {
                  setActiveMainTab("courses");
                  setShowAllActivities(false);
                }}
              >
                Courses
              </TabButton>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- CONTENT ---------------- */}
      {activeMainTab === "overview" && (
        <section className="space-y-5">
          {/* Activities quick view */}
          <div className="border rounded-xl bg-white p-4 md:p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Activities
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
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

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tabbedActivities.slice(0, 6).map((a) => (
                <ActivityCard key={a.id} item={a} />
              ))}
              {tabbedActivities.length === 0 && (
                <div className="text-sm text-gray-500">
                  No activities found.
                </div>
              )}
            </div>

            <div className="mt-4 text-right">
              <button
                className="text-sm text-indigo-700 hover:underline"
                onClick={() => {
                  setActiveMainTab("activities");
                  setShowAllActivities(true);
                }}
              >
                View all activities →
              </button>
            </div>
          </div>

          {/* Courses quick view */}
          <div className="border rounded-xl bg-white p-4 md:p-5 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {degreeSemesters.find((s) => s.id === selectedSemesterId)
                  ?.name || "Semester"}{" "}
                • Courses
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCourses.map((c) => (
                <CourseCard key={c.id} c={c} />
              ))}
              {filteredCourses.length === 0 && (
                <div className="text-sm text-gray-500">No courses found.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeMainTab === "activities" && (
        <>
          {!showAllActivities ? (
            <section className="border rounded-xl bg-white p-4 md:p-5 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Activities
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
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

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tabbedActivities.map((a) => (
                  <ActivityCard key={a.id} item={a} />
                ))}
                {tabbedActivities.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No activities found.
                  </div>
                )}
              </div>

              <div className="mt-4 text-right">
                <button
                  className="text-sm text-indigo-700 hover:underline"
                  onClick={() => setShowAllActivities(true)}
                >
                  All Activities (card/list + filters) →
                </button>
              </div>
            </section>
          ) : (
            <section className="border rounded-xl bg-white overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Left Filter Panel */}
                <aside className="md:w-64 border-b md:border-b-0 md:border-r p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Status Filters
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: "all", label: "All" },
                      { id: "ongoing", label: "Ongoing" },
                      { id: "completed", label: "Completed" },
                      { id: "pending", label: "Pending" },
                    ].map((f) => (
                      <label
                        key={f.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter.has(f.id)}
                          onChange={() =>
                            setStatusFilter((prev) => {
                              const next = new Set(prev);
                              if (f.id === "all") return new Set(["all"]);
                              if (next.has("all")) next.delete("all");
                              if (next.has(f.id)) next.delete(f.id);
                              else next.add(f.id);
                              if (next.size === 0) next.add("all");
                              return next;
                            })
                          }
                        />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </aside>

                {/* Right Results */}
                <main className="flex-1 p-4 md:p-5 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      Showing {allActivitiesFiltered.length} activities
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${
                          activityView === "cards"
                            ? "bg-gray-100"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setActivityView("cards")}
                        title="Cards view"
                      >
                        <FiGrid /> Cards
                      </button>
                      <button
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${
                          activityView === "list"
                            ? "bg-gray-100"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setActivityView("list")}
                        title="List view"
                      >
                        <FiList /> List
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {activityView === "cards" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allActivitiesFiltered.map((a) => (
                          <ActivityCard key={a.id} item={a} />
                        ))}
                        {allActivitiesFiltered.length === 0 && (
                          <div className="text-sm text-gray-500">
                            No activities found.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg bg-white p-3 overflow-hidden">
                        <div className="grid grid-cols-12 gap-3 text-xs text-gray-500 border-b pb-2">
                          <div className="col-span-7">Title</div>
                          <div className="col-span-2">Due</div>
                          <div className="col-span-3">Status</div>
                        </div>
                        <div className="min-w-0">
                          {allActivitiesFiltered.map((a) => (
                            <ActivityRow key={a.id} item={a} />
                          ))}
                          {allActivitiesFiltered.length === 0 && (
                            <div className="text-sm text-gray-500 p-3">
                              No activities found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </main>
              </div>
            </section>
          )}
        </>
      )}

      {activeMainTab === "courses" && (
        <section className="border rounded-xl bg-white p-4 md:p-5 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              All Courses • {degreeName}
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCourses.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
            {filteredCourses.length === 0 && (
              <div className="text-sm text-gray-500">No courses found.</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
