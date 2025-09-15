import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiCheckCircle,
  FiSlash,
  FiCalendar,
  FiRefreshCcw,
  FiTag,
  FiHash,
  FiBookOpen,
  FiUsers,
  FiExternalLink,
  FiEdit,
  FiFlag,
  FiTrash2,
  FiCopy,
  FiX,
  FiPaperclip,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiCode,
  FiList,
  FiZap,
  FiBox,
} from "react-icons/fi";

const API = globalBackendRoute;
const NA = "Information not available at this time.";
const isNilOrEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);
const pretty = (v) => (isNilOrEmpty(v) ? NA : String(v));
const asStringId = (x) =>
  typeof x === "object" && x !== null ? x._id || x.id : x;

// Collapsible section — default CLOSED (retracted)
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
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

export default function SingleQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [working, setWorking] = useState(false);

  // lookups for names
  const [degreeMap, setDegreeMap] = useState({});
  const [semMap, setSemMap] = useState({});
  const [courseMap, setCourseMap] = useState({});
  const [examMap, setExamMap] = useState({});
  const [quizMap, setQuizMap] = useState({});

  // status selection
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    let active = true;

    const loadQuestion = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API}/api/get-question/${id}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch question.");
        if (!active) return;
        // support {data} or root object
        const payload = json?.data || json;
        setData(payload);
        setNewStatus(payload?.status || "");
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    };

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

    const buildMap = (arr, nameKeys = []) => {
      const map = {};
      (arr || []).forEach((o) => {
        const _id = o?._id || o?.id;
        const name = nameKeys.find((k) => o?.[k])
          ? o[nameKeys.find((k) => o?.[k])]
          : o?.title || o?.name || o?.slug || "Untitled";
        if (_id) map[_id] = name;
      });
      return map;
    };

    const loadLookups = async () => {
      try {
        const [deg, sem, crs, exm, qz] = await Promise.allSettled([
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

        if (deg.status === "fulfilled")
          setDegreeMap(buildMap(toArr(deg.value), ["name", "title"]));
        if (sem.status === "fulfilled")
          setSemMap(buildMap(toArr(sem.value), ["title", "semester_name"]));
        if (crs.status === "fulfilled")
          setCourseMap(buildMap(toArr(crs.value), ["title", "name"]));
        if (exm.status === "fulfilled")
          setExamMap(buildMap(toArr(exm.value), ["title", "name"]));
        if (qz.status === "fulfilled")
          setQuizMap(buildMap(toArr(qz.value), ["title", "name"]));
      } catch {
        // ignore lookup failures
      }
    };

    loadQuestion();
    loadLookups();

    return () => {
      active = false;
    };
  }, [API, id]);

  const createdAt = useMemo(
    () => (data?.createdAt ? new Date(data.createdAt).toLocaleString() : NA),
    [data]
  );
  const updatedAt = useMemo(
    () => (data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : NA),
    [data]
  );

  // ids + names
  const degreeId = asStringId(data?.degree);
  const semId = asStringId(data?.semester);
  const courseId = asStringId(data?.course);
  const examId = asStringId(data?.exam);
  const quizId = asStringId(data?.quiz);

  const degreeName =
    (typeof data?.degree === "object" &&
      (data?.degree?.name || data?.degree?.title)) ||
    degreeMap[degreeId] ||
    pretty(degreeId);
  const semName =
    (typeof data?.semester === "object" &&
      (data?.semester?.title || data?.semester?.semester_name)) ||
    semMap[semId] ||
    pretty(semId);
  const courseName =
    (typeof data?.course === "object" &&
      (data?.course?.title || data?.course?.name)) ||
    courseMap[courseId] ||
    pretty(courseId);
  const examName =
    (typeof data?.exam === "object" &&
      (data?.exam?.title || data?.exam?.name)) ||
    examMap[examId] ||
    pretty(examId);
  const quizName =
    (typeof data?.quiz === "object" &&
      (data?.quiz?.title || data?.quiz?.name)) ||
    quizMap[quizId] ||
    pretty(quizId);

  const setAlert = (type, text) => setMsg({ type, text });

  // --- Actions wired to your routes ---
  const doToggleActive = async () => {
    if (!data?._id) return;
    const ok = window.confirm(`Toggle Active for this question?`);
    if (!ok) return;
    try {
      setWorking(true);
      setAlert("", "");
      const res = await fetch(`${API}/api/toggle-active/${data._id}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to toggle active.");
      setData((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev));
      setAlert("success", "Active status updated.");
    } catch (e) {
      setAlert("error", e.message || "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const doSetStatus = async () => {
    if (!data?._id || !newStatus) {
      setAlert("error", "Please choose a status to set.");
      return;
    }
    try {
      setWorking(true);
      setAlert("", "");
      const res = await fetch(`${API}/api/set-status/${data._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to set status.");
      setData((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setAlert("success", "Status updated.");
    } catch (e) {
      setAlert("error", e.message || "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const doDuplicate = async () => {
    if (!data?._id) return;
    try {
      setWorking(true);
      setAlert("", "");
      const res = await fetch(`${API}/api/duplicate-question/${data._id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to duplicate.");
      const newId = json?.data?._id || json?._id || json?.id;
      setAlert("success", "Question duplicated.");
      if (newId) navigate(`/single-question/${newId}`);
    } catch (e) {
      setAlert("error", e.message || "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const doDelete = async () => {
    if (!data?._id) return;
    const ok = window.confirm(
      "This will permanently delete the question. Continue?"
    );
    if (!ok) return;
    try {
      setWorking(true);
      setAlert("", "");
      const res = await fetch(`${API}/api/delete-question/${data._id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to delete question.");
      setAlert("success", "Question deleted.");
      navigate("/all-questions");
    } catch (e) {
      setAlert("error", e.message || "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const detachFromQuiz = async () => {
    if (!data?._id || !quizId) return;
    const ok = window.confirm("Detach this question from the quiz?");
    if (!ok) return;
    try {
      setWorking(true);
      setAlert("", "");
      const res = await fetch(`${API}/api/detach-from-quiz/${quizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [data._id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to detach from quiz.");
      setAlert("success", "Detached from quiz.");
      setData((prev) => (prev ? { ...prev, quiz: undefined } : prev));
    } catch (e) {
      setAlert("error", e.message || "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const detachFromExam = async () => {
    if (!data?._id || !examId) return;
    const ok = window.confirm("Detach this question from the exam?");
    if (!ok) return;
    try {
      setWorking(true);
      setAlert("", "");
      const res = await fetch(`${API}/api/detach-from-exam/${examId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [data._id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.message || "Failed to detach from exam.");
      setAlert("success", "Detached from exam.");
      setData((prev) => (prev ? { ...prev, exam: undefined } : prev));
    } catch (e) {
      setAlert("error", e.message || "Something went wrong.");
    } finally {
      setWorking(false);
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

  if (!data) return null;

  // convenience
  const qText = data?.question_text;
  const qType = data?.question_type;

  const createdById = asStringId(data?.createdBy);
  const updatedById = asStringId(data?.updatedBy);

  const options = Array.isArray(data?.options) ? data.options : [];
  const attachments = Array.isArray(data?.attachments) ? data.attachments : [];
  const testcases = Array.isArray(data?.testcases) ? data.testcases : [];
  const learningOutcomes = Array.isArray(data?.learningOutcomes)
    ? data.learningOutcomes
    : [];
  const tags = Array.isArray(data?.tags) ? data.tags : [];

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Title & actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Question Details
            </h1>
            <p className="text-gray-600 mt-1">
              Full model view + actions (toggle, status, duplicate, delete,
              detach).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> Inactive
              </span>
            )}

            {data?.status ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-xs font-semibold">
                <FiFlag /> Status: {String(data.status)}
              </span>
            ) : null}

            {/* NEW: Edit button */}
            <Link
              to={`/update-question/${data._id}`}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold bg-blue-600 hover:bg-blue-500"
              title="Edit / Update Question"
            >
              <FiEdit className="h-4 w-4" />
              Edit
            </Link>

            <button
              onClick={doToggleActive}
              disabled={working}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                working ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
              }`}
              title="Toggle Active"
            >
              <FiRefreshCcw className="h-4 w-4" />
              Toggle
            </button>

            <button
              onClick={doDuplicate}
              disabled={working}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                working ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500"
              }`}
              title="Duplicate Question"
            >
              <FiCopy className="h-4 w-4" />
              Duplicate
            </button>

            <button
              onClick={doDelete}
              disabled={working}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                working ? "bg-gray-400" : "bg-red-600 hover:bg-red-500"
              }`}
              title="Delete Question"
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
        <Section title="Basic" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {data._id || data.id}
                </code>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Type:</span> {pretty(qType)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiBookOpen className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Difficulty:</span>{" "}
                {pretty(data?.difficultyLevel)}
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

          {/* Question text */}
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900 mb-1">
              Question
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
              {pretty(qText)}
            </div>
          </div>

          {/* Explanation */}
          {data?.explanation ? (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Explanation
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {data.explanation}
              </div>
            </div>
          ) : null}
        </Section>

        {/* TYPE-SPECIFIC: MCQ / TRUE_FALSE / THEORY / PROGRAMMING / DIRECT */}
        <Section title="Type-Specific Fields" defaultOpen={false}>
          {/* MCQ */}
          {qType === "mcq" ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Randomize Options:</span>{" "}
                {data?.randomizeOptions ? "Yes" : "No"}{" "}
                <span className="ml-4 font-medium">Correct Index:</span>{" "}
                {data?.correctOptionIndex ?? NA}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FiList /> Options (exactly 4)
                </div>
                {Array.isArray(options) && options.length ? (
                  <ul className="space-y-2">
                    {options.map((opt, idx) => {
                      const isCorrect = idx === data?.correctOptionIndex;
                      const medias = Array.isArray(opt?.media) ? opt.media : [];
                      return (
                        <li
                          key={idx}
                          className={`rounded border p-3 text-sm ${
                            isCorrect ? "border-green-300 bg-green-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-gray-500">
                              [{idx}]
                            </span>
                            <div className="flex-1">
                              <div className="text-gray-900 break-words">
                                <span className="font-medium">
                                  {opt?.key ? opt.key + ": " : ""}
                                </span>
                                {opt?.text ?? JSON.stringify(opt)}
                              </div>
                              {medias.length ? (
                                <ul className="mt-2 pl-6 list-disc text-gray-700">
                                  {medias.map((m, i) => (
                                    <li key={i} className="break-all">
                                      <span className="font-medium">
                                        {m?.type}:
                                      </span>{" "}
                                      {m?.url ? (
                                        <a
                                          href={m.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                                        >
                                          {m.url} <FiExternalLink />
                                        </a>
                                      ) : (
                                        NA
                                      )}
                                      {m?.caption ? (
                                        <span className="ml-2 text-gray-600">
                                          ({m.caption})
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold">
                                <FiCheckCircle /> Correct
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-700">{NA}</div>
                )}
              </div>
            </div>
          ) : null}

          {/* TRUE/FALSE */}
          {qType === "true_false" ? (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Correct Boolean:</span>{" "}
              {data?.correctBoolean === true
                ? "True"
                : data?.correctBoolean === false
                ? "False"
                : NA}
            </div>
          ) : null}

          {/* THEORY */}
          {qType === "theory" ? (
            <div className="grid gap-3 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Max Words:</span>{" "}
                {data?.maxWords != null ? data.maxWords : 0}
              </p>
              {data?.theory_answer ? (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Model Answer
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {data.theory_answer}
                  </div>
                </div>
              ) : null}
              {data?.rubric ? (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Rubric
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {data.rubric}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PROGRAMMING */}
          {qType === "programming" ? (
            <div className="grid gap-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Language:</span>{" "}
                {pretty(data?.programming_language)}
              </div>
              {data?.starterCode ? (
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                    <FiCode /> Starter Code
                  </div>
                  <pre className="rounded-lg bg-gray-50 p-3 text-xs overflow-auto whitespace-pre">
                    {data.starterCode}
                  </pre>
                </div>
              ) : null}

              <div>
                <div className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FiZap /> Hidden Testcases
                </div>
                {testcases.length ? (
                  <ul className="space-y-2">
                    {testcases.map((t, i) => (
                      <li key={i} className="rounded border p-3 text-sm">
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <div className="font-medium">Input</div>
                            <pre className="bg-gray-50 rounded p-2 text-xs overflow-auto whitespace-pre-wrap">
                              {t?.input ?? ""}
                            </pre>
                          </div>
                          <div>
                            <div className="font-medium">Expected Output</div>
                            <pre className="bg-gray-50 rounded p-2 text-xs overflow-auto whitespace-pre-wrap">
                              {t?.expectedOutput ?? ""}
                            </pre>
                          </div>
                          <div>
                            <div className="font-medium">Weight</div>
                            <div className="text-gray-800">
                              {t?.weight ?? 1}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-700">{NA}</div>
                )}
              </div>
            </div>
          ) : null}

          {/* DIRECT */}
          {qType === "direct" ? (
            <div className="text-sm">
              <div className="font-medium text-gray-900 mb-1">
                Direct Answer
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-gray-800 whitespace-pre-wrap">
                {pretty(data?.direct_answer)}
              </div>
            </div>
          ) : null}
        </Section>

        {/* SCORING & TIME */}
        <Section title="Scoring & Time" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Marks Allotted:</span>{" "}
              {data?.marks_alloted != null ? data.marks_alloted : NA}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Negative Mark / Q:</span>{" "}
              {data?.negativeMarkPerQuestion != null
                ? data.negativeMarkPerQuestion
                : 0}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Time Limit (sec):</span>{" "}
              {data?.timeLimitSeconds != null ? data.timeLimitSeconds : 0}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">
                Marks Scored (attempt-level placeholder):
              </span>{" "}
              {data?.marks_scored != null ? data.marks_scored : 0}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Answer Status:</span>{" "}
              {pretty(data?.answer_status)}
            </p>
          </div>
        </Section>

        {/* PROGRAM ASSOCIATIONS */}
        <Section title="Program Associations" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Program</h3>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Degree:</span> {degreeName}{" "}
                <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                  {degreeId || NA}
                </code>
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Semester:</span> {semName}{" "}
                <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                  {semId || NA}
                </code>
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Course</h3>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Course:</span> {courseName}{" "}
                <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                  {courseId || NA}
                </code>
              </p>
            </div>
          </div>
        </Section>

        {/* QUIZ & EXAM LINKS */}
        <Section title="Quiz & Exam Linkage" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quiz */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FiUsers /> Quiz
              </h3>
              {quizId ? (
                <div className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                  <span className="break-all">{quizName}</span>
                  <code className="bg-gray-100 border px-1 py-0.5 rounded">
                    {quizId}
                  </code>
                  <button
                    onClick={detachFromQuiz}
                    disabled={working}
                    className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-800 ml-2"
                    title="Detach from this quiz"
                  >
                    <FiX /> Detach
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-700">{NA}</p>
              )}
            </div>

            {/* Exam */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FiUsers /> Exam
              </h3>
              {examId ? (
                <div className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                  <span className="break-all">{examName}</span>
                  <code className="bg-gray-100 border px-1 py-0.5 rounded">
                    {examId}
                  </code>
                  <button
                    onClick={detachFromExam}
                    disabled={working}
                    className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-800 ml-2"
                    title="Detach from this exam"
                  >
                    <FiX /> Detach
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-700">{NA}</p>
              )}
            </div>
          </div>
        </Section>

        {/* CLASSIFICATION & METADATA */}
        <Section title="Classification & Metadata" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Topic:</span> {pretty(data?.topic)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Subtopic:</span>{" "}
              {pretty(data?.subtopic)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Chapter:</span>{" "}
              {pretty(data?.chapter)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Language:</span>{" "}
              {pretty(data?.language)}
            </p>
            <p className="text-gray-700 md:col-span-2">
              <span className="font-medium">Learning Outcomes:</span>{" "}
              {learningOutcomes.length ? learningOutcomes.join(", ") : NA}
            </p>
            <p className="text-gray-700 md:col-span-2">
              <span className="font-medium">Tags:</span>{" "}
              {tags.length ? tags.join(", ") : NA}
            </p>
          </div>
        </Section>

        {/* ATTACHMENTS */}
        <Section title="Attachments" defaultOpen={false}>
          {attachments.length ? (
            <ul className="space-y-2">
              {attachments.map((att, i) => {
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
            <div className="text-sm text-gray-700">{NA}</div>
          )}

          <div className="mt-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 text-xs flex items-center gap-2">
            <FiAlertCircle />
            Manage uploads via create/update forms. Refresh to see the latest
            here.
          </div>
        </Section>

        {/* ORDER / SECTION / CONTROL */}
        <Section title="Placement & Control" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Order:</span>{" "}
              {data?.order != null ? data.order : 0}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Section:</span>{" "}
              {pretty(data?.section)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Status:</span>{" "}
              {pretty(data?.status)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Version:</span>{" "}
              {data?.version != null ? data.version : 1}
            </p>
          </div>

          {/* Status setter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Set Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Choose —</option>
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Current: <strong>{pretty(data?.status)}</strong>
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={doSetStatus}
                disabled={working}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                  working ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                <FiFlag className="h-4 w-4" />
                Update Status
              </button>
            </div>
          </div>
        </Section>

        {/* AUDIT */}
        <Section title="Audit" defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Created By:</span>{" "}
              <code className="bg-gray-100 border px-1 py-0.5 rounded">
                {createdById || NA}
              </code>
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Updated By:</span>{" "}
              <code className="bg-gray-100 border px-1 py-0.5 rounded">
                {updatedById || NA}
              </code>
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Created At:</span> {createdAt}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Updated At:</span> {updatedAt}
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/update-question/${data._id}`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            title="Edit this question"
          >
            <FiEdit className="mr-2 h-4 w-4" />
            Edit Question
          </Link>
          <Link
            to="/all-questions"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Questions
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
}
