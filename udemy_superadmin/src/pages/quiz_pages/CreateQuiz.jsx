import React, { useEffect, useMemo, useState } from "react";
import globalBackendRoute from "@/config/Config.js";
const LIST_COURSES_PATH = "list-courses";
const CREATE_QUIZ_PATH = "create-quiz";
const TOKEN_KEY = "token";
const DEBUG = false;

/* ---------------- URL helpers ---------------- */
const apiUrl = (path) => {
  const clean = String(path || "").replace(/^\/+/, "");
  return `${globalBackendRoute}/api/${clean}`;
};

/* ---------------- Fetch helpers (safe JSON) ---------------- */
async function apiGET(path, { token } = {}) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (DEBUG) console.log("[GET]", url, res.status, json || text?.slice(0, 120));
  return { ok: res.ok, status: res.status, url, json, text };
}

async function apiPOST(path, body, { token } = {}) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (DEBUG)
    console.log("[POST]", url, res.status, json || text?.slice(0, 120));
  return { ok: res.ok, status: res.status, url, json, text };
}

/* ---------------- JWT helpers ---------------- */
function safeParseJwt(token = "") {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return json && typeof json === "object" ? json : null;
  } catch {
    return null;
  }
}
function getUserIdFromToken(token) {
  const p = safeParseJwt(token);
  if (!p) return "";
  return p.sub || p.userId || p.id || p._id || "";
}

/* ---------------- Data helpers ---------------- */
function normalizeArrayish(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.items && Array.isArray(payload.items))
    return payload.items;
  return [];
}

/* --------- Fetch courses ---------- */
async function fetchAllCourses({ token, limit = 1000 }) {
  const r = await apiGET(`${LIST_COURSES_PATH}?limit=${limit}`, { token });
  if (r.ok) {
    const arr = normalizeArrayish(r.json);
    if (Array.isArray(arr)) return arr;
  }
  // fallback some codebases have:
  const alt = await apiGET(`course/list?limit=${limit}`, { token });
  if (alt.ok) {
    const arr = normalizeArrayish(alt.json);
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

/* ---------------- UI bits ---------------- */
const niceInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D0D5DD",
  boxShadow: "0 1px 2px rgba(16,24,40,0.05)",
  outline: "none",
  transition: "box-shadow .15s ease, border-color .15s ease",
};
const labelStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#344054",
  marginBottom: 6,
  display: "block",
};
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
const grid3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 };

