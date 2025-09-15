import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
} from "react-icons/fi";

const API = globalBackendRoute;

// Select options
const EXAM_TYPES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "half_yearly", label: "Half Yearly" },
  { value: "mid_term", label: "Mid Term" },
  { value: "preparatory", label: "Preparatory" },
  { value: "final", label: "Final Exam" },
];
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
const toInputDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
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
  String(s || "exam")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const courseMatchesSemester = (course, semesterId) => {
  if (!semesterId) return true;
  const s = String(semesterId);
  const direct = [
    course.semester,
    course.semester,
    course.semesterId,
    course.semesterId,
    course.semId,
  ]
    .map(normId)
    .some((x) => x === s);
  if (direct) return true;

  const objMatch =
    normId(course.semester) === s ||
    normId(course.semester) === s ||
    normId(course.semester?._id) === s ||
    normId(course.semester?._id) === s;

  const arrMatch = [course.semesters, course.semesters]
    .filter(Array.isArray)
    .some((arr) => arr.map(normId).includes(s));

  return objMatch || arrMatch;
};

const courseMatchesDegree = (course, degreeId) => {
  if (!degreeId) return true;
  const d = String(degreeId);
  const direct = [course.degree, course.degreeId, course.program]
    .map(normId)
    .some((x) => x === d);
  if (direct) return true;

  const objMatch =
    normId(course.degree) === d || normId(course.degree?._id) === d;
  const arrMatch = [course.degrees]
    .filter(Array.isArray)
    .some((arr) => arr.map(normId).includes(d));

  return objMatch || arrMatch;
};

