// src/pages/quiz_pages/SingleQuiz.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "../../config/Config.js";
import {
  FiCheckCircle,
  FiSlash,
  FiCalendar,
  FiRefreshCcw,
  FiTag,
  FiHash,
  FiClock,
  FiBookOpen,
  FiEdit,
  FiStar,
  FiFlag,
  FiTrendingUp,
  FiAlertTriangle,
} from "react-icons/fi";

const API = globalBackendRoute;

const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const joinList = (arr) =>
  Array.isArray(arr) && arr.length ? arr.join(", ") : "—";
const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
};
const makeSlug = (s) =>
  String(s || "quiz")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// Safe ID extractor (works for populated objects or raw IDs)
const getId = (val) => {
  if (!val) return "—";
  if (typeof val === "object") return val._id || val.id || "—";
  return val; // string/ObjectId as string
};

const SingleQuiz = () => {
  const { id, slug: slugParam } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  // Lookups (in case backend didn't populate)
  const [courseMap, setCourseMap] = useState({});
  const [userMap, setUserMap] = useState({}); // optional, best-effort

  useEffect(() => {
    let active = true;

    const loadQuiz = async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${API}/api/get-quiz/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to fetch quiz.");
        if (!active) return;

        setData(json?.data || json); // support {data} or plain object
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    };

    const loadLookups = async () => {
      try {
        const [courses, users] = await Promise.allSettled([
          fetch(`${API}/api/list-courses?page=1&limit=2000`).then((r) =>
            r.json()
          ),
          // optional; may not exist — best-effort:
          fetch(`${API}/api/get-instructors`)
            .then((r) => r.json())
            .catch(() => ({})),
        ]);

        if (!active) return;

        if (courses.status === "fulfilled") {
          const list = courses.value?.data || courses.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((c) => {
            map[c._id || c.id] = c.title || c.name || c.code || "Course";
          });
          setCourseMap(map);
        }

        if (users.status === "fulfilled") {
          const list = users.value?.data || users.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((u) => {
            map[u._id || u.id] = u.name || u.fullName || u.email || "User";
          });
          setUserMap(map);
        }
      } catch {
        /* ignore */
      }
    };

    loadQuiz();
    loadLookups();

    return () => {
      active = false;
    };
  }, [API, id]);

  // Safe slug for links
  const viewSlug = useMemo(() => {
    if (data?.slug) return data.slug;
    if (slugParam) return slugParam;
    return makeSlug(data?.quizName || data?.quizCode);
  }, [data, slugParam]);

  // Derived fields
  const createdAt = useMemo(
    () => (data?.createdAt ? new Date(data.createdAt).toLocaleString() : "—"),
    [data]
  );
  const updatedAt = useMemo(
    () => (data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"),
    [data]
  );

  const courseName =
    (typeof data?.course === "object" &&
      (data?.course?.title || data?.course?.name || data?.course?.code)) ||
    courseMap[data?.course] ||
    (typeof data?.course === "string" ? data.course : "—");

  const createdByName =
    (typeof data?.createdBy === "object" &&
      (data?.createdBy?.name ||
        data?.createdBy?.fullName ||
        data?.createdBy?.email)) ||
    userMap[data?.createdBy] ||
    (typeof data?.createdBy === "string" ? data.createdBy : "—");

  const quizId = data?._id || data?.id || "—";
  const courseId = getId(data?.course);

  // Flags (handle multiple possible fields)
  const isPublished = !!(data?.isPublished ?? data?.published ?? false);
  const difficulty = data?.difficulty ?? data?.difficultyLevel ?? "—";
  const type = data?.quizType ?? data?.type ?? "—";

  // Actions
  const togglePublish = async () => {
    if (!data?._id) return;
    const willPublish = !isPublished;
    const ok = window.confirm(
      `${willPublish ? "Publish" : "Unpublish"} "${
        data.quizName || data.quizCode
      }"?`
    );
    if (!ok) return;
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });

      const url = willPublish
        ? `${API}/api/publish-quiz/${data._id}`
        : `${API}/api/unpublish-quiz/${data._id}`;
      const res = await fetch(url, { method: "PATCH" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to change publish state.");

      setData((p) => (p ? { ...p, isPublished: willPublish } : p));
      setMsg({
        type: "success",
        text: willPublish ? "Quiz published." : "Quiz unpublished.",
      });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Action failed." });
    } finally {
      setBusy(false);
    }
  };

  const duplicateQuiz = async () => {
    if (!data?._id) return;
    const ok = window.confirm(
      `Duplicate quiz "${data.quizName || data.quizCode}"?`
    );
    if (!ok) return;
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });
      const res = await fetch(`${API}/api/duplicate-quiz/${data._id}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Duplicate failed.");
      setMsg({ type: "success", text: "Quiz duplicated successfully." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Duplicate failed." });
    } finally {
      setBusy(false);
    }
  };

  const deleteQuiz = async () => {
    if (!data?._id) return;
    const ok = window.confirm(
      `Delete quiz "${data.quizName || data.quizCode}"? This cannot be undone.`
    );
    if (!ok) return;
    try {
      setBusy(true);
      const res = await fetch(`${API}/api/delete-quiz/${data._id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Delete failed.");
      setMsg({ type: "success", text: "Quiz deleted. Navigate back to list." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Delete failed." });
    } finally {
      setBusy(false);
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

  if (err) {
    return (
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {err}
          </div>
          <div className="mt-4 flex gap-3">
            <Link to="/all-quizes" className="text-gray-900 underline">
              ← Back to All Quizzes
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Title & actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Quiz Details
            </h1>
            <p className="text-gray-600 mt-1">
              View quiz information, relations, schedule and actions.
            </p>

            {/* Quiz ID under the header */}
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <FiHash className="text-purple-600" />
              <code className="bg-gray-100 border px-2 py-0.5 rounded">
                {quizId}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isPublished ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle /> Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> Draft
              </span>
            )}
            {difficulty && difficulty !== "—" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-xs font-semibold">
                <FiTrendingUp /> {difficulty}
              </span>
            ) : null}
            {type && type !== "—" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold">
                <FiFlag /> {type}
              </span>
            ) : null}

            <button
              onClick={togglePublish}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
              }`}
              title={isPublished ? "Unpublish" : "Publish"}
            >
              <FiRefreshCcw className="h-4 w-4" />
              {isPublished ? "Unpublish" : "Publish"}
            </button>

            <button
              onClick={duplicateQuiz}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-yellow-600 hover:bg-yellow-500"
              }`}
              title="Duplicate quiz"
            >
              <FiStar className="h-4 w-4" />
              Duplicate
            </button>

            <button
              onClick={deleteQuiz}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                busy ? "bg-gray-400" : "bg-red-600 hover:bg-red-500"
              }`}
              title="Delete quiz"
            >
              <FiAlertTriangle className="h-4 w-4" />
              Delete
            </button>

            <Link
              to={`/update-quiz/${encodeURIComponent(viewSlug)}/${data._id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-500"
              title="Update Quiz"
            >
              <FiEdit className="h-4 w-4" />
              Update
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {msg.text ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              msg.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <div className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Quiz ID field in Basic section */}
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Quiz ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {quizId}
                </code>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Quiz Name:</span>{" "}
                {pretty(data.quizName)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Quiz Code:</span>{" "}
                {pretty(data.quizCode)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiBookOpen className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Subject:</span>{" "}
                {pretty(data.subject)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiClock className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Duration:</span>{" "}
                {data.quizDurationMinutes
                  ? `${data.quizDurationMinutes} min`
                  : "—"}
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

          {data.instructions ? (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Instructions
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {data.instructions}
              </div>
            </div>
          ) : null}

          {data.syllabusOutline ? (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Syllabus Outline
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {data.syllabusOutline}
              </div>
            </div>
          ) : null}
        </div>

        {/* Relations */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Relations</h3>

            {/* Course name + ID */}
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span className="font-medium">Course:</span>
              <span className="truncate">{courseName}</span>
              <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                {courseId}
              </code>
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Ownership</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Created By:</span> {createdByName}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Attempts Allowed:</span>{" "}
              {Number(data.numberOfAttemptsAllowed || 1)}
            </p>
          </div>

          <div className="rounded-lg border p-4 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-2">Labels</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Allowed Languages:</span>{" "}
              {joinList(data.allowedLanguages)}
            </p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <FiTag />
              <span>
                <span className="font-medium">Tags:</span> {joinList(data.tags)}
              </span>
            </p>
          </div>
        </div>

        {/* Quiz Settings */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Scoring</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Total Marks:</span>{" "}
              {data.totalMarks ?? "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Pass Percentage:</span>{" "}
              {data.passPercentage ?? "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Negative Marking:</span>{" "}
              {data.negativeMarking ? "Yes" : "No"}
              {data.negativeMarking ? (
                <>
                  {" "}
                  • <span className="font-medium">Per Question:</span>{" "}
                  {data.negativeMarkPerQuestion ?? 0}
                </>
              ) : null}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Constraints</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Max Students:</span>{" "}
              {Number(data.maxStudents || 0) === 0
                ? "Unlimited"
                : Number(data.maxStudents)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Is Paid:</span>{" "}
              {data.isPaid ? "Yes" : "No"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Difficulty:</span>{" "}
              {pretty(difficulty)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Type:</span> {pretty(type)}
            </p>
          </div>
        </div>

        {/* Schedule */}
        {(data.quizDate || data.startTime || data.endTime) && (
          <div className="mt-6 rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-800">
                <FiCalendar className="shrink-0" />
                <span className="truncate">
                  <span className="font-medium">Quiz Date:</span>{" "}
                  {fmtDateTime(data.quizDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-800">
                <FiCalendar className="shrink-0" />
                <span className="truncate">
                  <span className="font-medium">Start Time:</span>{" "}
                  {fmtDateTime(data.startTime)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-800">
                <FiCalendar className="shrink-0" />
                <span className="truncate">
                  <span className="font-medium">End Time:</span>{" "}
                  {fmtDateTime(data.endTime)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-quizes"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Quizzes
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SingleQuiz;
