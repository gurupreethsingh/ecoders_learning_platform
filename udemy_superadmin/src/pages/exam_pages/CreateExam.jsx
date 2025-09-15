import React, { useEffect, useMemo, useState } from "react";
import globalBackendRoute from "@/config/Config.js";
const DEGREES_PATH = "list-degrees";
const SEMESTERS_PATH = "semesters";
const LIST_COURSES_PATH = "list-courses"; // <- only list endpoint your server provides
const TOKEN_KEY = "token";
const CREATE_EXAM_PATH = "create-exam";

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
  return [];
}
function normalizeId(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return val._id || val.id || "";
  return String(val);
}
function arrayHasId(arr, id) {
  if (!Array.isArray(arr)) return false;
  const target = String(id);
  return arr.some((v) => normalizeId(v) === target);
}

/** Course belongs to selected semester (covers "semester" + "semester" spellings) */
function matchesSemester(course, semId, semesterObject) {
  if (!semId) return true;
  const s = String(semId);

  const directFields = [
    course.semester,
    course.semester,
    course.semesterId,
    course.semester_id,
    course.semId,
    course.sem_id,
    course.semesterRef,
    course.semesterRef,
    // ↓ commonly seen with this schema
    course.semesterId,
    course.semester_id,
  ].map(normalizeId);

  if (directFields.includes(s)) return true;
  if (normalizeId(course.semester?._id) === s) return true;
  if (normalizeId(course.semester?._id) === s) return true;

  if (arrayHasId(course.semesters, s)) return true;
  if (arrayHasId(course.semesters, s)) return true;
  if (arrayHasId(course.semesterIds, s)) return true;
  if (arrayHasId(course.semester_ids, s)) return true;
  if (arrayHasId(course.semesterIds, s)) return true;
  if (arrayHasId(course.semester_ids, s)) return true;

  // Heuristic: match "semX" in slug
  const semNum =
    semesterObject?.semNumber ||
    (typeof semesterObject?.semester_name === "string"
      ? Number((semesterObject.semester_name.match(/\d+/) || [])[0] || 0)
      : 0);
  if (semNum && typeof course.slug === "string") {
    const probe = `sem${semNum}`;
    if (course.slug.toLowerCase().includes(probe)) return true;
  }

  return false;
}

/** Course explicitly belongs to degree? (optional — many schemas put degree only on the semester) */
function matchesDegree(course, degId) {
  if (!degId) return true;
  const d = String(degId);

  const directFields = [
    course.degree,
    course.degreeId,
    course.degree_id,
    course.program,
    course.programId,
    course.program_id,
    course.degreeRef,
  ].map(normalizeId);

  if (directFields.includes(d)) return true;
  if (normalizeId(course.degree?._id) === d) return true;

  if (arrayHasId(course.degrees, d)) return true;
  if (arrayHasId(course.degreeIds, d)) return true;
  if (arrayHasId(course.degree_ids, d)) return true;

  return false;
}

function courseHasAnyDegreeInfo(course) {
  return !!(
    course.degree ||
    course.degreeId ||
    course.degree_id ||
    course.program ||
    course.programId ||
    course.program_id ||
    course.degreeRef ||
    (Array.isArray(course.degrees) && course.degrees.length) ||
    (Array.isArray(course.degreeIds) && course.degreeIds.length) ||
    (Array.isArray(course.degree_ids) && course.degree_ids.length) ||
    (course.degree && typeof course.degree === "object")
  );
}

/** Final filter: require semester match; degree match only if course actually carries degree fields */
function filterCoursesForSelection(
  courses,
  { semesterId, degreeId, semesterObj }
) {
  return (courses || []).filter((c) => {
    const semOK = matchesSemester(c, semesterId, semesterObj);
    if (!semOK) return false;
    if (!degreeId) return true; // no degree selected
    // If the course doesn't carry degree fields, trust the selected semester context (loaded by degree)
    return courseHasAnyDegreeInfo(c) ? matchesDegree(c, degreeId) : true;
  });
}

