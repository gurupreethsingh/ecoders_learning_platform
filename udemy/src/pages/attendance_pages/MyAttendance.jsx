// src/pages/attendance/MyAttendance.jsx
import React, { useEffect, useMemo, useState, useRef, memo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  FiChevronDown,
  FiCalendar,
  FiClock,
  FiPieChart,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiDownload,
} from "react-icons/fi";

import globalBackendRoute from "../../config/Config";
import {
  getAuthorizationHeader,
  getTokenUserId,
} from "../../components/auth_components/AuthManager";

const API = `${globalBackendRoute}/api`;
const auth = () => ({ headers: { ...getAuthorizationHeader() } });

/* -------------------- Utilities -------------------- */
const toISO = (d) => new Date(d).toISOString();
const atStartOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const atEndOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const startOfThisWeek = () => {
  const d = new Date();
  // Week starts Monday
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day;
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
};
const endOfThisWeek = () => {
  const s = startOfThisWeek();
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};
const startOfThisYear = () => {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
};
const endOfThisYear = () => {
  const d = new Date();
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
};

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

/* -------------------- Normalizers -------------------- */
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
      raw?.semister_name,
      raw?.name,
      raw?.title,
      raw?.slug && `Sem ${raw.slug}`
    ) || "Semester",
  degreeId:
    safeId(raw, "degree", "degreeId", "program", "programId") ||
    (typeof raw?.degree === "string" && raw.degree) ||
    null,
  startDate:
    raw?.startDate || raw?.start_at || raw?.validFrom || raw?.from || null,
  endDate: raw?.endDate || raw?.end_at || raw?.validTo || raw?.to || null,
});

const normalizeCourse = (raw) => ({
  id: raw?._id || raw?.id || null,
  title: firstNonEmpty(raw?.title, raw?.name, raw?.code, "Course") || "Course",
  semesterId:
    safeId(raw, "semester", "semesterId") ||
    (typeof raw?.semester === "string" && raw.semester) ||
    null,
  degreeId:
    safeId(raw, "degree", "degreeId", "program", "programId") ||
    (typeof raw?.degree === "string" && raw.degree) ||
    null,
});

/* -------------------- Degree resolution -------------------- */
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

