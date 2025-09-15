// src/pages/activities/SingleActivity.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config.js";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit,
  FiTrash2,
  FiCalendar,
  FiUsers,
  FiHash,
  FiTag,
  FiFlag,
  FiCheckCircle,
  FiSlash,
  FiPaperclip,
  FiExternalLink,
  FiSend,
  FiRotateCw,
  FiArchive,
  FiArrowLeft,
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

/** helpers */
const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const isArr = (x) => Array.isArray(x);
const asId = (x) => (typeof x === "object" && x ? x._id || x.id : x || "");
const toTags = (arr) =>
  isArr(arr)
    ? arr
    : String(arr || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

/** Robust ID extraction from activity.context */
const extractContextIds = (a) => {
  const c = a?.context || {};
  const degreeIds = []
    .concat(c.degrees || [], c.degreeIds || [], c.degree || [], a?.degreeId || [])
    .map(asId)
    .filter(Boolean);
  const semesterIds = []
    .concat(
      c.semesters || [],
      c.semesterIds || [],
      c.semester || [],
      c.semester || [],
      a?.semesterId || [],
      a?.semesterId || []
    )
    .map(asId)
    .filter(Boolean);
  const courseIds = []
    .concat(c.courses || [], c.courseIds || [], c.course || [], a?.courseId || [])
    .map(asId)
    .filter(Boolean);
  return {
    degreeIds: Array.from(new Set(degreeIds.map(String))),
    semesterIds: Array.from(new Set(semesterIds.map(String))),
    courseIds: Array.from(new Set(courseIds.map(String))),
  };
};

export default function SingleActivity() {
  const { id } = useParams(); // works with /single-activity/:slug/:id or /single-activity/:id
  const navigate = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [working, setWorking] = useState(false);

  // lookups
  const [degreeMap, setDegreeMap] = useState({});
  const [semMap, setSemMap] = useState({});
  const [courseMap, setCourseMap] = useState({});

  const setAlert = (type, text) => setMsg({ type, text });

  /** load activity */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setAlert("", "");
        const r = await api.get(`/api/get-activity/${id}`);
        const data = r?.data?.data || r?.data;
        if (!alive) return;
        setRow(data);
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

  /** load lookups for nicer labels */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dRes, sRes, cRes] = await Promise.allSettled([
          api.get("/api/list-degrees", { params: { page: 1, limit: 1000 } }),
          api.get("/api/semesters", { params: { page: 1, limit: 5000 } }),
          api.get("/api/list-courses", { params: { page: 1, limit: 10000 } }),
        ]);

        if (!alive) return;

        if (dRes.status === "fulfilled") {
          const arr = dRes.value?.data?.data || dRes.value?.data || [];
          const map = {};
          (arr || []).forEach((d) => {
            const key = String(d._id || d.id || "");
            if (key) map[key] = d.name || d.title || "Degree";
          });
          setDegreeMap(map);
        }
        if (sRes.status === "fulfilled") {
          const arr = sRes.value?.data?.data || sRes.value?.data || [];
          const map = {};
          (arr || []).forEach((s) => {
            const key = String(s._id || s.id || "");
            if (key)
              map[key] =
                s.title ||
                s.semester_name ||
                (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                "Semester";
          });
          setSemMap(map);
        }
        if (cRes.status === "fulfilled") {
          const arr = cRes.value?.data?.data || cRes.value?.data || [];
          const map = {};
          (arr || []).forEach((c) => {
            const key = String(c._id || c.id || "");
            if (key) map[key] = c.title || c.name || "Course";
          });
          setCourseMap(map);
        }
      } catch {
        /* ignore lookup errors */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** derived */
  const createdAt = useMemo(() => fmtDate(row?.createdAt), [row]);
  const updatedAt = useMemo(() => fmtDate(row?.updatedAt), [row]);
  const startAt = useMemo(() => fmtDate(row?.startAt), [row]);
  const endAt = useMemo(() => fmtDate(row?.endAt), [row]);

  const { degreeIds, semesterIds, courseIds } = useMemo(
    () => extractContextIds(row),
    [row]
  );

  const degreeNames = degreeIds.map((id) => degreeMap[id] || id);
  const semNames = semesterIds.map((id) => semMap[id] || id);
  const courseNames = courseIds.map((id) => courseMap[id] || id);

  /** actions */
  const doPublish = async () => {
    if (!row?._id) return;
    const confirmation =
      row.status === "published"
        ? "Re-publish / fan-out again to the audience?"
        : "Publish this activity to the audience?";
    const ok = window.confirm(confirmation);
    if (!ok) return;

    try {
      setWorking(true);
      setAlert("", "");
      const r = await api.post(`/api/publish-activity/${row._id}`);
      const updated = r?.data?.data || r?.data;
      setRow((prev) => ({ ...(updated || prev) }));
      const stats = r?.data?.assignments;
      setAlert(
        "success",
        stats
          ? `Published: ${stats.created} new assignments (${stats.totalUsers} total targeted).`
          : "Published."
      );
    } catch (e) {
      setAlert(
        "error",
        e?.response?.data?.message || e?.message || "Publish failed."
      );
    } finally {
      setWorking(false);
    }
  };

  const doArchive = async () => {
    if (!row?._id) return;
    const ok = window.confirm("Archive this activity?");
    if (!ok) return;
    try {
      setWorking(true);
      setAlert("", "");
      const r = await api.post(`/api/archive-activity/${row._id}`);
      const updated = r?.data?.data || r?.data;
      setRow((prev) => ({ ...(updated || prev) }));
      setAlert("success", "Activity archived.");
    } catch (e) {
      setAlert(
        "error",
        e?.response?.data?.message || e?.message || "Archive failed."
      );
    } finally {
      setWorking(false);
    }
  };

  const doDelete = async () => {
    if (!row?._id) return;
    const ok = window.confirm(
      "This will permanently delete the activity, assignments, and submissions. Continue?"
    );
    if (!ok) return;
    try {
      setWorking(true);
      setAlert("", "");
      await api.delete(`/api/delete-activity/${row._id}`);
      setAlert("success", "Activity deleted.");
      navigate("/all-activities");
    } catch (e) {
      setAlert(
        "error",
        e?.response?.data?.message || e?.message || "Delete failed."
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-8">
        <div className="bg-white p-6 md:p-8 rounded-lg border">
          <div className="h-6 w-48 bg-gray-200 mb-6" />
          <div className="h-20 w-full bg-gray-200 mb-4" />
          <div className="h-40 w-full bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-8">
        <div className="bg-white p-6 md:p-8 rounded-lg border">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            Activity not found.
          </div>
          <div className="mt-4">
            <Link to="/all-activities" className="text-gray-900 underline">
              ← Back to All Activities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tags = toTags(row?.tags);
  const audienceType = row?.audienceType || "all";
  const allowLate = !!row?.allowLate;
  const status = row?.status || "draft";

  return (
    <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-8">
      <div className="bg-white p-6 md:p-8 rounded-lg border">
        {/* header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {row?.title || "Untitled Activity"}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage status, publish, and see full details.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {status === "published" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle /> published
              </span>
            ) : status === "archived" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> archived
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 text-xs font-semibold">
                <FiFlag /> draft
              </span>
            )}

            <Link
              to={`/update-activity/${row._id}`}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-blue-600 hover:bg-blue-500"
              title="Edit / Update Activity"
            >
              <FiEdit className="h-4 w-4" />
              Edit
            </Link>

            <button
              onClick={doPublish}
              disabled={working}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                working ? "bg-gray-400" : "bg-green-600 hover:bg-green-500"
              }`}
              title={status === "published" ? "Republish (fan-out again)" : "Publish"}
            >
              {status === "published" ? (
                <>
                  <FiRotateCw className="h-4 w-4" />
                  Republish
                </>
              ) : (
                <>
                  <FiSend className="h-4 w-4" />
                  Publish
                </>
              )}
            </button>

            <button
              onClick={doArchive}
              disabled={working}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                working ? "bg-gray-400" : "bg-amber-600 hover:bg-amber-500"
              }`}
              title="Archive activity"
            >
              <FiArchive className="h-4 w-4" />
              Archive
            </button>

            <button
              onClick={doDelete}
              disabled={working}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                working ? "bg-gray-400" : "bg-red-600 hover:bg-red-500"
              }`}
              title="Delete activity"
            >
              <FiTrash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Alerts */}
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

        {/* BASIC */}
        <Section title="Basic" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {row._id}
                </code>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiUsers className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Audience:</span>{" "}
                {String(audienceType)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Created:</span> {createdAt}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Updated:</span> {updatedAt}
              </span>
            </div>
          </div>

          {/* Instructions */}
          {row?.instructions ? (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Instructions
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {row.instructions}
              </div>
            </div>
          ) : null}
        </Section>

        {/* TIMING & GRADING */}
        <Section title="Timing & Grading">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Start:</span> {startAt}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">End:</span> {endAt}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Late:</span>{" "}
              {allowLate ? "Allowed" : "Not allowed"}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Max Marks:</span>{" "}
              {typeof row?.maxMarks === "number" ? row.maxMarks : "—"}
            </p>
          </div>
        </Section>

        {/* AUDIENCE DETAILS */}
        <Section title="Audience Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {audienceType === "roles" ? (
              <p className="text-gray-700">
                <span className="font-medium">Roles:</span>{" "}
                {isArr(row?.roles) && row.roles.length
                  ? row.roles.join(", ")
                  : "—"}
              </p>
            ) : null}

            {audienceType === "users" ? (
              <p className="text-gray-700">
                <span className="font-medium">Users:</span>{" "}
                {isArr(row?.users) && row.users.length
                  ? `${row.users.length} user(s)`
                  : "—"}
              </p>
            ) : null}

            {audienceType === "contextual" || degreeIds.length || semesterIds.length || courseIds.length ? (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-900 font-medium mb-1">
                  Context
                </div>
                <div className="flex flex-wrap gap-2">
                  {degreeNames.map((n, i) => (
                    <span
                      key={`deg-${i}`}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      Degree: {n}
                    </span>
                  ))}
                  {semNames.map((n, i) => (
                    <span
                      key={`sem-${i}`}
                      className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      Semester: {n}
                    </span>
                  ))}
                  {courseNames.map((n, i) => (
                    <span
                      key={`crs-${i}`}
                      className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      Course: {n}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Section>

        {/* TAGS */}
        <Section title="Tags & Metadata">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Status:</span> {status}
            </p>
            {tags.length ? (
              <div className="text-gray-700 flex items-center gap-2 flex-wrap">
                <FiTag className="shrink-0" />
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded bg-gray-100 border"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-700">
                <span className="font-medium">Tags:</span> —
              </p>
            )}
          </div>
        </Section>

        {/* ATTACHMENTS */}
        <Section title="Attachments">
          {isArr(row?.attachments) && row.attachments.length ? (
            <ul className="space-y-2">
              {row.attachments.map((att, i) => {
                const url =
                  typeof att === "string"
                    ? att
                    : att?.url || att?.href || att?.path || "";
                const label =
                  typeof att === "string"
                    ? att.split("/").pop()
                    : att?.caption ||
                      att?.name ||
                      att?.label ||
                      url?.split("/").pop() ||
                      `Attachment ${i + 1}`;
                return (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <FiPaperclip className="shrink-0" />
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-1 break-all"
                      >
                        {label} <FiExternalLink />
                      </a>
                    ) : (
                      <span className="text-gray-800 break-all">{label}</span>
                    )}
                    <span className="text-gray-500 text-xs">
                      ({att?.type || "file"})
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm text-gray-700">No attachments.</div>
          )}
        </Section>

        {/* footer nav */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-activities"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to All Activities
          </Link>
          <Link
            to={`/update-activity/${row._id}`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            title="Edit this activity"
          >
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Activity
          </Link>
        </div>
      </div>
    </div>
  );
}