const QUIZ_TYPES = [
  { value: "practice", label: "Practice" },
  { value: "chapter_end", label: "Chapter End" },
  { value: "module_end", label: "Module End" },
  { value: "final", label: "Final" },
];
const DIFFICULTIES = [
  { value: "basic", label: "Basic" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

/* ========================================================= */
const CreateQuiz = () => {
  // auth
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // data
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // selection
  const [courseId, setCourseId] = useState("");

  // ui
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  // form
  const [form, setForm] = useState({
    quizName: "",
    quizCode: "",
    quizDurationMinutes: 30,
    quizType: "practice",
    passPercentage: 35,
    isPaid: false,
    numberOfAttemptsAllowed: 1,

    subject: "",
    totalMarks: 100,
    instructions: "Read all questions carefully before answering.",
    syllabusOutline: "",
    allowedLanguages: "",
    tags: "",

    quizDate: "",
    startTime: "",
    endTime: "",

    negativeMarking: false,
    negativeMarkPerQuestion: 0,

    maxStudents: 0,
    difficulty: "basic",
  });

  const canSubmit = useMemo(() => {
    return (
      !!currentUserId &&
      !!courseId &&
      !!form.quizName &&
      !!form.quizCode &&
      Number(form.quizDurationMinutes) >= 5 &&
      Number(form.passPercentage) >= 0 &&
      Number(form.passPercentage) <= 100
    );
  }, [
    currentUserId,
    courseId,
    form.quizName,
    form.quizCode,
    form.quizDurationMinutes,
    form.passPercentage,
  ]);

  // read token & user id
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) || "";
    setToken(stored);
    const uid = getUserIdFromToken(stored);
    setCurrentUserId(uid || "");
  }, []);

  // load courses
  useEffect(() => {
    (async () => {
      setLoadingCourses(true);
      const list = await fetchAllCourses({ token, limit: 2000 });
      setCourses(Array.isArray(list) ? list : []);
      setLoadingCourses(false);
    })();
  }, [token]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setMsg({
        type: "error",
        text: "Please select a Course and fill Quiz Name, Quiz Code, Duration (>=5), and Pass % (0–100).",
      });
      return;
    }

    const payload = {
      createdBy: currentUserId,
      course: courseId,

      quizName: form.quizName.trim(),
      quizCode: form.quizCode.trim(),
      quizDurationMinutes: Number(form.quizDurationMinutes),
      quizType: form.quizType,
      passPercentage: Number(form.passPercentage),
      isPaid: !!form.isPaid,
      numberOfAttemptsAllowed: Number(form.numberOfAttemptsAllowed) || 1,

      subject: form.subject.trim(),
      totalMarks: Number(form.totalMarks) || 100,
      instructions: form.instructions,
      syllabusOutline: form.syllabusOutline,
      allowedLanguages: (form.allowedLanguages || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: (form.tags || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),

      negativeMarking: !!form.negativeMarking,
      negativeMarkPerQuestion: Number(form.negativeMarkPerQuestion) || 0,

      maxStudents: Number(form.maxStudents) || 0,
      difficulty: form.difficulty,
    };

    if (form.quizDate) payload.quizDate = form.quizDate;
    if (form.startTime)
      payload.startTime = new Date(form.startTime).toISOString();
    if (form.endTime) payload.endTime = new Date(form.endTime).toISOString();

    setSubmitting(true);
    setMsg(null);
    const r = await apiPOST(CREATE_QUIZ_PATH, payload, { token });
    setSubmitting(false);

    if (!r.ok) {
      const err =
        (r.json && (r.json.error || r.json.message)) ||
        `Could not create quiz (HTTP ${r.status}).`;
      setMsg({ type: "error", text: err });
      return;
    }

    setMsg({ type: "success", text: "✅ Quiz created successfully." });

    setForm({
      quizName: "",
      quizCode: "",
      quizDurationMinutes: 30,
      quizType: "practice",
      passPercentage: 35,
      isPaid: false,
      numberOfAttemptsAllowed: 1,

      subject: "",
      totalMarks: 100,
      instructions: "Read all questions carefully before answering.",
      syllabusOutline: "",
      allowedLanguages: "",
      tags: "",

      quizDate: "",
      startTime: "",
      endTime: "",

      negativeMarking: false,
      negativeMarkPerQuestion: 0,

      maxStudents: 0,
      difficulty: "basic",
    });
  };

  /* --------------- Render --------------- */
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* no gray background */}
      <style>{`
        /* removed .card styles — no card layout */
        .heading {
          font-size: 22px;
          font-weight: 700;
          color: #101828;
        }
        .subtle { color: #667085; }
        .btn {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid #1D2939;
          background: #111827;
          color: #fff;
          cursor: pointer;
          transition: transform .05s ease, box-shadow .15s ease;
          box-shadow: 0 4px 12px rgba(17,24,39,.15);
        }
        .btn:disabled { opacity: .6; cursor: not-allowed; }
        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(17,24,39,.22);
        }
        .pill {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #D0D5DD;
          background: #F9FAFB;
          font-size: 12px;
          color: #475467;
        }
        .alert {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid;
          margin-bottom: 14px;
        }
        .alert.error { border-color: #FDA29B; background: #FEF3F2; color: #B42318; }
        .alert.success { border-color: #A6F4C5; background: #ECFDF3; color: #027A48; }
        .alert.info { border-color: #B2DDFF; background: #EFF8FF; color: #175CD3; }
      `}</style>

      <div style={{ maxWidth: 1024, margin: "0 auto", padding: 20 }}>
        {/* Header row (no card) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "16px 0 10px",
          }}
        >
          <h1 className="heading">Create Quiz</h1>
          <span className="pill">Step: Course → Details</span>
        </div>

        {/* Alerts */}
        {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

        {!localStorage.getItem(TOKEN_KEY) && (
          <div className="alert error">
            <strong>Auth token not found.</strong> Put your JWT in{" "}
            <code>localStorage.setItem("{TOKEN_KEY}", "...")</code>.
          </div>
        )}
        {!currentUserId && localStorage.getItem(TOKEN_KEY) && (
          <div className="alert error">
            <strong>Couldn’t extract user id from token.</strong> Expected{" "}
            <code>sub</code> / <code>userId</code> / <code>id</code>.
          </div>
        )}

        <form onSubmit={onSubmit}>
          {/* Course */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Course *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={niceInput}
              disabled={loadingCourses}
            >
              <option value="">
                {loadingCourses ? "Loading courses..." : "Select Course"}
              </option>
              {courses.map((c, idx) => {
                const title = c.name || c.title || c.code || "Untitled Course";
                return (
                  <option key={c._id} value={c._id}>
                    {`${idx + 1}. ${title} — ${c._id}`}
                  </option>
                );
              })}
            </select>

            {!loadingCourses && courses.length === 0 && (
              <div className="subtle" style={{ marginTop: 6 }}>
                No courses available yet.
              </div>
            )}
          </div>

          <hr
            style={{
              border: 0,
              borderTop: "1px solid #EEF2F6",
              margin: "18px 0",
            }}
          />

          {/* Main grid */}
          <div style={grid2}>
            <div>
              <label style={labelStyle}>Quiz Name *</label>
              <input
                type="text"
                name="quizName"
                value={form.quizName}
                onChange={onChange}
                style={niceInput}
                placeholder="e.g., Python Loops Practice"
              />
            </div>

            <div>
              <label style={labelStyle}>Quiz Code *</label>
              <input
                type="text"
                name="quizCode"
                value={form.quizCode}
                onChange={onChange}
                style={{ ...niceInput, textTransform: "uppercase" }}
                placeholder="e.g., PY-LOOPS-P01"
              />
            </div>

            <div>
              <label style={labelStyle}>Duration (minutes) *</label>
              <input
                type="number"
                min={5}
                name="quizDurationMinutes"
                value={form.quizDurationMinutes}
                onChange={onChange}
                style={niceInput}
              />
            </div>

            <div>
              <label style={labelStyle}>Quiz Type *</label>
              <select
                name="quizType"
                value={form.quizType}
                onChange={onChange}
                style={niceInput}
              >
                {QUIZ_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Pass % *</label>
              <input
                type="number"
                name="passPercentage"
                min={0}
                max={100}
                value={form.passPercentage}
                onChange={onChange}
                style={niceInput}
              />
            </div>

            <div>
              <label style={labelStyle}>Attempts Allowed *</label>
              <input
                type="number"
                name="numberOfAttemptsAllowed"
                min={1}
                value={form.numberOfAttemptsAllowed}
                onChange={onChange}
                style={niceInput}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <label
                className="subtle"
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  name="isPaid"
                  checked={form.isPaid}
                  onChange={onChange}
                />{" "}
                Paid Quiz
              </label>
              <label
                className="subtle"
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  name="negativeMarking"
                  checked={form.negativeMarking}
                  onChange={onChange}
                />
                Negative Marking
              </label>
            </div>

            <div>
              <label style={labelStyle}>Negative Mark / Question</label>
              <input
                type="number"
                name="negativeMarkPerQuestion"
                min={0}
                step="0.25"
                disabled={!form.negativeMarking}
                value={form.negativeMarkPerQuestion}
                onChange={onChange}
                style={{
                  ...niceInput,
                  background: form.negativeMarking ? "#fff" : "#F2F4F7",
                }}
                placeholder="0.25 / 0.33 etc."
              />
            </div>

            <div>
              <label style={labelStyle}>Difficulty *</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={onChange}
                style={niceInput}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Total Marks</label>
              <input
                type="number"
                name="totalMarks"
                min={1}
                value={form.totalMarks}
                onChange={onChange}
                style={niceInput}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Subject</label>
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={onChange}
              style={niceInput}
              placeholder="e.g., Python"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Instructions</label>
            <textarea
              name="instructions"
              rows={3}
              value={form.instructions}
              onChange={onChange}
              style={{ ...niceInput, resize: "vertical" }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Syllabus Outline</label>
            <textarea
              name="syllabusOutline"
              rows={3}
              value={form.syllabusOutline}
              onChange={onChange}
              style={{ ...niceInput, resize: "vertical" }}
            />
          </div>

          <div style={{ ...grid2, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>
                Allowed Languages (comma separated)
              </label>
              <input
                type="text"
                name="allowedLanguages"
                value={form.allowedLanguages}
                onChange={onChange}
                style={niceInput}
                placeholder="English, Spanish, French"
              />
            </div>
            <div>
              <label style={labelStyle}>Tags (comma separated)</label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={onChange}
                style={niceInput}
                placeholder="Basics, Loops, Functions"
              />
            </div>
          </div>

          <div style={{ ...grid3, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>Quiz Date (optional)</label>
              <input
                type="date"
                name="quizDate"
                value={form.quizDate}
                onChange={onChange}
                style={niceInput}
              />
            </div>
            <div>
              <label style={labelStyle}>Start Time (optional)</label>
              <input
                type="datetime-local"
                name="startTime"
                value={form.startTime}
                onChange={onChange}
                style={niceInput}
              />
            </div>
            <div>
              <label style={labelStyle}>End Time (optional)</label>
              <input
                type="datetime-local"
                name="endTime"
                value={form.endTime}
                onChange={onChange}
                style={niceInput}
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Max Students (0 = unlimited)</label>
            <input
              type="number"
              name="maxStudents"
              min={0}
              value={form.maxStudents}
              onChange={onChange}
              style={niceInput}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn"
              type="submit"
              disabled={!canSubmit || submitting}
              title={!courseId ? "Select a course first" : ""}
            >
              {submitting ? "Creating..." : "Create Quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuiz;
