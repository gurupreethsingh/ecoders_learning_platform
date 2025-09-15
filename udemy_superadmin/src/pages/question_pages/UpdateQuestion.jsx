// src/pages/question_pages/UpdateQuestion.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
  FiPlus,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiChevronDown,
  FiChevronRight,
  FiMinimize2,
  FiMaximize2,
  FiToggleRight,
  FiCopy,
} from "react-icons/fi";

const API = globalBackendRoute;

const QUESTION_TYPES = ["mcq", "true_false", "theory", "programming", "direct"];
const DIFFICULTY = ["easy", "medium", "hard"];
const ANSWER_STATUS = ["correct", "incorrect", "unanswered"];

const SECTION_KEYS = [
  "basic",
  "typeSpecific",
  "scoring",
  "associations",
  "metadata",
  "attachments",
  "visibility",
  "linkage",
  "bulk",
];

const NA = "Information not available at this time.";
const cleanCsv = (s) =>
  String(s || "")
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

const toBoolOrUndef = (v) =>
  v === "" || v === null || v === undefined ? undefined : Boolean(v);

const Toast = ({ text, onClose }) => {
  if (!text) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg">
        <FiCheckCircle className="h-4 w-4" />
        <span className="text-sm">{text}</span>
        <button
          onClick={onClose}
          className="ml-2 rounded px-2 py-0.5 text-xs bg-white/10 hover:bg-white/20"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const emptyOption = () => ({ key: "", text: "", media: [] });
const emptyMedia = () => ({ type: "image", url: "", caption: "" });
const emptyTestcase = () => ({ input: "", expectedOutput: "", weight: 1 });
const emptyAttachment = () => ({ type: "image", url: "", caption: "" });

export default function UpdateQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // toast
  const [toastText, setToastText] = useState("");
  const toastTimerRef = useRef(null);
  const showToast = (t) => {
    setToastText(t);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastText(""), 2500);
  };
  useEffect(() => {
    return () => toastTimerRef.current && clearTimeout(toastTimerRef.current);
  }, []);

  // collapsible sections — start COLLAPSED
  const [sectionCollapsed, setSectionCollapsed] = useState(
    SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {})
  );
  const toggleSection = (key) =>
    setSectionCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const setAllSectionsCollapsed = (collapsed) =>
    setSectionCollapsed(
      SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: collapsed }), {})
    );

  // lookups
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  // main form
  const [form, setForm] = useState({
    question_text: "",
    question_type: "mcq",

    // mcq
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
    correctOptionIndex: 0,
    randomizeOptions: true,

    // true/false
    correctBoolean: "", // "", true, false

    // theory
    theory_answer: "",
    rubric: "",
    maxWords: "",

    // programming
    programming_language: "",
    starterCode: "",
    testcases: [],

    // direct
    direct_answer: "",

    // scoring / evaluation
    marks_alloted: 1,
    negativeMarkPerQuestion: 0,
    timeLimitSeconds: 0,
    marks_scored: 0,
    answer_status: "unanswered",

    // relations
    degree: "",
    semester: "",
    course: "",
    exam: "",
    quiz: "",

    // classification
    topic: "",
    subtopic: "",
    chapter: "",
    learningOutcomesCsv: "",
    difficultyLevel: "medium",
    language: "English",
    tagsCsv: "",

    // explanation
    explanation: "",

    // attachments
    attachments: [],

    // lifecycle
    order: 0,
    section: "",
    isActive: true,
    status: "draft",
    version: 1,
  });

  // quick inputs for linkage
  const [linkQuizId, setLinkQuizId] = useState("");
  const [linkExamId, setLinkExamId] = useState("");

  // bulk ops
  const [bulkIdsCsv, setBulkIdsCsv] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkSection, setBulkSection] = useState("");
  const [bulkMarks, setBulkMarks] = useState("");
  const [bulkQuizId, setBulkQuizId] = useState("");
  const [bulkExamId, setBulkExamId] = useState("");

  /* ----------------------------- LOAD ----------------------------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        setMsg({ type: "", text: "" });

        const [qRes, deg, sem, crs, exm, qz] = await Promise.allSettled([
          fetch(`${API}/api/get-question/${id}`).then((r) => r.json()),
          fetch(`${API}/api/list-degrees?page=1&limit=1000`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/semesters?page=1&limit=2000`).then((r) => r.json()),
          fetch(`${API}/api/list-courses?page=1&limit=5000`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/list-exams?page=1&limit=5000`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/list-quizzes?page=1&limit=5000`).then((r) =>
            r.json()
          ),
        ]);

        if (!active) return;

        if (qRes.status !== "fulfilled" || !qRes.value) {
          throw new Error("Failed to load question.");
        }
        const q = qRes.value?.data || qRes.value;
        if (!q || q.message)
          throw new Error(q?.message || "Question not found.");

        setForm({
          // core
          question_text: q.question_text || "",
          question_type: q.question_type || "mcq",

          // mcq
          options:
            Array.isArray(q.options) && q.options.length === 4
              ? q.options.map((o) => ({
                  key: o.key || "",
                  text: o.text || "",
                  media: Array.isArray(o.media)
                    ? o.media.map((m) => ({
                        type: m.type || "image",
                        url: m.url || "",
                        caption: m.caption || "",
                      }))
                    : [],
                }))
              : [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
          correctOptionIndex:
            typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0,
          randomizeOptions:
            typeof q.randomizeOptions === "boolean" ? q.randomizeOptions : true,

          // true/false
          correctBoolean:
            typeof q.correctBoolean === "boolean" ? q.correctBoolean : "",

          // theory
          theory_answer: q.theory_answer || "",
          rubric: q.rubric || "",
          maxWords:
            typeof q.maxWords === "number" && q.maxWords > 0 ? q.maxWords : "",

          // programming
          programming_language: q.programming_language || "",
          starterCode: q.starterCode || "",
          testcases: Array.isArray(q.testcases)
            ? q.testcases.map((t) => ({
                input: t.input || "",
                expectedOutput: t.expectedOutput || "",
                weight:
                  typeof t.weight === "number" && t.weight > 0 ? t.weight : 1,
              }))
            : [],

          // direct
          direct_answer: q.direct_answer || "",

          // scoring
          marks_alloted:
            typeof q.marks_alloted === "number" ? q.marks_alloted : 1,
          negativeMarkPerQuestion:
            typeof q.negativeMarkPerQuestion === "number"
              ? q.negativeMarkPerQuestion
              : 0,
          timeLimitSeconds:
            typeof q.timeLimitSeconds === "number" ? q.timeLimitSeconds : 0,
          marks_scored: typeof q.marks_scored === "number" ? q.marks_scored : 0,
          answer_status: q.answer_status || "unanswered",

          // relations
          degree: q.degree?._id || q.degree || "",
          semester: q.semester?._id || q.semester || "",
          course: q.course?._id || q.course || "",
          exam: q.exam?._id || q.exam || "",
          quiz: q.quiz?._id || q.quiz || "",

          // metadata
          topic: q.topic || "",
          subtopic: q.subtopic || "",
          chapter: q.chapter || "",
          learningOutcomesCsv: Array.isArray(q.learningOutcomes)
            ? q.learningOutcomes.join(", ")
            : "",
          difficultyLevel: q.difficultyLevel || "medium",
          language: q.language || "English",
          tagsCsv: Array.isArray(q.tags) ? q.tags.join(", ") : "",

          explanation: q.explanation || "",

          // attachments
          attachments: Array.isArray(q.attachments)
            ? q.attachments.map((a) => ({
                type: a.type || "image",
                url: a.url || "",
                caption: a.caption || "",
              }))
            : [],

          // lifecycle
          order: typeof q.order === "number" ? q.order : 0,
          section: q.section || "",
          isActive: !!q.isActive,
          status: q.status || "draft",
          version: typeof q.version === "number" ? q.version : 1,
        });

        const toArr = (val) =>
          Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.rows)
            ? val.rows
            : Array.isArray(val)
            ? val
            : Array.isArray(val?.data?.rows)
            ? val.data.rows
            : [];

        if (deg.status === "fulfilled") setDegrees(toArr(deg.value));
        if (sem.status === "fulfilled") setSemesters(toArr(sem.value));
        if (crs.status === "fulfilled") setCourses(toArr(crs.value));
        if (exm.status === "fulfilled") setExams(toArr(exm.value));
        if (qz.status === "fulfilled") setQuizzes(toArr(qz.value));
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [API, id]);

  const canSave = useMemo(
    () => form.question_text.trim() && !saving,
    [form, saving]
  );

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMsg({ type: "", text: "" });
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* ----------------------- TYPE SWITCH CLEANUP ----------------------- */
  const onTypeChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, question_type: val };
      if (val === "mcq") {
        if (!Array.isArray(prev.options) || prev.options.length !== 4) {
          next.options = [
            emptyOption(),
            emptyOption(),
            emptyOption(),
            emptyOption(),
          ];
        }
        next.correctOptionIndex =
          typeof prev.correctOptionIndex === "number"
            ? prev.correctOptionIndex
            : 0;
        next.randomizeOptions = prev.randomizeOptions ?? true;
        next.correctBoolean = "";
        next.theory_answer = "";
        next.rubric = "";
        next.maxWords = "";
        next.programming_language = "";
        next.starterCode = "";
        next.testcases = [];
        next.direct_answer = "";
      } else if (val === "true_false") {
        next.correctBoolean =
          prev.correctBoolean === "" ? "" : Boolean(prev.correctBoolean);
        next.options = undefined;
        next.correctOptionIndex = undefined;
        next.randomizeOptions = prev.randomizeOptions ?? true; // harmless
        next.theory_answer = "";
        next.rubric = "";
        next.maxWords = "";
        next.programming_language = "";
        next.starterCode = "";
        next.testcases = [];
        next.direct_answer = "";
      } else if (val === "theory") {
        next.theory_answer = prev.theory_answer || "";
        next.rubric = prev.rubric || "";
        next.maxWords = prev.maxWords || "";
        next.options = undefined;
        next.correctOptionIndex = undefined;
        next.correctBoolean = "";
        next.programming_language = "";
        next.starterCode = "";
        next.testcases = [];
        next.direct_answer = "";
      } else if (val === "programming") {
        next.programming_language = prev.programming_language || "";
        next.starterCode = prev.starterCode || "";
        next.testcases = Array.isArray(prev.testcases) ? prev.testcases : [];
        next.options = undefined;
        next.correctOptionIndex = undefined;
        next.correctBoolean = "";
        next.theory_answer = "";
        next.rubric = "";
        next.maxWords = "";
        next.direct_answer = "";
      } else if (val === "direct") {
        next.direct_answer = prev.direct_answer || "";
        next.options = undefined;
        next.correctOptionIndex = undefined;
        next.correctBoolean = "";
        next.theory_answer = "";
        next.rubric = "";
        next.maxWords = "";
        next.programming_language = "";
        next.starterCode = "";
        next.testcases = [];
      }
      return next;
    });
  };

  /* ----------------------- MCQ handlers ----------------------- */
  const updateOption = (idx, field, value) => {
    setForm((prev) => {
      const list = [...prev.options];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, options: list };
    });
  };

  const addOptionMedia = (idx) => {
    setForm((prev) => {
      const list = [...prev.options];
      const medias = Array.isArray(list[idx].media) ? [...list[idx].media] : [];
      medias.push(emptyMedia());
      list[idx] = { ...list[idx], media: medias };
      return { ...prev, options: list };
    });
  };

  const updateOptionMedia = (idx, mIdx, field, value) => {
    setForm((prev) => {
      const list = [...prev.options];
      const medias = [...(list[idx].media || [])];
      medias[mIdx] = { ...medias[mIdx], [field]: value };
      list[idx] = { ...list[idx], media: medias };
      return { ...prev, options: list };
    });
  };

  const removeOptionMedia = (idx, mIdx) => {
    setForm((prev) => {
      const list = [...prev.options];
      const medias = [...(list[idx].media || [])].filter((_, i) => i !== mIdx);
      list[idx] = { ...list[idx], media: medias };
      return { ...prev, options: list };
    });
  };

  /* ----------------------- Testcase handlers ----------------------- */
  const addTestcase = () =>
    setForm((prev) => ({
      ...prev,
      testcases: [...(prev.testcases || []), emptyTestcase()],
    }));

  const updateTestcase = (i, field, value) =>
    setForm((prev) => {
      const list = [...(prev.testcases || [])];
      list[i] = { ...list[i], [field]: value };
      return { ...prev, testcases: list };
    });

  const removeTestcase = (i) =>
    setForm((prev) => ({
      ...prev,
      testcases: (prev.testcases || []).filter((_, idx) => idx !== i),
    }));

  /* ----------------------- Attachment handlers ----------------------- */
  const addAttachment = () =>
    setForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), emptyAttachment()],
    }));

  const updateAttachment = (i, field, value) =>
    setForm((prev) => {
      const list = [...(prev.attachments || [])];
      list[i] = { ...list[i], [field]: value };
      return { ...prev, attachments: list };
    });

  const removeAttachment = (i) =>
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== i),
    }));

  /* ----------------------------- SAVE ----------------------------- */
  const buildPayload = () => {
    const base = {
      question_text: form.question_text,
      question_type: form.question_type,
      // scoring
      marks_alloted: Number(form.marks_alloted || 0),
      negativeMarkPerQuestion: Number(form.negativeMarkPerQuestion || 0),
      timeLimitSeconds: Number(form.timeLimitSeconds || 0),
      marks_scored: Number(form.marks_scored || 0),
      answer_status: form.answer_status,
      // relations
      degree: form.degree || undefined,
      semester: form.semester || undefined,
      course: form.course || undefined,
      exam: form.exam || undefined,
      quiz: form.quiz || undefined,
      // metadata
      topic: form.topic || undefined,
      subtopic: form.subtopic || undefined,
      chapter: form.chapter || undefined,
      learningOutcomes: cleanCsv(form.learningOutcomesCsv),
      difficultyLevel: form.difficultyLevel,
      language: form.language || "English",
      tags: cleanCsv(form.tagsCsv),
      // explanation
      explanation: form.explanation || undefined,
      // attachments
      attachments: (form.attachments || []).filter((a) => a.url?.trim()),
      // lifecycle
      order: Number(form.order || 0),
      section: form.section || undefined,
      isActive: !!form.isActive,
      status: form.status || "draft",
      version: Number(form.version || 1),
    };

    if (form.question_type === "mcq") {
      base.options = (form.options || []).slice(0, 4).map((o) => ({
        key: o.key || "",
        text: o.text || "",
        media: (o.media || []).filter((m) => (m.url || "").trim()),
      }));
      base.correctOptionIndex = Number(form.correctOptionIndex ?? 0);
      base.randomizeOptions = !!form.randomizeOptions;
    } else if (form.question_type === "true_false") {
      base.correctBoolean =
        form.correctBoolean === "" ? undefined : Boolean(form.correctBoolean);
    } else if (form.question_type === "theory") {
      base.theory_answer = form.theory_answer || undefined;
      base.rubric = form.rubric || undefined;
      base.maxWords = form.maxWords === "" ? 0 : Number(form.maxWords || 0);
    } else if (form.question_type === "programming") {
      base.programming_language = form.programming_language || undefined;
      base.starterCode = form.starterCode || undefined;
      base.testcases = (form.testcases || []).map((t) => ({
        input: t.input || "",
        expectedOutput: t.expectedOutput || "",
        weight: Number(t.weight || 1),
      }));
    } else if (form.question_type === "direct") {
      base.direct_answer = form.direct_answer || undefined;
    }

    return base;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!form.question_text.trim()) {
      setMsg({ type: "error", text: "Question text is required." });
      return;
    }
    if (form.question_type === "mcq") {
      const okLen = Array.isArray(form.options) && form.options.length === 4;
      if (!okLen) {
        setMsg({ type: "error", text: "MCQ must have exactly 4 options." });
        return;
      }
      if (
        typeof form.correctOptionIndex !== "number" ||
        form.correctOptionIndex < 0 ||
        form.correctOptionIndex > 3
      ) {
        setMsg({
          type: "error",
          text: "correctOptionIndex must be 0..3 for MCQ.",
        });
        return;
      }
    }
    if (form.question_type === "true_false" && form.correctBoolean === "") {
      setMsg({ type: "error", text: "Please choose True or False." });
      return;
    }

    const payload = buildPayload();

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/update-question/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok)
        throw new Error(body?.message || "Failed to update question.");

      setMsg({ type: "success", text: "Question updated successfully." });
      showToast("Question saved");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- ACTIONS ----------------------------- */
  const doToggleActive = async () => {
    try {
      const res = await fetch(`${API}/api/toggle-active/${id}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to toggle active.");
      setForm((p) => ({ ...p, isActive: !p.isActive }));
      showToast("Active status updated");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Toggle failed." });
    }
  };

  const doSetStatus = async () => {
    try {
      const res = await fetch(`${API}/api/set-status/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: form.status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to set status.");
      showToast("Status updated");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Status update failed." });
    }
  };

  const doDuplicate = async () => {
    try {
      const res = await fetch(`${API}/api/duplicate-question/${id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Duplicate failed.");
      const newId = json?.data?._id || json?._id || json?.id;
      showToast("Duplicated");
      if (newId) navigate(`/single-question/${newId}`);
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Duplicate failed." });
    }
  };

  const doDelete = async () => {
    const ok = window.confirm("Delete this question? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/delete-question/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Delete failed.");
      showToast("Deleted");
      navigate("/all-questions");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Delete failed." });
    }
  };

  const attachToQuiz = async () => {
    if (!linkQuizId) {
      setMsg({ type: "error", text: "Choose a quiz to attach." });
      return;
    }
    try {
      const res = await fetch(`${API}/api/add-existing-to-quiz/${linkQuizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Attach to quiz failed.");
      setForm((p) => ({ ...p, quiz: linkQuizId }));
      showToast("Attached to quiz");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Attach to quiz failed." });
    }
  };

  const detachFromQuiz = async () => {
    if (!form.quiz) {
      setMsg({ type: "error", text: "This question is not in a quiz." });
      return;
    }
    try {
      const res = await fetch(`${API}/api/detach-from-quiz/${form.quiz}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Detach from quiz failed.");
      setForm((p) => ({ ...p, quiz: "" }));
      showToast("Detached from quiz");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Detach from quiz failed." });
    }
  };

  const attachToExam = async () => {
    if (!linkExamId) {
      setMsg({ type: "error", text: "Choose an exam to attach." });
      return;
    }
    try {
      const res = await fetch(`${API}/api/add-existing-to-exam/${linkExamId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Attach to exam failed.");
      setForm((p) => ({ ...p, exam: linkExamId }));
      showToast("Attached to exam");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Attach to exam failed." });
    }
  };

  const detachFromExam = async () => {
    if (!form.exam) {
      setMsg({ type: "error", text: "This question is not in an exam." });
      return;
    }
    try {
      const res = await fetch(`${API}/api/detach-from-exam/${form.exam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Detach from exam failed.");
      setForm((p) => ({ ...p, exam: "" }));
      showToast("Detached from exam");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Detach from exam failed." });
    }
  };

  /* ----------------------------- BULK OPS ----------------------------- */
  const bulkIds = useMemo(() => cleanCsv(bulkIdsCsv), [bulkIdsCsv]);

  const runBulk = async (fn, okMsg) => {
    setMsg({ type: "", text: "" });
    try {
      const res = await fn();
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };
      if (!res.ok) throw new Error(body?.message || "Bulk request failed.");
      showToast(okMsg);
      setMsg({ type: "success", text: okMsg });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Bulk request failed." });
    }
  };

  const bulkSetStatus = () =>
    runBulk(
      () =>
        fetch(`${API}/api/bulk-set-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: bulkIds, status: bulkStatus }),
        }),
      "Bulk status updated"
    );

  const bulkSetSection = () =>
    runBulk(
      () =>
        fetch(`${API}/api/bulk-set-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: bulkIds, section: bulkSection }),
        }),
      "Bulk section updated"
    );

  const bulkSetMarks = () =>
    runBulk(
      () =>
        fetch(`${API}/api/bulk-set-marks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: bulkIds,
            marks_alloted: Number(bulkMarks || 0),
          }),
        }),
      "Bulk marks updated"
    );

  const bulkDelete = () =>
    runBulk(
      () =>
        fetch(`${API}/api/bulk-delete-questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: bulkIds }),
        }),
      "Bulk delete complete"
    );

  const bulkMoveToQuiz = () =>
    runBulk(
      () =>
        fetch(`${API}/api/add-existing-to-quiz/${bulkQuizId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: bulkIds }),
        }),
      "Bulk attach to quiz complete"
    );

  const bulkMoveToExam = () =>
    runBulk(
      () =>
        fetch(`${API}/api/add-existing-to-exam/${bulkExamId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionIds: bulkIds }),
        }),
      "Bulk attach to exam complete"
    );

  /* ----------------------------- UI ----------------------------- */
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
            <Link to="/all-questions" className="text-gray-900 underline">
              ← Back to All Questions
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const headerRight = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setAllSectionsCollapsed(true)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
        title="Collapse all sections"
      >
        <FiMinimize2 className="h-4 w-4" />
        Collapse sections
      </button>
      <button
        type="button"
        onClick={() => setAllSectionsCollapsed(false)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
        title="Expand all sections"
      >
        <FiMaximize2 className="h-4 w-4" />
        Expand sections
      </button>
      <Link
        to={`/single-question/${id}`}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
        title="View Question"
      >
        <FiRefreshCcw className="h-4 w-4" />
        View Question
      </Link>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
        <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Update Question
              </h1>
              <p className="text-gray-600 mt-1">
                Edit full question details, type-specific fields, scoring &
                associations.
              </p>
            </div>
            {headerRight}
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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("basic")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.basic ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.basic ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">Basic</h2>
                </div>
              </div>
              {!sectionCollapsed.basic && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Question Text *
                      </label>
                      <textarea
                        name="question_text"
                        rows={3}
                        value={form.question_text}
                        onChange={onChange}
                        required
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Type
                      </label>
                      <select
                        value={form.question_type}
                        onChange={(e) => onTypeChange(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 bg-white"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-800">
                        Difficulty
                      </label>
                      <select
                        name="difficultyLevel"
                        value={form.difficultyLevel}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white"
                      >
                        {DIFFICULTY.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-800">
                      Explanation (shown after answer)
                    </label>
                    <textarea
                      name="explanation"
                      rows={3}
                      value={form.explanation}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Type-specific */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("typeSpecific")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={
                      sectionCollapsed.typeSpecific ? "Expand" : "Collapse"
                    }
                  >
                    {sectionCollapsed.typeSpecific ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">Type-Specific</h2>
                </div>
              </div>

              {!sectionCollapsed.typeSpecific && (
                <>
                  {/* MCQ */}
                  {form.question_type === "mcq" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800">
                            Correct Option Index (0..3)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={3}
                            value={form.correctOptionIndex}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                correctOptionIndex: Number(e.target.value),
                              }))
                            }
                            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-end">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!form.randomizeOptions}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  randomizeOptions: e.target.checked,
                                }))
                              }
                            />
                            <span>Randomize Options</span>
                          </label>
                        </div>
                      </div>

                      {(form.options || []).map((opt, idx) => (
                        <div key={idx} className="rounded border p-3">
                          <div className="font-medium">Option [{idx}]</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                            <div>
                              <label className="block text-sm">Key</label>
                              <input
                                value={opt.key}
                                onChange={(e) =>
                                  updateOption(idx, "key", e.target.value)
                                }
                                className="mt-1 w-full rounded border px-3 py-2"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm">Text</label>
                              <input
                                value={opt.text}
                                onChange={(e) =>
                                  updateOption(idx, "text", e.target.value)
                                }
                                className="mt-1 w-full rounded border px-3 py-2"
                              />
                            </div>
                          </div>

                          {/* Media per option */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Media</div>
                              <button
                                type="button"
                                onClick={() => addOptionMedia(idx)}
                                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border hover:bg-gray-50"
                              >
                                <FiPlus className="h-4 w-4" />
                                Add Media
                              </button>
                            </div>
                            {(opt.media || []).map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2"
                              >
                                <select
                                  value={m.type || "image"}
                                  onChange={(e) =>
                                    updateOptionMedia(
                                      idx,
                                      mIdx,
                                      "type",
                                      e.target.value
                                    )
                                  }
                                  className="rounded border px-3 py-2 bg-white"
                                >
                                  {["image", "audio", "video", "file"].map(
                                    (t) => (
                                      <option key={t} value={t}>
                                        {t}
                                      </option>
                                    )
                                  )}
                                </select>
                                <input
                                  placeholder="URL"
                                  value={m.url}
                                  onChange={(e) =>
                                    updateOptionMedia(
                                      idx,
                                      mIdx,
                                      "url",
                                      e.target.value
                                    )
                                  }
                                  className="rounded border px-3 py-2"
                                />
                                <div className="flex gap-2">
                                  <input
                                    placeholder="Caption"
                                    value={m.caption}
                                    onChange={(e) =>
                                      updateOptionMedia(
                                        idx,
                                        mIdx,
                                        "caption",
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 rounded border px-3 py-2"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeOptionMedia(idx, mIdx)}
                                    className="px-3 py-2 rounded border hover:bg-gray-50 text-red-600 border-red-300"
                                    title="Remove media"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {form.question_type === "true_false" && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Correct Answer</div>
                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="tf"
                            checked={form.correctBoolean === true}
                            onChange={() =>
                              setForm((p) => ({ ...p, correctBoolean: true }))
                            }
                          />
                          True
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="tf"
                            checked={form.correctBoolean === false}
                            onChange={() =>
                              setForm((p) => ({ ...p, correctBoolean: false }))
                            }
                          />
                          False
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Theory */}
                  {form.question_type === "theory" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium">
                          Model Answer
                        </label>
                        <textarea
                          rows={4}
                          value={form.theory_answer}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              theory_answer: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded border px-3 py-2"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium">
                          Rubric
                        </label>
                        <textarea
                          rows={3}
                          value={form.rubric}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, rubric: e.target.value }))
                          }
                          className="mt-2 w-full rounded border px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">
                          Max Words
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={form.maxWords}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, maxWords: e.target.value }))
                          }
                          className="mt-2 w-full rounded border px-3 py-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Programming */}
                  {form.question_type === "programming" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium">
                            Programming Language
                          </label>
                          <input
                            value={form.programming_language}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                programming_language: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded border px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            Starter Code
                          </label>
                          <textarea
                            rows={4}
                            value={form.starterCode}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                starterCode: e.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded border px-3 py-2 font-mono text-xs"
                            placeholder="// boilerplate"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Hidden Testcases
                        </div>
                        <button
                          type="button"
                          onClick={addTestcase}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border hover:bg-gray-50"
                        >
                          <FiPlus className="h-4 w-4" /> Add Testcase
                        </button>
                      </div>

                      {(form.testcases || []).map((t, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 md:grid-cols-3 gap-3"
                        >
                          <div>
                            <label className="block text-sm">Input</label>
                            <textarea
                              rows={3}
                              value={t.input}
                              onChange={(e) =>
                                updateTestcase(i, "input", e.target.value)
                              }
                              className="mt-1 w-full rounded border px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm">
                              Expected Output
                            </label>
                            <textarea
                              rows={3}
                              value={t.expectedOutput}
                              onChange={(e) =>
                                updateTestcase(
                                  i,
                                  "expectedOutput",
                                  e.target.value
                                )
                              }
                              className="mt-1 w-full rounded border px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm">Weight</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min={1}
                                value={t.weight}
                                onChange={(e) =>
                                  updateTestcase(i, "weight", e.target.value)
                                }
                                className="mt-1 w-full rounded border px-3 py-2"
                              />
                              <button
                                type="button"
                                onClick={() => removeTestcase(i)}
                                className="mt-1 px-3 py-2 rounded border hover:bg-gray-50 text-red-600 border-red-300"
                                title="Remove testcase"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Direct */}
                  {form.question_type === "direct" && (
                    <div>
                      <label className="block text-sm font-medium">
                        Direct Answer
                      </label>
                      <textarea
                        rows={3}
                        value={form.direct_answer}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            direct_answer: e.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded border px-3 py-2"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Scoring & attempt */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("scoring")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.scoring ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.scoring ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">
                    Scoring & Time
                  </h2>
                </div>
              </div>

              {!sectionCollapsed.scoring && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Marks Allotted
                    </label>
                    <input
                      type="number"
                      min={0}
                      name="marks_alloted"
                      value={form.marks_alloted}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Negative Mark / Question
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      name="negativeMarkPerQuestion"
                      value={form.negativeMarkPerQuestion}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      min={0}
                      name="timeLimitSeconds"
                      value={form.timeLimitSeconds}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">
                      Marks Scored (attempt placeholder)
                    </label>
                    <input
                      type="number"
                      min={0}
                      name="marks_scored"
                      value={form.marks_scored}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Answer Status
                    </label>
                    <select
                      name="answer_status"
                      value={form.answer_status}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5 bg-white"
                    >
                      {ANSWER_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Associations */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("associations")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={
                      sectionCollapsed.associations ? "Expand" : "Collapse"
                    }
                  >
                    {sectionCollapsed.associations ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">
                    Program Associations
                  </h2>
                </div>
              </div>

              {!sectionCollapsed.associations && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Degree</label>
                    <select
                      name="degree"
                      value={form.degree || ""}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5 bg-white"
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
                    <label className="block text-sm font-medium">
                      Semester
                    </label>
                    <select
                      name="semester"
                      value={form.semester || ""}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5 bg-white"
                    >
                      <option value="">—</option>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Course</label>
                    <select
                      name="course"
                      value={form.course || ""}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5 bg-white"
                    >
                      <option value="">—</option>
                      {courses.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.title || c.name || "Course"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("metadata")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.metadata ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.metadata ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">
                    Classification & Metadata
                  </h2>
                </div>
              </div>

              {!sectionCollapsed.metadata && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Topic</label>
                    <input
                      name="topic"
                      value={form.topic}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Subtopic
                    </label>
                    <input
                      name="subtopic"
                      value={form.subtopic}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Chapter</label>
                    <input
                      name="chapter"
                      value={form.chapter}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Learning Outcomes (comma/newline)
                    </label>
                    <textarea
                      name="learningOutcomesCsv"
                      rows={2}
                      value={form.learningOutcomesCsv}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Language
                    </label>
                    <input
                      name="language"
                      value={form.language}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Tags (comma/newline)
                    </label>
                    <textarea
                      name="tagsCsv"
                      rows={2}
                      value={form.tagsCsv}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("attachments")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.attachments ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.attachments ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">Attachments</h2>
                </div>
              </div>

              {!sectionCollapsed.attachments && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Add URLs for images/audio/video/files used by this
                      question.
                    </p>
                    <button
                      type="button"
                      onClick={addAttachment}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border hover:bg-gray-50"
                    >
                      <FiPlus className="h-4 w-4" />
                      Add Attachment
                    </button>
                  </div>

                  {(form.attachments || []).map((a, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3"
                    >
                      <select
                        value={a.type || "image"}
                        onChange={(e) =>
                          updateAttachment(i, "type", e.target.value)
                        }
                        className="rounded border px-3 py-2 bg-white"
                      >
                        {["image", "audio", "video", "file"].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="URL"
                        value={a.url}
                        onChange={(e) =>
                          updateAttachment(i, "url", e.target.value)
                        }
                        className="rounded border px-3 py-2"
                      />
                      <input
                        placeholder="Caption"
                        value={a.caption}
                        onChange={(e) =>
                          updateAttachment(i, "caption", e.target.value)
                        }
                        className="rounded border px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="px-3 py-2 rounded border hover:bg-gray-50 text-red-600 border-red-300"
                        title="Remove attachment"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}

                  {/* Save attachments via dedicated endpoint if needed */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `${API}/api/set-attachments/${id}`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                attachments: (form.attachments || []).filter(
                                  (a) => (a.url || "").trim()
                                ),
                              }),
                            }
                          );
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok)
                            throw new Error(json?.message || "Failed.");
                          showToast("Attachments saved");
                        } catch (e) {
                          setMsg({
                            type: "error",
                            text: e.message || "Saving attachments failed.",
                          });
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                    >
                      <FiSave className="h-4 w-4" />
                      Save Attachments
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Visibility */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("visibility")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.visibility ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.visibility ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">
                    Visibility & Control
                  </h2>
                </div>
              </div>

              {!sectionCollapsed.visibility && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-end gap-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!form.isActive}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              isActive: e.target.checked,
                            }))
                          }
                        />
                        <span>Active</span>
                      </label>
                      <button
                        type="button"
                        onClick={doToggleActive}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                        title="Toggle Active"
                      >
                        <FiToggleRight className="h-4 w-4" />
                        Toggle
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">
                        Status
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="status"
                          value={form.status}
                          onChange={onChange}
                          className="mt-2 w-full rounded-lg border px-4 py-2.5 bg-white"
                        >
                          {["draft", "published", "archived"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={doSetStatus}
                          className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                        >
                          <FiRefreshCcw className="h-4 w-4" />
                          Update
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Order</label>
                      <input
                        type="number"
                        name="order"
                        value={form.order}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border px-4 py-2.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium">
                        Section
                      </label>
                      <input
                        name="section"
                        value={form.section}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border px-4 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Version
                      </label>
                      <input
                        type="number"
                        min={1}
                        name="version"
                        value={form.version}
                        onChange={onChange}
                        className="mt-2 w-full rounded-lg border px-4 py-2.5"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={doDuplicate}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-gray-50"
                      title="Duplicate question"
                    >
                      <FiCopy className="h-4 w-4" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={doDelete}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border hover:bg-red-50 text-red-700 border-red-300"
                      title="Delete question"
                    >
                      <FiTrash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quiz & Exam Linkage */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("linkage")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.linkage ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.linkage ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">
                    Quiz & Exam Linkage
                  </h2>
                </div>
              </div>

              {!sectionCollapsed.linkage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quiz */}
                  <div className="rounded-lg border p-3">
                    <div className="text-sm">
                      Current Quiz ID: {form.quiz || "—"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={linkQuizId}
                        onChange={(e) => setLinkQuizId(e.target.value)}
                        className="flex-1 rounded border px-3 py-2 bg-white"
                      >
                        <option value="">Choose quiz…</option>
                        {quizzes.map((q) => (
                          <option key={q._id || q.id} value={q._id || q.id}>
                            {q.title || q.name || q._id || q.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={attachToQuiz}
                        className="px-3 py-2 rounded border hover:bg-gray-50"
                      >
                        Attach
                      </button>
                      <button
                        type="button"
                        onClick={detachFromQuiz}
                        className="px-3 py-2 rounded border hover:bg-gray-50"
                        disabled={!form.quiz}
                        title="Detach from current quiz"
                      >
                        Detach
                      </button>
                    </div>
                  </div>

                  {/* Exam */}
                  <div className="rounded-lg border p-3">
                    <div className="text-sm">
                      Current Exam ID: {form.exam || "—"}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={linkExamId}
                        onChange={(e) => setLinkExamId(e.target.value)}
                        className="flex-1 rounded border px-3 py-2 bg-white"
                      >
                        <option value="">Choose exam…</option>
                        {exams.map((ex) => (
                          <option key={ex._id || ex.id} value={ex._id || ex.id}>
                            {ex.title || ex.name || ex._id || ex.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={attachToExam}
                        className="px-3 py-2 rounded border hover:bg-gray-50"
                      >
                        Attach
                      </button>
                      <button
                        type="button"
                        onClick={detachFromExam}
                        className="px-3 py-2 rounded border hover:bg-gray-50"
                        disabled={!form.exam}
                        title="Detach from current exam"
                      >
                        Detach
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Operations */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("bulk")}
                    className="p-2 border rounded hover:bg-gray-50"
                    title={sectionCollapsed.bulk ? "Expand" : "Collapse"}
                  >
                    {sectionCollapsed.bulk ? (
                      <FiChevronRight className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <h2 className="font-semibold text-gray-900">
                    Bulk Operations
                  </h2>
                </div>
              </div>

              {!sectionCollapsed.bulk && (
                <>
                  <p className="text-xs text-gray-500">
                    Paste Question IDs (comma or newline separated) and choose
                    an action.
                  </p>

                  <textarea
                    rows={3}
                    value={bulkIdsCsv}
                    onChange={(e) => setBulkIdsCsv(e.target.value)}
                    className="mt-2 w-full rounded-lg border px-4 py-2.5"
                    placeholder="64f…a12, 64f…b34, …"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="rounded border p-3">
                      <div className="text-sm font-medium mb-2">
                        Status / Section / Marks
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value)}
                          className="rounded border px-3 py-2 bg-white"
                        >
                          <option value="">Status…</option>
                          {["draft", "published", "archived"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={bulkSetStatus}
                          className="rounded border px-3 py-2 hover:bg-gray-50"
                          disabled={!bulkIds.length || !bulkStatus}
                        >
                          Set Status
                        </button>

                        <input
                          placeholder="Section"
                          value={bulkSection}
                          onChange={(e) => setBulkSection(e.target.value)}
                          className="rounded border px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={bulkSetSection}
                          className="rounded border px-3 py-2 hover:bg-gray-50"
                          disabled={!bulkIds.length || !bulkSection.trim()}
                        >
                          Set Section
                        </button>

                        <input
                          type="number"
                          min={0}
                          placeholder="Marks"
                          value={bulkMarks}
                          onChange={(e) => setBulkMarks(e.target.value)}
                          className="rounded border px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={bulkSetMarks}
                          className="rounded border px-3 py-2 hover:bg-gray-50"
                          disabled={!bulkIds.length || bulkMarks === ""}
                        >
                          Set Marks
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={bulkDelete}
                        className="mt-3 inline-flex items-center gap-2 rounded border px-3 py-2 hover:bg-red-50 text-red-700 border-red-300"
                        disabled={!bulkIds.length}
                      >
                        <FiTrash2 className="h-4 w-4" />
                        Bulk Delete
                      </button>
                    </div>

                    <div className="rounded border p-3">
                      <div className="text-sm font-medium mb-2">
                        Attach to Quiz/Exam
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select
                          value={bulkQuizId}
                          onChange={(e) => setBulkQuizId(e.target.value)}
                          className="rounded border px-3 py-2 bg-white"
                        >
                          <option value="">Quiz…</option>
                          {quizzes.map((q) => (
                            <option key={q._id || q.id} value={q._id || q.id}>
                              {q.title || q.name || q._id || q.id}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={bulkMoveToQuiz}
                          className="rounded border px-3 py-2 hover:bg-gray-50"
                          disabled={!bulkIds.length || !bulkQuizId}
                        >
                          Add to Quiz
                        </button>

                        <select
                          value={bulkExamId}
                          onChange={(e) => setBulkExamId(e.target.value)}
                          className="rounded border px-3 py-2 bg-white"
                        >
                          <option value="">Exam…</option>
                          {exams.map((ex) => (
                            <option
                              key={ex._id || ex.id}
                              value={ex._id || ex.id}
                            >
                              {ex.title || ex.name || ex._id || ex.id}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={bulkMoveToExam}
                          className="rounded border px-3 py-2 hover:bg-gray-50"
                          disabled={!bulkIds.length || !bulkExamId}
                        >
                          Add to Exam
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                <FiSave className="h-4 w-4" /> {saving ? "Saving…" : "Save All"}
              </button>

              <Link
                to={`/single-question/${id}`}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
                title="Cancel and view"
              >
                <FiX className="h-4 w-4" /> Cancel
              </Link>

              <Link
                to="/all-questions"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              >
                Back to All Questions
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Toast */}
      <Toast text={toastText} onClose={() => setToastText("")} />
    </>
  );
}