const UpdateExam = () => {
  // include :slug param only for building the “view” link
  const { id, slug: slugParam } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // lookups
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  const [form, setForm] = useState({
    degree: "",
    semester: "",
    course: "",

    examName: "",
    examCode: "",
    examDurationMinutes: 60,
    examType: "final",
    passPercentage: 35,
    isPaid: false,
    numberOfAttemptsAllowed: 1,

    subject: "",
    totalMarks: 100,
    instructions: "Read all questions carefully before answering.",
    syllabusOutline: "",
    allowedLanguagesCsv: "",
    tagsCsv: "",

    examDate: "",
    startTimeLocal: "",
    endTimeLocal: "",

    negativeMarking: false,
    negativeMarkPerQuestion: 0,
    maxStudents: 0,
    difficultyLevel: "medium",

    isPublished: false,

    slug: "",
  });

  const [attemptCount, setAttemptCount] = useState(0);
  const [createdBy, setCreatedBy] = useState("");

  // Load exam + lookups
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        setMsg({ type: "", text: "" });

        const [examRes, degRes, semRes, courseRes] = await Promise.allSettled([
          fetch(`${API}/api/get-exam/${id}`).then((r) => r.json()),
          fetch(`${API}/api/list-degrees?page=1&limit=1000`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/semesters?page=1&limit=5000`).then((r) => r.json()),
          fetch(`${API}/api/list-courses?page=1&limit=5000`).then((r) =>
            r.json()
          ),
        ]);

        if (!active) return;

        if (examRes.status !== "fulfilled" || !examRes.value) {
          throw new Error("Failed to load exam.");
        }
        const x = examRes.value?.data || examRes.value;
        if (!x || x.message) throw new Error(x?.message || "Exam not found.");

        if (degRes.status === "fulfilled") {
          setDegrees(degRes.value?.data || degRes.value || []);
        }
        if (semRes.status === "fulfilled") {
          setSemesters(semRes.value?.data || semRes.value || []);
        }
        if (courseRes.status === "fulfilled") {
          setAllCourses(courseRes.value?.data || courseRes.value || []);
        }

        const degreeId = normId(x.degree);
        const semesterId = normId(x.semester ?? x.semester);
        const courseId = normId(x.course);

        setForm({
          degree: degreeId || "",
          semester: semesterId || "",
          course: courseId || "",

          examName: x.examName || "",
          examCode: x.examCode || "",
          examDurationMinutes:
            typeof x.examDurationMinutes === "number"
              ? x.examDurationMinutes
              : 60,
          examType: x.examType || "final",
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

          examDate: toInputDate(x.examDate),
          startTimeLocal: toInputDateTimeLocal(x.startTime),
          endTimeLocal: toInputDateTimeLocal(x.endTime),

          negativeMarking: !!x.negativeMarking,
          negativeMarkPerQuestion:
            typeof x.negativeMarkPerQuestion === "number"
              ? x.negativeMarkPerQuestion
              : 0,
          maxStudents: typeof x.maxStudents === "number" ? x.maxStudents : 0,
          difficultyLevel: x.difficultyLevel || "medium",

          isPublished: !!x.isPublished,

          slug:
            x.slug || makeSlug(x.examName || x.examCode || slugParam || "exam"),
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

  // Filter courses by degree + semester
  const filteredCourses = useMemo(() => {
    const { degree, semester } = form;
    return (allCourses || []).filter(
      (c) =>
        courseMatchesDegree(c, degree) && courseMatchesSemester(c, semester)
    );
  }, [allCourses, form.degree, form.semester]);

  const canSave = useMemo(() => {
    return (
      !!form.examName.trim() &&
      !!form.examCode.trim() &&
      !!form.degree &&
      !!form.semester &&
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

    if (!form.examName.trim()) {
      setMsg({ type: "error", text: "Exam Name is required." });
      return;
    }
    if (!form.examCode.trim()) {
      setMsg({ type: "error", text: "Exam Code is required." });
      return;
    }
    if (!form.degree || !form.semester || !form.course) {
      setMsg({
        type: "error",
        text: "Please select Degree, Semester and Course.",
      });
      return;
    }

    const payload = {
      degree: form.degree,
      semester: form.semester,
      course: form.course,

      examName: form.examName.trim(),
      examCode: form.examCode.trim(),
      examDurationMinutes: Number(form.examDurationMinutes) || 60,
      examType: form.examType,
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
      difficultyLevel: form.difficultyLevel,

      isPublished: !!form.isPublished,
    };

    if (form.examDate) payload.examDate = new Date(form.examDate).toISOString();
    if (form.startTimeLocal)
      payload.startTime = new Date(form.startTimeLocal).toISOString();
    if (form.endTimeLocal)
      payload.endTime = new Date(form.endTimeLocal).toISOString();

    if (form.slug && form.slug.trim()) payload.slug = form.slug.trim();

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/update-exam/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) throw new Error(body?.message || "Failed to update exam.");

      setMsg({ type: "success", text: "Exam updated successfully." });
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
            <Link to="/all-exams" className="text-gray-900 underline">
              ← Back to All Exams
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
    makeSlug(form.examName || form.examCode || slugParam || "exam");

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Update Exam
            </h1>
            <p className="text-gray-600 mt-1">
              Edit and save changes to this exam.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/single-exam/${encodeURIComponent(viewSlug)}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Back to Exam"
            >
              <FiRefreshCcw className="h-4 w-4" />
              View Exam
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
                  Exam Name *
                </label>
                <input
                  name="examName"
                  type="text"
                  value={form.examName}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., BBA OIA – Intermediate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Exam Code *
                </label>
                <input
                  name="examCode"
                  type="text"
                  value={form.examCode}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., BBA-OIA-INT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Duration (minutes) *
                </label>
                <input
                  name="examDurationMinutes"
                  type="number"
                  min={10}
                  value={form.examDurationMinutes}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 90"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Exam Type *
                </label>
                <select
                  name="examType"
                  value={form.examType}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
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
                  Paid Exam
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
                  name="difficultyLevel"
                  value={form.difficultyLevel}
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
                  Degree *
                </label>
                <select
                  name="degree"
                  value={form.degree || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {degrees.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.name || d.title || "Untitled Degree"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Semester *
                </label>
                <select
                  name="semester"
                  value={form.semester || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {semesters
                    .filter(
                      (s) => !form.degree || normId(s.degree) === form.degree
                    )
                    .map((s) => {
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
              </div>

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
                  {(filteredCourses.length ? filteredCourses : allCourses).map(
                    (c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.title || c.name || c.code || "Untitled Course"}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule & Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    name="examDate"
                    value={form.examDate}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
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
              to={`/single-exam/${encodeURIComponent(viewSlug)}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Cancel and view exam"
            >
              <FiX className="h-4 w-4" /> Cancel
            </Link>

            <Link
              to="/all-exams"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Back to All Exams
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateExam;
