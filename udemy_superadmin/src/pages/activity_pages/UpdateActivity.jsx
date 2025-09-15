// src/pages/activities/UpdateActivity.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config.js";
import {
  FiChevronDown,
  FiChevronUp,
  FiSave,
  FiUsers,
  FiCalendar,
  FiArrowLeft,
  FiEdit2,
} from "react-icons/fi";

const API = globalBackendRoute;

/** axios instance with auth + token-expiry handling */
const api = axios.create({ baseURL: API });
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

/** small collapsible section */
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-3"
        title={open ? "Collapse" : "Expand"}
      >
        <span className="font-semibold text-gray-900">{title}</span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
};

/** enums */
const AUDIENCE_TYPES = ["all", "roles", "users", "contextual"];
const ROLES = [
  "superadmin",
  "admin",
  "instructor",
  "teacher",
  "student",
  "author",
];
const STATUSES = ["draft", "published", "archived"];

/** helpers */
function toISO(value) {
  const v = String(value || "").trim();
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** ID helpers (robust against different payload shapes) */
const idOf = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return String(val._id || val.id || "");
  return String(val);
};
const getCourseDegreeId = (c) =>
  idOf(c.degree) || idOf(c.degreeId) || idOf(c.degree_id) || idOf(c.degreeRef) || "";
const getCourseSemesterId = (c) =>
  idOf(c.semester) ||
  idOf(c.semesterId) ||
  idOf(c.semester) ||
  idOf(c.semesterId) ||
  idOf(c.semester_ref) ||
  "";

/** Extract context id arrays from an activity */
const extractContextIds = (a) => {
  const c = a?.context || {};
  const degreeIds = []
    .concat(c.degrees || [], c.degreeIds || [], c.degree || [], a?.degreeId || [])
    .map(idOf)
    .filter(Boolean)
    .map(String);
  const semesterIds = []
    .concat(
      c.semesters || [],
      c.semesterIds || [],
      c.semester || [],
      c.semester || [],
      a?.semesterId || [],
      a?.semesterId || []
    )
    .map(idOf)
    .filter(Boolean)
    .map(String);
  const courseIds = []
    .concat(c.courses || [], c.courseIds || [], c.course || [], a?.courseId || [])
    .map(idOf)
    .filter(Boolean)
    .map(String);
  return {
    degreeIds: Array.from(new Set(degreeIds)),
    semesterIds: Array.from(new Set(semesterIds)),
    courseIds: Array.from(new Set(courseIds)),
  };
};

