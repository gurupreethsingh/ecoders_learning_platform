// src/pages/notifications/UpdateNotification.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiHash,
  FiTag,
  FiCalendar,
  FiSave,
  FiArrowLeft,
} from "react-icons/fi";
import axios from "axios";
import globalBackendRoute from "@/config/Config.js";

const API = globalBackendRoute;
const NA = "—";

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

/** collapsible section */
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        type="button" // important so clicks don't submit the form
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
const CATEGORIES = [
  "general",
  "exam",
  "result",
  "fees",
  "events",
  "attendance",
  "assignment",
  "system",
];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["draft", "scheduled", "canceled"]; // "sent" is handled as locked in UI
const AUDIENCE_TYPES = ["all", "roles", "users", "contextual"];
const CHANNELS = ["inapp", "email", "sms"];
const ROLES = [
  "superadmin",
  "admin",
  "instructor",
  "teacher",
  "student",
  "author",
];

/** helpers */
const makeSlug = (s) =>
  String(s || "notification")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toIsoOrEmpty = (val) => {
  const v = String(val || "").trim();
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
};

export default function UpdateNotification() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [originalStatus, setOriginalStatus] = useState("");

  /** form model */
  const [form, setForm] = useState({
    title: "",
    message: "",
    category: "",
    priority: "normal",
    status: "draft",
    audienceType: "all",
    channels: [],
    rolesInclude: [],
    usersInclude: [],
    tags: "",
    scheduledAt: "",
    expiresAt: "",
    context_degree: "",
    context_semester: "",
    context_course: "",
    context_section: "",
    context_batchYear: "",
  });

  const isSent = originalStatus === "sent";
  const setAlert = (type, text) => setMsg({ type, text });

  /** lookups */
  const [degreeList, setDegreeList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [courseList, setCourseList] = useState([]);

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
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Degree -> Semesters */
  useEffect(() => {
    let alive = true;
    if (!form.context_degree) {
      setSemesterList([]);
      setCourseList([]);
      setForm((f) => ({ ...f, context_semester: "", context_course: "" }));
      return () => {};
    }
    (async () => {
      try {
        const res = await api.get(`/api/semesters`, {
          params: {
            page: 1,
            limit: 1000,
            degreeId: form.context_degree,
            degree: form.context_degree,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || res?.data || [];
        setSemesterList(Array.isArray(list) ? list : []);
      } catch {
        setSemesterList([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.context_degree]);

  /** Semester -> Courses */
  useEffect(() => {
    let alive = true;
    if (!form.context_degree || !form.context_semester) {
      setCourseList([]);
      setForm((f) => ({ ...f, context_course: "" }));
      return () => {};
    }
    (async () => {
      try {
        const res = await api.get(`/api/list-courses`, {
          params: {
            page: 1,
            limit: 1000,
            degreeId: form.context_degree,
            semesterId: form.context_semester,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || [];
        setCourseList(Array.isArray(list) ? list : []);
      } catch {
        setCourseList([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.context_semester]);

  /** Load notification */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setAlert("", "");
        const res = await api.get(`/api/get-notification/${id}`);
        if (!alive) return;
        const n = res?.data?.data || res?.data || null;
        if (!n) {
          setAlert("error", "Notification not found.");
          setLoading(false);
          return;
        }

        // backend uses 'roles' and 'users'
        const channels = Array.isArray(n.channels) ? n.channels : [];
        const rolesInclude = Array.isArray(n.roles) ? n.roles : [];
        const usersInclude = Array.isArray(n.users) ? n.users : [];

        const tagsArr = Array.isArray(n.tags)
          ? n.tags
          : String(n.tags || "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);

        const ctx = n.context || {};
        const degreeId =
          typeof ctx.degree === "string"
            ? ctx.degree
            : ctx.degree?._id || ctx.degree?.id || "";
        const semId =
          typeof ctx.semester === "string"
            ? ctx.semester
            : ctx.semester?._id || ctx.semester?.id || "";
        const courseId =
          typeof ctx.course === "string"
            ? ctx.course
            : ctx.course?._id || ctx.course?.id || "";

        setOriginalStatus(n.status || "");
        setForm((f) => ({
          ...f,
          title: n.title || "",
          message: n.message || "",
          category: n.category || "",
          priority: n.priority || "normal",
          status: n.status && STATUSES.includes(n.status) ? n.status : "draft",
          audienceType: n.audienceType || "all",
          channels,
          rolesInclude,
          usersInclude,
          tags: tagsArr.join(", "),
          scheduledAt: n.scheduledAt ? n.scheduledAt : "",
          expiresAt: n.expiresAt ? n.expiresAt : "",
          context_degree: degreeId,
          context_semester: semId,
          context_course: courseId,
          context_section: ctx.section || "",
          context_batchYear: ctx.batchYear || "",
        }));
      } catch (e) {
        setAlert(
          "error",
          e?.response?.data?.message || "Failed to load notification."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const createdHint = useMemo(() => NA, []);

  /** handlers */
  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleChannelsToggle = (ch) => {
    setForm((f) => {
      const set = new Set(f.channels || []);
      if (set.has(ch)) set.delete(ch);
      else set.add(ch);
      return { ...f, channels: Array.from(set) };
    });
  };

  const handleRolesToggle = (role) => {
    setForm((f) => {
      const set = new Set(f.rolesInclude || []);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      return { ...f, rolesInclude: Array.from(set) };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      setAlert("", "");

      const tagsArr = String(form.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let payload;
      if (isSent) {
        // Backend only accepts these once sent
        payload = {
          tags: tagsArr,
          priority: form.priority || "normal",
          ...(form.expiresAt
            ? { expiresAt: toIsoOrEmpty(form.expiresAt) }
            : {}),
          // attachments could be added here when UI supports it
        };
      } else {
        // full editable payload before "sent"
        payload = {
          title: form.title,
          message: form.message,
          category: form.category || undefined,
          priority: form.priority || "normal",
          status: form.status || "draft",
          audienceType: form.audienceType || "all",
          channels: form.channels || [],
          roles: form.rolesInclude || [],
          users: form.usersInclude || [],
          tags: tagsArr,
          ...(form.scheduledAt
            ? { scheduledAt: toIsoOrEmpty(form.scheduledAt) }
            : {}),
          ...(form.expiresAt
            ? { expiresAt: toIsoOrEmpty(form.expiresAt) }
            : {}),
          context: {
            ...(form.context_degree ? { degree: form.context_degree } : {}),
            ...(form.context_semester
              ? { semester: form.context_semester }
              : {}),
            ...(form.context_course ? { course: form.context_course } : {}),
            ...(form.context_section ? { section: form.context_section } : {}),
            ...(form.context_batchYear
              ? { batchYear: form.context_batchYear }
              : {}),
          },
        };
      }

      await api.patch(`/api/update-notification/${id}`, payload);

      setAlert("success", "Notification updated.");
      const slug = makeSlug(form.title) || "notification";
      navigate(`/single-notification/${slug}/${id}`);
    } catch (e) {
      const m =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Update failed.";
      setAlert("error", m);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          <div className="h-6 w-48 bg-gray-200 mb-6" />
          <div className="h-20 w-full bg-gray-200 mb-4" />
          <div className="h-40 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
      <form
        onSubmit={submit}
        className="bg-white p-4 md:p-6 rounded-lg border max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
              Update Notification
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Edit fields and save your changes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                saving ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
              }`}
              title="Save changes"
            >
              <FiSave className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <Link
              to={`/single-notification/${
                makeSlug(form.title) || "notification"
              }/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Back to details"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to Details
            </Link>
          </div>
        </div>

        {/* Sent lock banner */}
        {isSent && (
          <div className="mt-4 rounded-lg px-4 py-3 text-sm bg-amber-50 text-amber-900 border border-amber-200 flex items-start gap-2">
            <FiAlertCircle className="mt-0.5" />
            <div>
              <div className="font-semibold">
                This notification is already sent.
              </div>
              Title, message, channels, roles/users, and most fields can no
              longer be edited. You may still change <b>priority</b>,{" "}
              <b>expiresAt</b>, and <b>tags</b>.
            </div>
          </div>
        )}

        {/* Alert */}
        {msg.text ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
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
              <div className="mb-1 flex items-center gap-2">
                <FiHash /> Title
              </div>
              <input
                className="w-full border rounded px-3 py-2"
                name="title"
                value={form.title}
                onChange={handleBasicChange}
                placeholder="Enter a title"
                required
                disabled={isSent}
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiTag /> Category
              </div>
              <select
                className="w-full border rounded px-3 py-2"
                name="category"
                value={form.category}
                onChange={handleBasicChange}
                disabled={isSent}
              >
                <option value="">(none)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiCalendar /> Priority
              </div>
              <select
                className="w-full border rounded px-3 py-2"
                name="priority"
                value={form.priority}
                onChange={handleBasicChange}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {!isSent && (
              <label className="text-sm text-gray-700">
                <div className="mb-1 flex items-center gap-2">
                  <FiCalendar /> Status
                </div>
                <select
                  className="w-full border rounded px-3 py-2"
                  name="status"
                  value={form.status}
                  onChange={handleBasicChange}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">Message</div>
              <textarea
                className="w-full border rounded px-3 py-2 h-36"
                name="message"
                value={form.message}
                onChange={handleBasicChange}
                placeholder="Write the message body…"
                disabled={isSent}
              />
            </label>
          </div>
        </Section>

        {/* Audience & Channels */}
        <Section title="Audience & Channels">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1">Audience Type</div>
              <select
                className="w-full border rounded px-3 py-2"
                name="audienceType"
                value={form.audienceType}
                onChange={handleBasicChange}
                disabled={isSent}
              >
                {AUDIENCE_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm text-gray-700">
              <div className="mb-1">Channels</div>
              <div className="flex flex-wrap gap-3">
                {CHANNELS.map((ch) => (
                  <label key={ch} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(form.channels || []).includes(ch)}
                      onChange={() => handleChannelsToggle(ch)}
                      disabled={isSent}
                    />
                    <span>{ch}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">Roles Include</div>
              <div className="flex flex-wrap gap-3">
                {ROLES.map((r) => (
                  <label key={r} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(form.rolesInclude || []).includes(r)}
                      onChange={() => handleRolesToggle(r)}
                      disabled={isSent}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">
                Users Include (IDs or emails, comma-separated)
              </div>
              <input
                className="w-full border rounded px-3 py-2"
                name="usersInclude"
                value={(form.usersInclude || []).join(", ")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    usersInclude: String(e.target.value)
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="e.g., 64f..a2, user@example.com"
                disabled={isSent}
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Tags (comma-separated)</div>
              <input
                className="w-full border rounded px-3 py-2"
                name="tags"
                value={form.tags}
                onChange={handleBasicChange}
                placeholder="e.g., urgent, exams, campus"
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Scheduled At</div>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                name="scheduledAt"
                value={
                  form.scheduledAt
                    ? new Date(form.scheduledAt).toISOString().slice(0, 16)
                    : ""
                }
                onChange={handleBasicChange}
                disabled={isSent}
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Expires At</div>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                name="expiresAt"
                value={
                  form.expiresAt
                    ? new Date(form.expiresAt).toISOString().slice(0, 16)
                    : ""
                }
                onChange={handleBasicChange}
              />
            </label>

            <div className="text-xs text-gray-500 self-end">
              Created (info): <span className="font-medium">{createdHint}</span>
            </div>
          </div>
        </Section>

        {/* Context */}
        <Section title="Context (optional)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1">Degree</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.context_degree}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    context_degree: e.target.value,
                    context_semester: "",
                    context_course: "",
                  }))
                }
                disabled={isSent}
              >
                <option value="">(any)</option>
                {degreeList.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name || d.title || "Untitled Degree"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Semester</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.context_semester}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    context_semester: e.target.value,
                    context_course: "",
                  }))
                }
                disabled={isSent || !form.context_degree}
                title={!form.context_degree ? "Select degree first" : ""}
              >
                <option value="">
                  {form.context_degree ? "(any)" : "Select degree first"}
                </option>
                {semesterList.map((s) => {
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
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Course</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.context_course}
                onChange={(e) =>
                  setForm((f) => ({ ...f, context_course: e.target.value }))
                }
                disabled={
                  isSent || !form.context_degree || !form.context_semester
                }
                title={
                  !form.context_degree || !form.context_semester
                    ? "Select degree & semester first"
                    : ""
                }
              >
                <option value="">
                  {form.context_degree && form.context_semester
                    ? "(any)"
                    : "Select degree & semester first"}
                </option>
                {courseList.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || "Untitled Course"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Section</div>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.context_section}
                onChange={(e) =>
                  setForm((f) => ({ ...f, context_section: e.target.value }))
                }
                placeholder="e.g., A"
                disabled={isSent}
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Batch Year</div>
              <input
                className="w-full border rounded px-3 py-2"
                value={form.context_batchYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, context_batchYear: e.target.value }))
                }
                placeholder="e.g., 2025"
                disabled={isSent}
              />
            </label>
          </div>
        </Section>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
              saving ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
            }`}
          >
            <FiSave className="mr-2" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link
            to={`/single-notification/${
              makeSlug(form.title) || "notification"
            }/${id}`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            <FiArrowLeft className="mr-2" />
            Back to Details
          </Link>
          <Link
            to="/all-notifications"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Notifications
          </Link>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Tip: Once a notification is sent, only <b>priority</b>,{" "}
          <b>expiresAt</b>, and <b>tags</b> are editable.
        </div>
      </form>
    </div>
  );
}
