// src/pages/quizzes/UpdateQuiz.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "../../config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
} from "react-icons/fi";

const API = globalBackendRoute;

// Select options
const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const cleanCsv = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const pad = (n) => String(n).padStart(2, "0");
const toInputDateTimeLocal = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${DD}T${hh}:${mm}`;
};

const normId = (v) =>
  !v ? "" : typeof v === "string" ? v : v._id || v.id || String(v);

const makeSlug = (s) =>
  String(s || "quiz")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const UpdateQuiz = () => {
  // include :slug param only for building the “view” link
  const { id, slug: slugParam } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // lookups
  const [allCourses, setAllCourses] = useState([]);

  const [form, setForm] = useState({
    course: "",

    quizName: "",
    quizCode: "",
    quizDurationMinutes: 60,
    passPercentage: 35,
    isPaid: false,
    numberOfAttemptsAllowed: 1,

    subject: "",
    totalMarks: 100,
    instructions: "Read all questions carefully before answering.",
    syllabusOutline: "",
    allowedLanguagesCsv: "",
    tagsCsv: "",

    startTimeLocal: "",
    endTimeLocal: "",

    negativeMarking: false,
    negativeMarkPerQuestion: 0,
    maxStudents: 0,
    difficulty: "medium",

    isPublished: false,

    slug: "",
  });

  const [attemptCount, setAttemptCount] = useState(0);
  const [createdBy, setCreatedBy] = useState("");

  // Load quiz + lookups
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        setMsg({ type: "", text: "" });

        const [quizRes, courseRes] = await Promise.allSettled([
          fetch(`${API}/api/get-quiz/${id}`).then((r) => r.json()),
          fetch(`${API}/api/list-courses?page=1&limit=5000`).then((r) =>
            r.json()
          ),
        ]);

        if (!active) return;

        if (quizRes.status !== "fulfilled" || !quizRes.value) {
          throw new Error("Failed to load quiz.");
        }
        const x = quizRes.value?.data || quizRes.value;
        if (!x || x.message) throw new Error(x?.message || "Quiz not found.");

        if (courseRes.status === "fulfilled") {
          setAllCourses(courseRes.value?.data || courseRes.value || []);
        }

        const courseId = normId(x.course);

        setForm({
          course: courseId || "",

          quizName: x.quizName || "",
          quizCode: x.quizCode || "",
          quizDurationMinutes:
            typeof x.quizDurationMinutes === "number"
              ? x.quizDurationMinutes
              : 60,
          passPercentage:
            typeof x.passPercentage === "number" ? x.passPercentage : 35,
          isPaid: !!x.isPaid,
          numberOfAttemptsAllowed:
            typeof x.numberOfAttemptsAllowed === "number"
              ? x.numberOfAttemptsAllowed
              : 1,

          subject: x.subject || "",
          totalMarks: typeof x.totalMarks === "number" ? x.totalMarks : 100,
          instructions:
            x.instructions || "Read all questions carefully before answering.",
          syllabusOutline: x.syllabusOutline || "",
          allowedLanguagesCsv: Array.isArray(x.allowedLanguages)
            ? x.allowedLanguages.join(", ")
            : "",
          tagsCsv: Array.isArray(x.tags) ? x.tags.join(", ") : "",

          startTimeLocal: toInputDateTimeLocal(x.startTime),
          endTimeLocal: toInputDateTimeLocal(x.endTime),

          negativeMarking: !!x.negativeMarking,
          negativeMarkPerQuestion:
            typeof x.negativeMarkPerQuestion === "number"
              ? x.negativeMarkPerQuestion
              : 0,
          maxStudents: typeof x.maxStudents === "number" ? x.maxStudents : 0,
          difficulty: x.difficulty || "medium",

          isPublished: !!x.isPublished,

          slug:
            x.slug || makeSlug(x.quizName || x.quizCode || slugParam || "quiz"),
        });

        setAttemptCount(
          typeof x.attemptCount === "number" ? x.attemptCount : 0
        );
        setCreatedBy(normId(x.createdBy));
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [API, id, slugParam]);

  const canSave = useMemo(() => {
    return (
      !!form.quizName.trim() &&
      !!form.quizCode.trim() &&
      !!form.course &&
      !saving
    );
  }, [form, saving]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMsg({ type: "", text: "" });
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!form.quizName.trim()) {
      setMsg({ type: "error", text: "Quiz Name is required." });
      return;
    }
    if (!form.quizCode.trim()) {
      setMsg({ type: "error", text: "Quiz Code is required." });
      return;
    }
    if (!form.course) {
      setMsg({
        type: "error",
        text: "Please select Course.",
      });
      return;
    }

    const payload = {
      course: form.course,

      quizName: form.quizName.trim(),
      quizCode: form.quizCode.trim(),
      quizDurationMinutes: Number(form.quizDurationMinutes) || 60,
      passPercentage: Number(form.passPercentage) || 0,
      isPaid: !!form.isPaid,
      numberOfAttemptsAllowed: Number(form.numberOfAttemptsAllowed) || 1,

      subject: form.subject.trim(),
      totalMarks: Number(form.totalMarks) || 100,
      instructions: form.instructions,
      syllabusOutline: form.syllabusOutline,
      allowedLanguages: cleanCsv(form.allowedLanguagesCsv),
      tags: cleanCsv(form.tagsCsv),

      negativeMarking: !!form.negativeMarking,
      negativeMarkPerQuestion: Number(form.negativeMarkPerQuestion) || 0,
      maxStudents: Number(form.maxStudents) || 0,
      difficulty: form.difficulty,

      isPublished: !!form.isPublished,
    };

    if (form.startTimeLocal)
      payload.startTime = new Date(form.startTimeLocal).toISOString();
    if (form.endTimeLocal)
      payload.endTime = new Date(form.endTimeLocal).toISOString();

    if (form.slug && form.slug.trim()) payload.slug = form.slug.trim();

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/update-quiz/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) throw new Error(body?.message || "Failed to update quiz.");

      setMsg({ type: "success", text: "Quiz updated successfully." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
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

  const viewSlug =
    form.slug ||
    makeSlug(form.quizName || form.quizCode || slugParam || "quiz");

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Update Quiz
            </h1>
            <p className="text-gray-600 mt-1">
              Edit and save changes to this quiz.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/single-quiz/${encodeURIComponent(viewSlug)}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Back to Quiz"
            >
              <FiRefreshCcw className="h-4 w-4" />
              View Quiz
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
            {msg.type === "success" ? (
              <FiCheckCircle className="inline mr-2" />
            ) : (
              <FiAlertTriangle className="inline mr-2" />
            )}
            {msg.text}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* Basic */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Quiz Name *
                </label>
                <input
                  name="quizName"
                  type="text"
                  value={form.quizName}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., BBA OIA – Quiz 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Quiz Code *
                </label>
                <input
                  name="quizCode"
                  type="text"
                  value={form.quizCode}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., BBA-OIA-Q1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Duration (minutes) *
                </label>
                <input
                  name="quizDurationMinutes"
                  type="number"
                  min={5}
                  value={form.quizDurationMinutes}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Pass %
                </label>
                <input
                  name="passPercentage"
                  type="number"
                  min={0}
                  max={100}
                  value={form.passPercentage}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Attempts Allowed
                </label>
                <input
                  name="numberOfAttemptsAllowed"
                  type="number"
                  min={1}
                  value={form.numberOfAttemptsAllowed}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 1"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    name="isPaid"
                    checked={form.isPaid}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Paid Quiz
                </label>

                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    name="negativeMarking"
                    checked={form.negativeMarking}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Negative Marking
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Negative Mark / Question
                  </label>
                  <input
                    name="negativeMarkPerQuestion"
                    type="number"
                    step="0.25"
                    min={0}
                    disabled={!form.negativeMarking}
                    value={form.negativeMarkPerQuestion}
                    onChange={onChange}
                    className={`mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 ${
                      form.negativeMarking ? "" : "bg-gray-100"
                    }`}
                    placeholder="0.25 / 0.33 etc."
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Difficulty
                </label>
                <select
                  name="difficulty"
                  value={form.difficulty}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Total Marks
                </label>
                <input
                  name="totalMarks"
                  type="number"
                  min={1}
                  value={form.totalMarks}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Max Students (0 = unlimited)
                </label>
                <input
                  name="maxStudents"
                  type="number"
                  min={0}
                  value={form.maxStudents}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 0"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-800">
                Subject *
              </label>
              <input
                name="subject"
                type="text"
                value={form.subject}
                onChange={onChange}
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                placeholder="e.g., BBA Operations & Inventory Analytics"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-800">
                Instructions
              </label>
              <textarea
                name="instructions"
                rows={3}
                value={form.instructions}
                onChange={onChange}
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-800">
                Syllabus Outline
              </label>
              <textarea
                name="syllabusOutline"
                rows={3}
                value={form.syllabusOutline}
                onChange={onChange}
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Allowed Languages (comma separated)
                </label>
                <input
                  name="allowedLanguagesCsv"
                  type="text"
                  value={form.allowedLanguagesCsv}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="English, Hindi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Tags (comma separated)
                </label>
                <input
                  name="tagsCsv"
                  type="text"
                  value={form.tagsCsv}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="BBA, Operations, Inventory, MongoDB"
                />
              </div>
            </div>
          </div>

          {/* Associations */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Associations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Course *
                </label>
                <select
                  name="course"
                  value={form.course || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {(allCourses || []).map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.title || c.name || c.code || "Untitled Course"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    name="startTimeLocal"
                    value={form.startTimeLocal}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    name="endTimeLocal"
                    value={form.endTimeLocal}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Visibility</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={form.isPublished}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Published
                </label>

                <div className="text-sm text-gray-700">
                  Attempt Count:{" "}
                  <span className="font-semibold">{attemptCount}</span>
                  {createdBy ? (
                    <>
                      {" "}
                      • Created By:{" "}
                      <span className="font-semibold">{createdBy}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSave}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                canSave
                  ? "bg-gray-900 hover:bg-gray-800"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
              title="Save changes"
            >
              <FiSave className="h-4 w-4" />{" "}
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <Link
              to={`/single-quiz/${encodeURIComponent(viewSlug)}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Cancel and view quiz"
            >
              <FiX className="h-4 w-4" /> Cancel
            </Link>

            <Link
              to="/all-quizes"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Back to All Quizzes
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateQuiz;