export default function UpdateActivity() {
  const { id } = useParams(); // assume /update-activity/:id
  const navigate = useNavigate();

  const [msg, setMsg] = useState({ type: "", text: "" });
  const setAlert = (type, text) => setMsg({ type, text });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // lists
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  // selections (arrays; all optional)
  const [selDegreeIds, setSelDegreeIds] = useState([]);
  const [selSemesterIds, setSelSemesterIds] = useState([]);
  const [selCourseIds, setSelCourseIds] = useState([]);

  // form
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    audienceType: "all",
    roles: [],
    usersCSV: "",
    startAt: "",
    endAt: "",
    allowLate: false,
    maxMarks: 100,
    status: "draft",
  });

  /** load activity + prefill */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setAlert("", "");
        const r = await api.get(`/api/get-activity/${id}`);
        const a = r?.data?.data || r?.data;
        if (!alive) return;

        const { degreeIds, semesterIds, courseIds } = extractContextIds(a);

        setForm({
          title: a?.title || "",
          instructions: a?.instructions || "",
          audienceType: a?.audienceType || "all",
          roles: Array.isArray(a?.roles) ? a.roles : [],
          usersCSV: Array.isArray(a?.users) ? a.users.join(",") : "",
          startAt: toLocalInput(a?.startAt),
          endAt: toLocalInput(a?.endAt),
          allowLate: !!a?.allowLate,
          maxMarks:
            typeof a?.maxMarks === "number" ? a.maxMarks : Number(a?.maxMarks) || 100,
          status: a?.status || "draft",
        });

        // seed selections; downstream effects will fetch sems/courses
        setSelDegreeIds(degreeIds);
        setSelSemesterIds(semesterIds);
        setSelCourseIds(courseIds);
      } catch (e) {
        if (alive)
          setAlert(
            "error",
            e?.response?.data?.message || e?.message || "Failed to load activity."
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /** load degrees once */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/list-degrees", {
          params: { page: 1, limit: 1000 },
        });
        if (!alive) return;
        const list = r?.data?.data || r?.data || [];
        setDegrees(Array.isArray(list) ? list : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** when degrees change, load semesters (scoped) */
  useEffect(() => {
    let alive = true;
    if (!selDegreeIds.length) {
      setSemesters([]);
      setSelSemesterIds([]);
      setCourses([]);
      setSelCourseIds([]);
      return;
    }
    (async () => {
      try {
        const all = [];
        for (const degId of selDegreeIds) {
          const r = await api.get("/api/semesters", {
            params: { page: 1, limit: 2000, degreeId: degId, degree: degId },
          });
          const list = r?.data?.data || r?.data || [];
          all.push(...(Array.isArray(list) ? list : []));
        }
        if (!alive) return;
        // de-dup by id
        const seen = new Set();
        const merged = all.filter((s) => {
          const id = String(s._id || s.id || "");
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setSemesters(merged);
        // keep only visible selections
        setSelSemesterIds((prev) => prev.filter((id) => seen.has(String(id))));
      } catch {
        if (alive) setSemesters([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selDegreeIds]);

  /** when semesters change, load courses (degree+semester) with robust local filter */
  useEffect(() => {
    let alive = true;
    if (!selDegreeIds.length || !selSemesterIds.length) {
      setCourses([]);
      setSelCourseIds([]);
      return;
    }
    (async () => {
      try {
        const fetched = [];
        for (const degId of selDegreeIds) {
          for (const semId of selSemesterIds) {
            const r = await api.get("/api/list-courses", {
              params: {
                page: 1,
                limit: 5000,
                degreeId: degId,
                semesterId: semId,
              },
            });
            const list = r?.data?.data || r?.data || [];
            fetched.push(...(Array.isArray(list) ? list : []));
          }
        }

        const allowedDeg = new Set(selDegreeIds.map(String));
        const allowedSem = new Set(selSemesterIds.map(String));

        const seen = new Set();
        let filtered = [];
        for (const c of fetched) {
          const cid = String(c._id || c.id || "");
          if (!cid || seen.has(cid)) continue;
          const deg = String(getCourseDegreeId(c));
          const sem = String(getCourseSemesterId(c));
          if (allowedDeg.has(deg) && allowedSem.has(sem)) {
            seen.add(cid);
            filtered.push(c);
          }
        }

        if (!filtered.length) {
          // Fallback: fetch all and filter locally if server ignored params
          const rAll = await api.get("/api/list-courses", {
            params: { page: 1, limit: 10000 },
          });
          const all = rAll?.data?.data || rAll?.data || [];
          const seen2 = new Set();
          filtered = (Array.isArray(all) ? all : []).filter((c) => {
            const cid = String(c._id || c.id || "");
            if (!cid || seen2.has(cid)) return false;
            const deg = String(getCourseDegreeId(c));
            const sem = String(getCourseSemesterId(c));
            const ok = allowedDeg.has(deg) && allowedSem.has(sem);
            if (ok) seen2.add(cid);
            return ok;
          });
        }

        if (!alive) return;
        setCourses(filtered);
        const avail = new Set(filtered.map((c) => String(c._id || c.id)));
        setSelCourseIds((prev) => prev.filter((id) => avail.has(String(id))));
      } catch {
        if (alive) setCourses([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selDegreeIds, selSemesterIds]);

  /** UI helpers */
  const audienceHelp = useMemo(() => {
    switch (form.audienceType) {
      case "all":
        return "All users will be eligible for this activity (no audience filter).";
      case "roles":
        return "Only users in the selected roles will be targeted.";
      case "users":
        return "Only the specific users (comma-separated ObjectIds) will be targeted.";
      case "contextual":
        return "Target users linked to the selected degree/semester/course.";
      default:
        return "";
    }
  }, [form.audienceType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleMultiSelect = (setter) => (e) => {
    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
    setter(opts);
  };

  const toggleRole = (role) => {
    setForm((f) => {
      const set = new Set(f.roles || []);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      return { ...f, roles: Array.from(set) };
    });
  };

  /** save */
  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // basic validations
    const s = form.startAt ? new Date(form.startAt).getTime() : null;
    const eAt = form.endAt ? new Date(form.endAt).getTime() : null;
    if (s && eAt && eAt < s) {
      setAlert("error", "End date/time must be after Start date/time.");
      return;
    }

    try {
      setSaving(true);
      setAlert("", "");

      const users = String(form.usersCSV || "")
        .split(",")
        .map((t) => t.trim())
        .filter((v) => /^[0-9a-fA-F]{24}$/.test(v));

      const payload = {
        title: form.title,
        instructions: form.instructions || "",

        audienceType: form.audienceType,
        ...(form.audienceType === "roles" ? { roles: form.roles || [] } : {}),
        ...(form.audienceType === "users" ? { users } : {}),

        // persist context even if audienceType !== contextual (metadata)
        context: {
          degrees: selDegreeIds,
          semesters: selSemesterIds,
          courses: selCourseIds,
        },

        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
        allowLate: !!form.allowLate,
        maxMarks:
          typeof form.maxMarks === "number"
            ? form.maxMarks
            : Number(form.maxMarks) || 100,

        status: form.status || "draft",
      };

      await api.patch(`/api/update-activity/${id}`, payload);
      setAlert("success", "Activity updated.");
      navigate(`/single-activity/updated/${id}`);
    } catch (e2) {
      setAlert(
        "error",
        e2?.response?.data?.error ||
          e2?.response?.data?.message ||
          "Failed to update activity."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6">
        <div className="bg-white p-4 md:p-6 rounded-lg border">
          <div className="h-6 w-48 bg-gray-200 mb-6" />
          <div className="h-20 w-full bg-gray-200 mb-4" />
          <div className="h-40 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          to={`/single-activity/x/${id}`}
          className="inline-flex items-center gap-2 text-gray-800"
        >
          <FiArrowLeft /> Back to Activity
        </Link>
      </div>

      <form onSubmit={submit} className="bg-white p-4 md:p-6 rounded-lg border">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiEdit2 /> Update Activity
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Edit details below and click <b>Update Activity</b>. Publishing is
            managed from the Single Activity page.
          </p>
        </div>

        {msg.text ? (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              msg.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : msg.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <Section title="Basic" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1">Title</div>
              <input
                className="w-full border rounded px-3 py-2"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., Term Project Proposal"
                required
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Status</div>
              <select
                className="w-full border rounded px-3 py-2"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Publishing notifications/fan-out happens from the Single page.
              </div>
            </label>

            <label className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">Instructions</div>
              <textarea
                className="w-full border rounded px-3 py-2 h-36"
                name="instructions"
                value={form.instructions}
                onChange={handleChange}
                placeholder="Describe the activity, requirements, submission format, etc."
              />
            </label>
          </div>
        </Section>

        {/* Audience */}
        <Section title="Audience" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiUsers /> Audience Type
              </div>
              <select
                className="w-full border rounded px-3 py-2"
                name="audienceType"
                value={form.audienceType}
                onChange={handleChange}
              >
                {AUDIENCE_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">{audienceHelp}</div>
            </label>

            {form.audienceType === "users" && (
              <label className="text-sm text-gray-700">
                <div className="mb-1">Users (ObjectIds, comma-separated)</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="usersCSV"
                  value={form.usersCSV}
                  onChange={handleChange}
                  placeholder="e.g., 65ab...f1, 64cd...9a"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Only 24-hex ObjectIds are kept.
                </div>
              </label>
            )}

            {form.audienceType === "roles" && (
              <div className="text-sm text-gray-700 md:col-span-2">
                <div className="mb-1">Roles</div>
                <div className="flex flex-wrap gap-3">
                  {ROLES.map((r) => (
                    <label key={r} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(form.roles || []).includes(r)}
                        onChange={() => toggleRole(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Context */}
        <Section title="Context (optional)" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Degrees */}
            <label className="text-sm text-gray-700">
              <div className="mb-1">Degrees (multi-select)</div>
              <select
                multiple
                className="w-full border rounded px-3 py-2 h-40"
                value={selDegreeIds}
                onChange={handleMultiSelect(setSelDegreeIds)}
              >
                {degrees.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name || d.title || "Degree"}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Leave empty for no degree scoping.
              </div>
            </label>

            {/* Semesters */}
            <label className="text-sm text-gray-700">
              <div className="mb-1">Semesters (multi-select)</div>
              <select
                multiple
                className="w-full border rounded px-3 py-2 h-40"
                value={selSemesterIds}
                onChange={handleMultiSelect(setSelSemesterIds)}
                disabled={!selDegreeIds.length}
                title={!selDegreeIds.length ? "Select degree(s) first" : ""}
              >
                {semesters.map((s) => {
                  const label =
                    s.title ||
                    s.semester_name ||
                    (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                    "Semester";
                  return (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Optional. Shown after you pick at least one degree.
              </div>
            </label>

            {/* Courses */}
            <label className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">Courses (multi-select)</div>
              <select
                multiple
                className="w-full border rounded px-3 py-2 h-40"
                value={selCourseIds}
                onChange={handleMultiSelect(setSelCourseIds)}
                disabled={!selDegreeIds.length || !selSemesterIds.length}
                title={
                  !selDegreeIds.length || !selSemesterIds.length
                    ? "Pick degree(s) and semester(s) first"
                    : ""
                }
              >
                {courses.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || "Course"}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Optional. Requires degree(s) and semester(s).
              </div>
            </label>
          </div>

          <div className="text-xs text-gray-600 mt-2">
            Context is stored even if Audience Type isn’t <b>contextual</b>,
            which helps you filter later. To target by context, set the audience
            type to <b>contextual</b>.
          </div>
        </Section>

        {/* Timing & grading */}
        <Section title="Timing & Grading" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiCalendar /> Start At
              </div>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                name="startAt"
                value={form.startAt}
                onChange={handleChange}
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiCalendar /> End At (deadline)
              </div>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                name="endAt"
                value={form.endAt}
                onChange={handleChange}
              />
            </label>

            <label className="text-sm text-gray-700 flex items-center gap-2 mt-7">
              <input
                type="checkbox"
                name="allowLate"
                checked={form.allowLate}
                onChange={handleChange}
              />
              <span>Allow late submissions</span>
            </label>

            <label className="text-sm text-gray-700 md:col-span-3">
              <div className="mb-1">Max Marks</div>
              <input
                type="number"
                min="0"
                className="w-full border rounded px-3 py-2"
                name="maxMarks"
                value={form.maxMarks}
                onChange={handleChange}
              />
            </label>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
              saving ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
            }`}
            title="Update activity"
          >
            <FiSave />
            {saving ? "Saving…" : "Update Activity"}
          </button>

          <Link
            to={`/single-activity/x/${id}`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Single
          </Link>
        </div>
      </form>
    </div>
  );
}