/* --------- Fetch courses (only real route + soft variants) ---------- */
async function fetchCoursesFor({ degreeId, semesterId, limit = 200, token }) {
  // Your backend lists at /list-courses. It may ignore filters; we filter client-side.
  // Try both "semester" and "semester" query keys in case the controller supports one.
  const candidates = [
    `${LIST_COURSES_PATH}?degree=${encodeURIComponent(
      degreeId
    )}&semester=${encodeURIComponent(semesterId)}&limit=${limit}`,
    `${LIST_COURSES_PATH}?degree=${encodeURIComponent(
      degreeId
    )}&semester=${encodeURIComponent(semesterId)}&limit=${limit}`,
    `${LIST_COURSES_PATH}?semester=${encodeURIComponent(
      semesterId
    )}&limit=${limit}`,
    `${LIST_COURSES_PATH}?semester=${encodeURIComponent(
      semesterId
    )}&limit=${limit}`,
    `${LIST_COURSES_PATH}?limit=${limit}`,
  ];

  for (const p of candidates) {
    const r = await apiGET(p, { token });
    if (r.ok) {
      const arr = normalizeArrayish(r.json);
      if (Array.isArray(arr)) return arr;
    }
  }

  // Last-ditch: some codebases also expose course/list
  const alt = await apiGET(`course/list?limit=${limit}`, { token });
  if (alt.ok) {
    const arr = normalizeArrayish(alt.json);
    if (Array.isArray(arr)) return arr;
  }

  // Nothing found
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

const CreateExam = () => {
  // auth
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // data
  const [degrees, setDegrees] = useState([]);
  const [degreeMeta, setDegreeMeta] = useState({}); // { [degId]: { semCount:number } }

  const [semesters, setSemesters] = useState([]);
  const [semMeta, setSemMeta] = useState({}); // { [semId]: { courseCount:number } }

  const [courses, setCourses] = useState([]);

  // selections
  const [degreeId, setDegreeId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");

  // UI state
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [probingDegreeSemCounts, setProbingDegreeSemCounts] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [probingSemCourseCounts, setProbingSemCourseCounts] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'success'|'error'|'info', text:''}

  // form
  const [form, setForm] = useState({
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
    allowedLanguages: "",
    tags: "",
    examDate: "",
    startTime: "",
    endTime: "",
    negativeMarking: false,
    negativeMarkPerQuestion: 0,
    maxStudents: 0,
    difficultyLevel: "medium",
  });

  // read token & user id
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY) || "";
    setToken(stored);
    const uid = getUserIdFromToken(stored);
    setCurrentUserId(uid || "");
  }, []);

  // load degrees
  useEffect(() => {
    (async () => {
      setLoadingDegrees(true);
      setMsg(null);
      const r = await apiGET(DEGREES_PATH, { token });
      const arr = normalizeArrayish(r.json);
      setDegrees(Array.isArray(arr) ? arr : []);
      setLoadingDegrees(false);

      // Probe which degrees have ANY semesters (limit=1 to keep it cheap)
      if (Array.isArray(arr) && arr.length) {
        setProbingDegreeSemCounts(true);
        const meta = {};
        for (const d of arr) {
          const id = d._id;
          const q = `${SEMESTERS_PATH}?degree=${encodeURIComponent(
            id
          )}&limit=1`;
          const s = await apiGET(q, { token });
          const sArr = normalizeArrayish(s.json);
          meta[id] = { semCount: Array.isArray(sArr) ? sArr.length : 0 };
        }
        setDegreeMeta(meta);
        setProbingDegreeSemCounts(false);
      }
    })();
  }, [token]);

  // load semesters when degree changes
  useEffect(() => {
    setSemesters([]);
    setSemMeta({});
    setSemesterId("");
    setCourses([]);
    setCourseId("");
    if (!degreeId) return;

    (async () => {
      setLoadingSemesters(true);
      setMsg(null);
      const q = `${SEMESTERS_PATH}?degree=${encodeURIComponent(
        degreeId
      )}&limit=200`;
      const r = await apiGET(q, { token });
      const arr = normalizeArrayish(r.json);
      setSemesters(Array.isArray(arr) ? arr : []);
      setLoadingSemesters(false);

      // After we have semesters, find which have at least one course
      if (Array.isArray(arr) && arr.length) {
        setProbingSemCourseCounts(true);

        // Load a big pool once, then count per semester to avoid many round trips.
        const allCourses = await fetchCoursesFor({
          degreeId,
          semesterId: "", // pool
          limit: 1000,
          token,
        });

        const meta = {};
        for (const s of arr) {
          const filtered = filterCoursesForSelection(allCourses, {
            semesterId: s._id,
            degreeId,
            semesterObj: s,
          });
          meta[s._id] = { courseCount: filtered.length };
        }
        setSemMeta(meta);
        setProbingSemCourseCounts(false);
      }
    })();
  }, [degreeId, token]);

  // load courses when both degree & semester are set
  useEffect(() => {
    setCourses([]);
    setCourseId("");
    if (!degreeId || !semesterId) return;

    (async () => {
      setLoadingCourses(true);
      setMsg(null);
      const raw = await fetchCoursesFor({
        degreeId,
        semesterId, // may be ignored by server; we'll filter below
        limit: 1000,
        token,
      });

      const semesterObj = (semesters || []).find((s) => s._id === semesterId);
      const filtered = filterCoursesForSelection(raw, {
        semesterId,
        degreeId,
        semesterObj,
      });

      setCourses(filtered);
      setLoadingCourses(false);
    })();
  }, [degreeId, semesterId, token, semesters]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const canSubmit = useMemo(() => {
    return (
      !!currentUserId &&
      !!degreeId &&
      !!semesterId &&
      !!courseId &&
      !!form.examName &&
      !!form.examCode &&
      Number(form.examDurationMinutes) >= 10 &&
      Number(form.passPercentage) >= 0 &&
      Number(form.passPercentage) <= 100
    );
  }, [
    currentUserId,
    degreeId,
    semesterId,
    courseId,
    form.examName,
    form.examCode,
    form.examDurationMinutes,
    form.passPercentage,
  ]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setMsg({
        type: "error",
        text: "Please fill Degree, Semester, Course, Exam Name, Exam Code, Duration (>=10), and Pass % (0–100).",
      });
      return;
    }

    const payload = {
      createdBy: currentUserId,
      degree: degreeId,
      semester: semesterId,
      course: courseId,

      examName: form.examName.trim(),
      examCode: form.examCode.trim(),
      examDurationMinutes: Number(form.examDurationMinutes),
      examType: form.examType,
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
      difficultyLevel: form.difficultyLevel,
    };

    if (form.examDate) payload.examDate = form.examDate;
    if (form.startTime)
      payload.startTime = new Date(form.startTime).toISOString();
    if (form.endTime) payload.endTime = new Date(form.endTime).toISOString();

    setSubmitting(true);
    setMsg(null);
    const r = await apiPOST(CREATE_EXAM_PATH, payload, { token });
    setSubmitting(false);

    if (!r.ok) {
      const err =
        (r.json && (r.json.error || r.json.message)) ||
        `Could not create exam (HTTP ${r.status}).`;
      setMsg({ type: "error", text: err });
      return;
    }

    setMsg({ type: "success", text: "✅ Exam created successfully." });

    // Reset fields but keep Degree/Semester/Course for quick next creation
    setForm({
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
      allowedLanguages: "",
      tags: "",
      examDate: "",
      startTime: "",
      endTime: "",
      negativeMarking: false,
      negativeMarkPerQuestion: 0,
      maxStudents: 0,
      difficultyLevel: "medium",
    });
  };

  /* --------------- Render --------------- */
  const degreesDisabledCount = degrees.filter(
    (d) => (degreeMeta[d._id]?.semCount || 0) === 0
  ).length;

  const selectedSemesters = semesters || [];
  const semestersDisabledCount = selectedSemesters.filter(
    (s) => (semMeta[s._id]?.courseCount || 0) === 0
  ).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F2F4F7" }}>
      <style>{`
        .card {
          background: #fff;
          border: 1px solid #EAECF0;
          border-radius: 16px;
          box-shadow: 0 6px 20px rgba(17, 24, 39, 0.06);
        }
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
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <h1 className="heading">Create Exam</h1>
            <span className="pill">
              Step: Degree → Semester → Course → Details
            </span>
          </div>

          {!token && (
            <div className="alert error">
              <strong>Auth token not found.</strong> Put your JWT in{" "}
              <code>localStorage.setItem("{TOKEN_KEY}", "...")</code>.
            </div>
          )}

          {!currentUserId && token && (
            <div className="alert error">
              <strong>Couldn’t extract user id from token.</strong> Expected{" "}
              <code>sub</code> / <code>userId</code> / <code>id</code>.
            </div>
          )}

          {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

          <form onSubmit={onSubmit}>
            {/* Degree */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Degree *</label>
              <select
                value={degreeId}
                onChange={(e) => setDegreeId(e.target.value)}
                style={niceInput}
                disabled={loadingDegrees || probingDegreeSemCounts}
                title={
                  probingDegreeSemCounts
                    ? "Checking which degrees have semesters..."
                    : ""
                }
              >
                <option value="">
                  {loadingDegrees
                    ? "Loading degrees..."
                    : probingDegreeSemCounts
                    ? "Checking semesters..."
                    : "Select Degree"}
                </option>

                {/* Enabled (have semesters) */}
                {degrees
                  .filter((d) => (degreeMeta[d._id]?.semCount || 0) > 0)
                  .map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name || d.code || d.slug || d._id}
                    </option>
                  ))}

                {/* Disabled (no semesters) */}
                {degrees
                  .filter((d) => (degreeMeta[d._id]?.semCount || 0) === 0)
                  .map((d) => (
                    <option key={d._id} value={d._id} disabled>
                      {(d.name || d.code || d.slug || d._id) +
                        "  — (no semesters added)"}
                    </option>
                  ))}
              </select>

              {!loadingDegrees && degreesDisabledCount > 0 && (
                <div className="subtle" style={{ marginTop: 6 }}>
                  {degreesDisabledCount} degree
                  {degreesDisabledCount > 1 ? "s are" : " is"} disabled because
                  they currently have no semesters.
                </div>
              )}
            </div>

            {/* Semester */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Semester *</label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                style={niceInput}
                disabled={
                  !degreeId || loadingSemesters || probingSemCourseCounts
                }
                title={
                  probingSemCourseCounts
                    ? "Checking which semesters have courses..."
                    : ""
                }
              >
                <option value="">
                  {!degreeId
                    ? "Select a degree first"
                    : loadingSemesters
                    ? "Loading semesters..."
                    : probingSemCourseCounts
                    ? "Checking courses..."
                    : "Select Semester"}
                </option>

                {/* Enabled (have courses) */}
                {selectedSemesters
                  .filter((s) => (semMeta[s._id]?.courseCount || 0) > 0)
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.semester_name ||
                        (s.semNumber ? `Sem ${s.semNumber}` : s._id)}
                    </option>
                  ))}

                {/* Disabled (no courses) */}
                {selectedSemesters
                  .filter((s) => (semMeta[s._id]?.courseCount || 0) === 0)
                  .map((s) => (
                    <option key={s._id} value={s._id} disabled>
                      {(s.semester_name ||
                        (s.semNumber ? `Sem ${s.semNumber}` : s._id)) +
                        " — (no courses yet)"}
                    </option>
                  ))}
              </select>

              {!loadingSemesters &&
                degreeId &&
                selectedSemesters.length === 0 && (
                  <div className="subtle" style={{ marginTop: 6 }}>
                    No semesters in the selected degree.
                  </div>
                )}

              {!loadingSemesters &&
                semestersDisabledCount > 0 &&
                selectedSemesters.length > 0 && (
                  <div className="subtle" style={{ marginTop: 6 }}>
                    {semestersDisabledCount} semester
                    {semestersDisabledCount > 1 ? "s have" : " has"} no courses
                    yet and {semestersDisabledCount > 1 ? "are" : "is"}{" "}
                    disabled.
                  </div>
                )}
            </div>

            {/* Course */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Course *</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                style={niceInput}
                disabled={!degreeId || !semesterId || loadingCourses}
              >
                <option value="">
                  {!semesterId
                    ? "Select a semester first"
                    : loadingCourses
                    ? "Loading courses..."
                    : "Select Course"}
                </option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.title || c.code || c._id}
                  </option>
                ))}
              </select>

              {!loadingCourses &&
                degreeId &&
                semesterId &&
                courses.length === 0 && (
                  <div className="subtle" style={{ marginTop: 6 }}>
                    No courses yet added to this semester. Please add to
                    proceed.
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
                <label style={labelStyle}>Exam Name *</label>
                <input
                  type="text"
                  name="examName"
                  value={form.examName}
                  onChange={onChange}
                  style={niceInput}
                  placeholder="e.g., English Final 2025"
                />
              </div>

              <div>
                <label style={labelStyle}>Exam Code *</label>
                <input
                  type="text"
                  name="examCode"
                  value={form.examCode}
                  onChange={onChange}
                  style={{ ...niceInput, textTransform: "uppercase" }}
                  placeholder="e.g., ENG-FIN-25"
                />
              </div>

              <div>
                <label style={labelStyle}>Duration (minutes) *</label>
                <input
                  type="number"
                  name="examDurationMinutes"
                  min={10}
                  value={form.examDurationMinutes}
                  onChange={onChange}
                  style={niceInput}
                />
              </div>

              <div>
                <label style={labelStyle}>Exam Type *</label>
                <select
                  name="examType"
                  value={form.examType}
                  onChange={onChange}
                  style={niceInput}
                >
                  {EXAM_TYPES.map((t) => (
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
                  Paid Exam
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
                <label style={labelStyle}>Difficulty</label>
                <select
                  name="difficultyLevel"
                  value={form.difficultyLevel}
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
              <label style={labelStyle}>Subject *</label>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={onChange}
                style={niceInput}
                placeholder="e.g., English"
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
                  placeholder="IELTS, Grammar, Listening"
                />
              </div>
            </div>

            <div style={{ ...grid3, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>Exam Date (optional)</label>
                <input
                  type="date"
                  name="examDate"
                  value={form.examDate}
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
              >
                {submitting ? "Creating..." : "Create Exam"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateExam;