/* -------------------- UI bits -------------------- */
const Stat = ({ label, value, tone = "base" }) => {
  const tones = {
    base: "bg-gray-50 text-gray-700 border-gray-200",
    good: "bg-green-50 text-green-700 border-green-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div
      className={`border rounded-lg px-3 py-2 flex items-center justify-between ${tones[tone]}`}
    >
      <div className="text-xs">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
};

const Row = memo(function Row({ left, right }) {
  return (
    <div className="grid grid-cols-12 gap-2 border-b py-2 items-center">
      <div className="col-span-7 text-sm text-gray-800 truncate">{left}</div>
      <div className="col-span-5 text-sm font-medium text-gray-900 text-right">
        {right}
      </div>
    </div>
  );
});

/* ============================================================
   MyAttendance Component
   ============================================================ */
export default function MyAttendance() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // user + cohort
  const [degree, setDegree] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");

  // period filter
  const [period, setPeriod] = useState("today"); // today | week | semester | year | day
  const [customDay, setCustomDay] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // results
  const [overallPct, setOverallPct] = useState(null);
  const [presentCount, setPresentCount] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [byCourse, setByCourse] = useState([]); // [{courseId, title, present, total, pct}]
  const [entries, setEntries] = useState([]); // list (best-effort fallback)

  const topRef = useRef(null);

  const degreeName = degree?.name || "Degree";
  const uid = useMemo(() => getTokenUserId(), []);

  /* -------------------- initial load -------------------- */
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        if (!uid) throw new Error("Not logged in.");

        // user
        const userRes = await axios.get(`${API}/getUserById/${uid}`, auth());
        const user = userRes?.data?.data || userRes?.data || {};

        // degree (the one the student is enrolled in)
        const deg = await resolveDegreeForUser(uid, user);
        if (!alive) return;
        setDegree(deg);

        // semesters for that degree
        const sRes = await axios.get(
          `${API}/semesters/list-by-degree/${deg.id}`,
          auth()
        );
        const sArr = Array.isArray(sRes?.data?.data)
          ? sRes.data.data
          : Array.isArray(sRes?.data)
          ? sRes.data
          : [];
        const normSem = sArr.map(normalizeSemester);
        if (!alive) return;
        setSemesters(normSem);
        // pick first semester (or the one with current date in range if metadata exists)
        let defaultSem =
          normSem.find((s) => {
            const now = new Date();
            const st = s.startDate ? new Date(s.startDate) : null;
            const en = s.endDate ? new Date(s.endDate) : null;
            return (!st || now >= st) && (!en || now <= en);
          }) || normSem[0];
        setSemesterId(defaultSem?.id || "");

        // courses (lazy: loaded on semester change below)
      } catch (e) {
        if (alive)
          setErr(
            e?.response?.data?.message || e.message || "Failed to load page."
          );
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [uid]);

  /* -------------------- courses for semester -------------------- */
  useEffect(() => {
    let alive = true;
    const loadCourses = async () => {
      try {
        if (!semesterId) {
          setCourses([]);
          setCourseId("");
          return;
        }
        const r = await axios.get(
          `${API}/courses/list-by-semester/${semesterId}`,
          auth()
        );
        const arr = Array.isArray(r?.data?.data)
          ? r.data.data
          : Array.isArray(r?.data)
          ? r.data
          : [];
        const norm = arr.map(normalizeCourse);
        if (!alive) return;
        setCourses(norm);
        // don't auto-pick; keep "All Courses"
      } catch {
        if (alive) {
          setCourses([]);
          setCourseId("");
        }
      }
    };
    loadCourses();
    return () => {
      alive = false;
    };
  }, [semesterId]);

  /* -------------------- date range calculation -------------------- */
  const calcRange = () => {
    if (period === "today") {
      const s = atStartOfDay(new Date());
      const e = atEndOfDay(new Date());
      return { from: toISO(s), to: toISO(e) };
    }
    if (period === "week") {
      const s = startOfThisWeek();
      const e = endOfThisWeek();
      return { from: toISO(s), to: toISO(e) };
    }
    if (period === "year") {
      const s = startOfThisYear();
      const e = endOfThisYear();
      return { from: toISO(s), to: toISO(e) };
    }
    if (period === "day") {
      const d = customDay ? new Date(customDay) : new Date();
      return { from: toISO(atStartOfDay(d)), to: toISO(atEndOfDay(d)) };
    }
    // semester
    const sem = semesters.find((s) => String(s.id) === String(semesterId));
    const s = sem?.startDate ? atStartOfDay(new Date(sem.startDate)) : startOfThisYear();
    const e = sem?.endDate ? atEndOfDay(new Date(sem.endDate)) : endOfThisYear();
    return { from: toISO(s), to: toISO(e) };
  };

  /* -------------------- fetch attendance -------------------- */
  const fetchAttendance = async () => {
    if (!semesterId) return;

    setLoading(true);
    setErr("");
    setEntries([]);
    setByCourse([]);
    setOverallPct(null);
    setPresentCount(null);
    setTotalCount(null);

    try {
      const { from, to } = calcRange();

      // Overall summary
      const params = {
        studentId: uid,
        degreeId: degree?.id,
        semesterId,
        from,
        to,
      };
      if (courseId) params.courseId = courseId;

      // Primary: /my-attendance-summary (should return {present, total, percentage, breakdownByCourse?})
      const res = await axios.get(`${API}/my-attendance-summary`, {
        params,
        ...auth(),
      });

      const payload = res?.data?.data || res?.data || {};
      const pct =
        payload?.percentage ??
        payload?.pct ??
        (payload?.total > 0
          ? Math.round((Number(payload.present || 0) / payload.total) * 100)
          : null);

      setOverallPct(pct != null ? Number(pct) : null);
      setPresentCount(
        payload?.present != null ? Number(payload.present) : null
      );
      setTotalCount(payload?.total != null ? Number(payload.total) : null);

      // Per-course breakdown if provided
      const b = payload?.breakdownByCourse;
      if (Array.isArray(b) && b.length) {
        setByCourse(
          b.map((x) => ({
            courseId:
              x.courseId ||
              x.course?._id ||
              x.course?.id ||
              (typeof x.course === "string" ? x.course : null),
            title:
              x.courseTitle || x.course?.title || x.course?.name || "Course",
            present: Number(x.present || 0),
            total: Number(x.total || 0),
            pct:
              Number(x.total || 0) > 0
                ? Math.round((Number(x.present || 0) / Number(x.total)) * 100)
                : 0,
          }))
        );
      } else {
        // try a best-effort fallback: fetch list and compute coarse breakdown
        try {
          const listRes = await axios
            .get(`${API}/my-attendance-list`, {
              params,
              ...auth(),
            })
            .catch(() => null);

          const list = Array.isArray(listRes?.data?.data)
            ? listRes.data.data
            : Array.isArray(listRes?.data)
            ? listRes.data
            : [];

          if (list.length) {
            // normalize rows and compute
            const rows = list.map((r) => ({
              id: r._id || r.id,
              courseId:
                r.courseId ||
                r.course?._id ||
                r.course?.id ||
                (typeof r.course === "string" ? r.course : null),
              courseTitle:
                r.courseTitle || r.course?.title || r.course?.name || "Course",
              status: String(r.status || r.mark || r.value || "present").toLowerCase(), // present/absent
              ts: r.date || r.markedAt || r.createdAt || r.updatedAt || null,
            }));

            setEntries(
              rows
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime()
                )
            );

            // per course agg
            const map = new Map();
            for (const r of rows) {
              const key = r.courseId || "unknown";
              const agg =
                map.get(key) || {
                  courseId: r.courseId || null,
                  title: r.courseTitle || "Course",
                  present: 0,
                  total: 0,
                };
              agg.total += 1;
              if (r.status === "present") agg.present += 1;
              map.set(key, agg);
            }
            const computed = [...map.values()].map((g) => ({
              ...g,
              pct: g.total > 0 ? Math.round((g.present / g.total) * 100) : 0,
            }));
            setByCourse(computed);
          }
        } catch {
          // ignore — we’ll show the top-level summary only
        }
      }
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e.message ||
          "Failed to load attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  /* auto-fetch when filters change */
  useEffect(() => {
    if (semesterId) fetchAttendance(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, courseId, period, customDay]);

  /* -------------------- Export CSV (simple) -------------------- */
  const exportCsv = () => {
    const lines = [];
    lines.push(
      [
        "Date/Time",
        "Course",
        "Status",
        `Overall ${overallPct != null ? overallPct + "%" : ""}`,
      ].join(",")
    );
    entries.forEach((r) => {
      lines.push(
        [
          r.ts ? new Date(r.ts).toLocaleString() : "",
          `"${(r.courseTitle || "").replace(/"/g, '""')}"`,
          r.status || "",
          "",
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `attendance_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* -------------------- UI -------------------- */
  if (loading && !degree) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="border rounded-xl bg-white p-4">
          <div className="h-10 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-24 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="border rounded-xl bg-white p-4">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
        </div>
      </div>
    );
  }

  const currentSem = semesters.find((s) => String(s.id) === String(semesterId));

  return (
    <div ref={topRef} className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Attendance
          </h1>
          <p className="text-sm text-gray-500">
            View your attendance percentage by period and course.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/student-dashboard"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Filters */}
      <section className="bg-white border rounded-xl p-4 md:p-5 mb-4">
        <div className="grid md:grid-cols-4 gap-3">
          {/* Degree (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Degree
            </label>
            <input
              readOnly
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-gray-50 text-gray-700"
              value={degreeName}
            />
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Semester<span className="text-rose-500">*</span>
            </label>
            <div className="mt-1 relative">
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
            </div>
          </div>

          {/* Course (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Course (optional)
            </label>
            <div className="mt-1 relative">
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
                disabled={!semesterId}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Period
            </label>
            <div className="mt-1 relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full appearance-none rounded-lg border px-3 py-2 text-sm bg-white"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="semester">This Semester</option>
                <option value="year">This Year</option>
                <option value="day">Specific Day…</option>
              </select>
              <FiChevronDown className="absolute right-3 top-3 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>

        {/* Specific Day picker */}
        {period === "day" && (
          <div className="grid md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pick a date
              </label>
              <input
                type="date"
                className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white"
                value={customDay}
                onChange={(e) => setCustomDay(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Info note for semester range if missing dates */}
        {period === "semester" && (!currentSem?.startDate || !currentSem?.endDate) && (
          <div className="mt-3 rounded-lg p-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-2">
            <FiAlertTriangle />
            Exact semester dates are not configured; using a broad year range.
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={fetchAttendance}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <FiClock /> Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!entries.length}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60"
            title={entries.length ? "Download CSV" : "No detailed rows to export"}
          >
            <FiDownload /> Export CSV
          </button>
        </div>
      </section>

      {/* Summary */}
      <section className="bg-white border rounded-xl p-4 md:p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <FiPieChart />
            Summary
          </div>
          <div className="text-xs text-gray-500">
            {(() => {
              if (period === "today") return "Today";
              if (period === "week") return "This Week";
              if (period === "semester") return "This Semester";
              if (period === "year") return "This Year";
              if (period === "day") return `On ${new Date(customDay).toLocaleDateString()}`;
              return "";
            })()}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Overall %"
            value={
              overallPct != null ? `${Math.round(overallPct)}%` : "—"
            }
            tone={
              overallPct == null
                ? "base"
                : overallPct >= 85
                ? "good"
                : overallPct >= 60
                ? "warn"
                : "bad"
            }
          />
          <Stat label="Present" value={presentCount ?? "—"} />
          <Stat label="Total Sessions" value={totalCount ?? "—"} />
          <Stat
            label="Absences"
            value={
              presentCount != null && totalCount != null
                ? Math.max(0, totalCount - presentCount)
                : "—"
            }
            tone="bad"
          />
        </div>
      </section>

      {/* Breakdown by Course */}
      <section className="bg-white border rounded-xl p-4 md:p-5 mb-4">
        <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
          <FiCheckCircle />
          By Course
        </div>
        <div className="grid grid-cols-12 gap-2 border-b pb-2 text-[11px] md:text-xs text-gray-500">
          <div className="col-span-7">Course</div>
          <div className="col-span-5 text-right">Present / Total ( % )</div>
        </div>
        <div>
          {byCourse.length ? (
            byCourse
              .slice()
              .sort((a, b) => String(a.title).localeCompare(String(b.title)))
              .map((c) => (
                <Row
                  key={c.courseId || c.title}
                  left={c.title}
                  right={
                    c.total > 0
                      ? `${c.present}/${c.total} (${c.pct}%)`
                      : "—"
                  }
                />
              ))
          ) : (
            <div className="text-sm text-gray-500 mt-2">
              {courseId
                ? "No data for the selected course and period."
                : "Per-course breakdown is unavailable for this period."}
            </div>
          )}
        </div>
      </section>

      {/* Daily log (best-effort, only if we fetched list fallback) */}
      <section className="bg-white border rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
          <FiCalendar />
          Daily Log
        </div>
        {entries.length ? (
          <div className="space-y-2">
            {entries.map((r) => (
              <div
                key={r.id}
                className={`border rounded-lg p-3 flex items-center justify-between ${
                  r.status === "present"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {r.courseTitle}
                </div>
                <div className="text-xs">{new Date(r.ts).toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg p-3 text-sm bg-gray-50 text-gray-700 border border-gray-200">
            No detailed entries to show for the selected filters.
          </div>
        )}
      </section>
    </div>
  );
}
