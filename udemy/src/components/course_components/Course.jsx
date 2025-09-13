import React, { useState, useEffect, useMemo } from "react";
import { FaChevronDown, FaChevronUp, FaCheckCircle } from "react-icons/fa";
import { useParams } from "react-router-dom";
import axios from "axios";
import globalBackendRoute from "../../config/Config";

const API = globalBackendRoute;
const looksLikeId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

/* ---------- unwrap common API shapes ---------- */
const pickObject = (x) => {
  if (!x) return null;
  if (x.data && typeof x.data === "object") {
    if (x.data.data && typeof x.data.data === "object") return x.data.data;
    return x.data;
  }
  if (x.course && typeof x.course === "object") return x.course;
  return typeof x === "object" ? x : null;
};
const pickArray = (x) => {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray(x.data)) return x.data;
  if (Array.isArray(x.items)) return x.items;
  if (Array.isArray(x.results)) return x.results;
  if (x.data && Array.isArray(x.data.data)) return x.data.data;
  return [];
};

/* ---------- normalize modules / topics ---------- */
const extractModulesArray = (course) => {
  if (!course || typeof course !== "object") return [];
  const candidates = [
    course.modules,
    course.sections,
    course.syllabus,
    course?.content?.modules,
    course?.moduleList,
  ];
  const firstArr = candidates.find((a) => Array.isArray(a) && a.length);
  return Array.isArray(firstArr) ? firstArr : [];
};
const getTopicsArr = (m) =>
  (Array.isArray(m?.topics) && m.topics) ||
  (Array.isArray(m?.lessons) && m.lessons) ||
  (Array.isArray(m?.items) && m.items) ||
  [];
const getTopicTitle = (t, idx) =>
  t?.title || t?.name || t?.heading || `Topic ${idx + 1}`;

/* ---------- RESOURCES ONLY (requirements/learningOutcomes removed) ---------- */
const buildResourcesSection = (course) => {
  const r = course?.learningResources || {};
  const videos = Array.isArray(r.videos) ? r.videos : [];
  const pdfs = Array.isArray(r.pdfs) ? r.pdfs : [];
  const assignments = Array.isArray(r.assignments) ? r.assignments : [];
  const links = Array.isArray(r.externalLinks) ? r.externalLinks : [];
  const topics = [];
  videos.forEach((v) => topics.push(`Video: ${String(v)}`));
  pdfs.forEach((p) => topics.push(`PDF: ${String(p)}`));
  assignments.forEach((a) => topics.push(`Assignment: ${String(a)}`));
  links.forEach((l) => topics.push(`Link: ${String(l)}`));
  return topics.length ? { title: "Resources", topics } : null;
};

/* map for items that appear in the sidebar (NO requirements/learningOutcomes here) */
const buildContentMapForExtras = (course) => {
  const map = {};
  const r = course?.learningResources || {};
  (Array.isArray(r.videos) ? r.videos : []).forEach((v) => {
    const key = `Video: ${String(v)}`;
    map[key] = { heading: key, code: "", explanation: String(v) };
  });
  (Array.isArray(r.pdfs) ? r.pdfs : []).forEach((p) => {
    const key = `PDF: ${String(p)}`;
    map[key] = { heading: key, code: "", explanation: String(p) };
  });
  (Array.isArray(r.assignments) ? r.assignments : []).forEach((a) => {
    const key = `Assignment: ${String(a)}`;
    map[key] = { heading: key, code: "", explanation: String(a) };
  });
  (Array.isArray(r.externalLinks) ? r.externalLinks : []).forEach((l) => {
    const key = `Link: ${String(l)}`;
    map[key] = { heading: key, code: "", explanation: String(l) };
  });
  return map;
};

/* ---------- quizzes ---------- */
const displayNameForQuiz = (q, idx) =>
  q?.quizName || q?.title || q?.name || q?.slug || `Quiz ${idx + 1}`;

const groupQuizzes = (quizzes) => {
  if (!Array.isArray(quizzes) || quizzes.length === 0) return null;
  const buckets = { Basics: [], Intermediate: [], Advanced: [], Other: [] };
  quizzes.forEach((q, idx) => {
    const base = displayNameForQuiz(q, idx);
    const level = String(q?.difficulty || q?.level || "").toLowerCase();
    if (level.includes("basic") || level === "easy") buckets.Basics.push(base);
    else if (level.includes("inter") || level === "medium")
      buckets.Intermediate.push(base);
    else if (level.includes("adv") || level === "hard")
      buckets.Advanced.push(base);
    else buckets.Other.push(base);
  });
  const topics = [];
  if (buckets.Basics.length)
    topics.push({ title: "Basics", quizzes: buckets.Basics });
  if (buckets.Intermediate.length)
    topics.push({ title: "Intermediate", quizzes: buckets.Intermediate });
  if (buckets.Advanced.length)
    topics.push({ title: "Advanced", quizzes: buckets.Advanced });
  if (buckets.Other.length)
    topics.push({ title: "Other", quizzes: buckets.Other });
  return topics.length ? { title: "Quizzes", topics } : null;
};
const emptyQuizSection = {
  title: "Quizzes",
  topics: [
    { title: "Basics", quizzes: [] },
    { title: "Intermediate", quizzes: [] },
    { title: "Advanced", quizzes: [] },
  ],
};

const firstOpenableSectionIndex = (sections) => {
  if (!Array.isArray(sections)) return null;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const notQuizzes = s?.title !== "Quizzes";
    const hasStringList =
      Array.isArray(s?.topics) &&
      s.topics.length > 0 &&
      typeof s.topics[0] === "string";
    if (notQuizzes && hasStringList) return i;
  }
  const idx = sections.findIndex((s) => s?.title !== "Quizzes");
  return idx >= 0 ? idx : null;
};

/* ========================================================= */
const Course = () => {
  const { userid, courseid } = useParams();

  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedQuizCategory, setExpandedQuizCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);

  const [courseStructure, setCourseStructure] = useState([]);
  const [contentMap, setContentMap] = useState({});
  const [quizNameToObj, setQuizNameToObj] = useState({}); // quiz display name -> quiz object

  // NEW: per-quiz question cache & expansion
  const [quizQuestionsCache, setQuizQuestionsCache] = useState({}); // quizId -> [questions]
  const [expandedQuizzes, setExpandedQuizzes] = useState({}); // quiz display name -> bool

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [visitedTopics, setVisitedTopics] = useState([]);

  // --- quiz run state ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState(null); // selection / input for current q
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0, ungraded: 0 });
  const [quizFinished, setQuizFinished] = useState(false);

  // NEW: track answered question ids to tick in the sidebar
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState(new Set());

  const isPaid = useMemo(() => {
    const price = Number(course?.price ?? 0);
    const accessType = String(course?.accessType || "").toLowerCase();
    return price > 0 || accessType === "paid";
  }, [course]);

  // document title
  useEffect(() => {
    const prev = document.title;
    if (course?.title) document.title = `${course.title} · Course`;
    return () => {
      document.title = prev;
    };
  }, [course?.title]);

  const authHeader = (() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  })();

  const buildFromModules = (modules) => {
    if (!Array.isArray(modules) || !modules.length) return [];
    return modules.map((m, mi) => ({
      title: m?.title || m?.name || `Module ${mi + 1}`,
      topics: getTopicsArr(m).map((t, ti) => getTopicTitle(t, ti)),
    }));
  };

  // build topic content from your topic schema
  const buildContentMapFromModules = (modules) => {
    const map = {};
    if (!Array.isArray(modules)) return map;

    modules.forEach((m) => {
      getTopicsArr(m).forEach((t, ti) => {
        const key = getTopicTitle(t, ti);
        if (!key) return;

        map[key] = {
          heading: key,
          explanation: typeof t?.explanation === "string" ? t.explanation : "",
          code: typeof t?.code === "string" ? t.code : "",
          codeExplanation:
            typeof t?.codeExplanation === "string" ? t.codeExplanation : "",
          codeLanguage:
            (typeof t?.codeLanguage === "string" && t.codeLanguage) ||
            "plaintext",
          videoUrl: typeof t?.videoUrl === "string" ? t.videoUrl : "",
          pdfUrl: typeof t?.pdfUrl === "string" ? t.pdfUrl : "",
          duration:
            typeof t?.duration === "number"
              ? t.duration
              : t?.duration != null && !Number.isNaN(Number(t.duration))
              ? Number(t.duration)
              : undefined,
          isFreePreview: !!t?.isFreePreview,
        };
      });
    });

    return map;
  };

  const fetchCourse = async () => {
    if (looksLikeId(courseid)) {
      return axios.get(`${API}/api/get-course-by-id/${courseid}`, {
        headers: authHeader,
      });
    }
    return axios.get(
      `${API}/api/get-course-by-slug/slug/${encodeURIComponent(courseid)}`,
      { headers: authHeader }
    );
  };

  const fetchQuizzesSmart = async (c) => {
    const cid = c?._id || c?.id || courseid;

    // by-course endpoint first
    if (looksLikeId(cid)) {
      try {
        const r = await axios.get(`${API}/api/list-quizzes-by-course/${cid}`, {
          headers: authHeader,
        });
        const arr = pickArray(r.data);
        if (arr.length) return arr;
      } catch {
        /* ignore */
      }
    }

    // fallback: list all then filter
    try {
      const r = await axios.get(`${API}/api/list-quizzes`, {
        headers: authHeader,
        params: {
          page: 1,
          limit: 2000,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
      const arr = pickArray(r.data);
      return arr.filter((q) => {
        const qCourseId =
          (typeof q?.course === "object" ? q?.course?._id : q?.course) ||
          (typeof q?.courseId === "object" ? q?.courseId?._id : q?.courseId);
        return qCourseId && (qCourseId === c?._id || qCourseId === c?.id);
      });
    } catch {
      return [];
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      // Course
      const courseRes = await fetchCourse();
      const c = pickObject(courseRes.data);
      setCourse(c || null);

      // Modules
      const modules = extractModulesArray(c);
      const sectionBlocks = buildFromModules(modules);
      const contentFromModules = buildContentMapFromModules(modules);

      // Quizzes
      const quizzes = await fetchQuizzesSmart(c);
      const actualQuizSection = groupQuizzes(quizzes);
      const quizSection = actualQuizSection || emptyQuizSection;

      // Build name -> obj index (for fetching questions later)
      const map = {};
      (quizzes || []).forEach((q, idx) => {
        const name = displayNameForQuiz(q, idx);
        map[name] = q;
      });
      setQuizNameToObj(map);

      // Resources (KEEP)
      const resourcesSection = buildResourcesSection(c);
      const extrasContent = buildContentMapForExtras(c);

      // Final structure (NO overview req/learningOutcomes)
      const built = [];
      if (sectionBlocks.length) built.push(...sectionBlocks);
      if (resourcesSection) built.push(resourcesSection);
      built.push(quizSection);

      setCourseStructure(built);
      setContentMap({ ...contentFromModules, ...extrasContent });

      // Initial topic: first module topic -> resources -> quizzes
      const firstTopic =
        (sectionBlocks[0]?.topics && sectionBlocks[0].topics[0]) ||
        resourcesSection?.topics?.[0] ||
        (actualQuizSection?.topics?.[0]?.quizzes?.[0] ?? null);

      setSelectedTopic(firstTopic);
      setVisitedTopics(firstTopic ? [firstTopic] : []);
      setExpandedSection(firstOpenableSectionIndex(built));
    } catch {
      setCourseStructure([emptyQuizSection]);
      setContentMap({});
      setQuizNameToObj({});
      setSelectedTopic(null);
      setVisitedTopics([]);
      setExpandedSection(firstOpenableSectionIndex([emptyQuizSection]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [courseid]);

  /* ---------- derived ---------- */
  const allFlatTopics = useMemo(() => {
    return courseStructure.flatMap((section) =>
      section.title === "Quizzes"
        ? (section.topics || []).flatMap((cat) => cat.quizzes || [])
        : section.topics || []
    );
  }, [courseStructure]);

  const currentIndex = selectedTopic
    ? allFlatTopics.indexOf(selectedTopic)
    : -1;
  const totalTopics = allFlatTopics.length;
  const percentageCompleted = Math.floor(
    totalTopics > 0 ? (visitedTopics.length / totalTopics) * 100 : 0
  );

  const current = (selectedTopic && contentMap[selectedTopic]) || {
    heading: "No data available from database.",
    explanation: "",
    code: "",
    codeExplanation: "",
    codeLanguage: "plaintext",
    videoUrl: "",
    pdfUrl: "",
    duration: undefined,
    isFreePreview: false,
  };

  /* =========================================================
     QUIZ RUNNER: fetch questions when a quiz is selected
  ========================================================= */
  const isQuizSelected = !!quizNameToObj[selectedTopic];

  // fetch & load quiz questions (for the runner)
  useEffect(() => {
    // reset quiz state when topic changes
    setQuizQuestions([]);
    setQuizLoading(false);
    setQIndex(0);
    setAnswerDraft(null);
    setAnswered(false);
    setIsCorrect(null);
    setScore({ correct: 0, wrong: 0, ungraded: 0 });
    setQuizFinished(false);

    if (!isQuizSelected) return;
    const qObj = quizNameToObj[selectedTopic];
    const quizId =
      qObj?._id || qObj?.id || (typeof qObj === "string" ? qObj : null);
    if (!quizId) return;

    const run = async () => {
      setQuizLoading(true);
      try {
        // Use cache if available
        if (quizQuestionsCache[quizId]) {
          const arr = quizQuestionsCache[quizId];
          setQuizQuestions(arr);
          // prefill answer draft for first question
          if (arr.length > 0) {
            const first = arr[0];
            if (first.question_type === "mcq") setAnswerDraft(-1);
            else if (first.question_type === "true_false") setAnswerDraft(true);
            else setAnswerDraft("");
          }
          return;
        }

        const res = await axios.get(`${API}/api/list-questions`, {
          headers: authHeader,
          params: {
            quiz: quizId,
            limit: 1000,
            sortBy: "order",
            sortDir: "asc",
            isActive: true,
            status: "published",
          },
        });
        const arr = pickArray(res.data);
        setQuizQuestions(arr);
        setQuizQuestionsCache((prev) => ({ ...prev, [quizId]: arr }));

        if (arr.length > 0) {
          const first = arr[0];
          if (first.question_type === "mcq") setAnswerDraft(-1);
          else if (first.question_type === "true_false") setAnswerDraft(true);
          else setAnswerDraft("");
        }
      } catch {
        setQuizQuestions([]);
      } finally {
        setQuizLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic, isQuizSelected]);

  const currentQuizQ = quizQuestions[qIndex];

  const normalize = (s) =>
    String(s ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const isAutoGradable = (q) =>
    q?.question_type === "mcq" ||
    q?.question_type === "true_false" ||
    q?.question_type === "direct";

  const grade = (q, draft) => {
    if (!q) return { graded: false, correct: false };
    switch (q.question_type) {
      case "mcq":
        return {
          graded: true,
          correct: Number(draft) === Number(q.correctOptionIndex),
        };
      case "true_false":
        return {
          graded: true,
          correct: Boolean(draft) === Boolean(q.correctBoolean),
        };
      case "direct":
        return {
          graded: true,
          correct: normalize(draft) === normalize(q.direct_answer),
        };
      default:
        return { graded: false, correct: false };
    }
  };

  const submitAnswer = () => {
    if (!currentQuizQ) return;

    const { graded, correct } = grade(currentQuizQ, answerDraft);
    setAnswered(true);
    setIsCorrect(correct);

    setScore((prev) => ({
      correct: prev.correct + (graded && correct ? 1 : 0),
      wrong: prev.wrong + (graded && !correct ? 1 : 0),
      ungraded: prev.ungraded + (!graded ? 1 : 0),
    }));

    // mark as answered for sidebar tick
    if (currentQuizQ?._id) {
      setAnsweredQuestionIds((prev) => new Set(prev).add(currentQuizQ._id));
    }
  };

  const nextQuestion = () => {
    const nextIdx = qIndex + 1;
    if (nextIdx >= quizQuestions.length) {
      setQuizFinished(true);
      return;
    }
    setQIndex(nextIdx);
    setAnswered(false);
    setIsCorrect(null);

    const nextQ = quizQuestions[nextIdx];
    if (nextQ?.question_type === "mcq") setAnswerDraft(-1);
    else if (nextQ?.question_type === "true_false") setAnswerDraft(true);
    else setAnswerDraft("");
  };

  const percent =
    score.correct + score.wrong > 0
      ? Math.round((score.correct / (score.correct + score.wrong)) * 100)
      : 0;

  /* ---------- actions ---------- */
  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
    if (isPaid && topic && !visitedTopics.includes(topic)) {
      setVisitedTopics((prev) => [...prev, topic]);
    }
  };
  const nextTopic = () => {
    if (currentIndex > -1 && currentIndex < totalTopics - 1) {
      handleTopicChange(allFlatTopics[currentIndex + 1]);
    }
  };
  const prevTopic = () => {
    if (currentIndex > 0) {
      handleTopicChange(allFlatTopics[currentIndex - 1]);
    }
  };

  /* =========================================================
     Sidebar helpers for nested questions under a quiz
  ========================================================= */
  const getQuizIdByName = (quizName) => {
    const qObj = quizNameToObj[quizName];
    return qObj?._id || qObj?.id || (typeof qObj === "string" ? qObj : null);
  };

  const toggleQuizExpand = async (quizName) => {
    setExpandedQuizzes((prev) => ({
      ...prev,
      [quizName]: !prev[quizName],
    }));

    // Preload questions into cache upon first expand
    const quizId = getQuizIdByName(quizName);
    if (!quizId || quizQuestionsCache[quizId]) return;

    try {
      const res = await axios.get(`${API}/api/list-questions`, {
        headers: authHeader,
        params: {
          quiz: quizId,
          limit: 1000,
          sortBy: "order",
          sortDir: "asc",
          isActive: true,
          status: "published",
        },
      });
      const arr = pickArray(res.data);
      setQuizQuestionsCache((prev) => ({ ...prev, [quizId]: arr }));
    } catch {
      setQuizQuestionsCache((prev) => ({ ...prev, [quizId]: [] }));
    }
  };

  const openQuizAndLoadQuestions = async (quizName) => {
    // Select this quiz as the current topic (keeps existing main-pane behavior)
    handleTopicChange(quizName);
    // Expand the quiz list & preload if needed
    await toggleQuizExpand(quizName);
  };

  const jumpToQuestion = (quizName, questionIdx) => {
    // If the selected topic isn't this quiz, select it (this triggers runner setup)
    if (selectedTopic !== quizName) handleTopicChange(quizName);

    // If we're already on this quiz, just move index
    // (If the main runner hasn't loaded yet, this set might land early; we guard below)
    const quizId = getQuizIdByName(quizName);
    const arr =
      (quizId && quizQuestionsCache[quizId]) ||
      (quizName === selectedTopic ? quizQuestions : []);
    if (arr && arr.length > 0) {
      setQIndex(questionIdx);
      setAnswered(false);
      setIsCorrect(null);

      const q = arr[questionIdx];
      if (q?.question_type === "mcq") setAnswerDraft(-1);
      else if (q?.question_type === "true_false") setAnswerDraft(true);
      else setAnswerDraft("");
    } else {
      // Fallback: ensure the quiz is expanded & cached; the effect will load main runner questions soon after
      toggleQuizExpand(quizName);
    }
  };

  const quizQuestionDisplayText = (q, idx) => {
    // Short label for sidebar
    const base =
      (q?.question_text || "").replace(/\s+/g, " ").trim().slice(0, 60) ||
      `Question ${idx + 1}`;
    return base + (base.length >= 60 ? "…" : "");
  };

  /* =========================================================
     Question renderer (UI only)
  ========================================================= */
  const QuestionUI = ({ q, value, onChange }) => {
    if (!q) return null;

    if (q.question_type === "mcq") {
      const opts = Array.isArray(q.options) ? q.options : [];
      return (
        <>
          <p className="text-gray-800 whitespace-pre-line mb-4">
            {q.question_text}
          </p>
          <div className="space-y-2">
            {opts.map((op, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-2 p-2 border rounded cursor-pointer ${
                  Number(value) === idx ? "bg-indigo-50 border-indigo-200" : ""
                }`}
              >
                <input
                  type="radio"
                  name="mcq"
                  className="mt-1"
                  checked={Number(value) === idx}
                  onChange={() => onChange(idx)}
                />
                <div>
                  <div className="font-medium">
                    Option {["A", "B", "C", "D"][idx] || idx + 1}
                  </div>
                  <div className="text-gray-700">{op?.text}</div>
                </div>
              </label>
            ))}
          </div>
        </>
      );
    }

    if (q.question_type === "true_false") {
      return (
        <>
          <p className="text-gray-800 whitespace-pre-line mb-4">
            {q.question_text}
          </p>
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="tf"
                checked={value === true}
                onChange={() => onChange(true)}
              />
              <span>True</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="tf"
                checked={value === false}
                onChange={() => onChange(false)}
              />
              <span>False</span>
            </label>
          </div>
        </>
      );
    }

    if (q.question_type === "direct") {
      return (
        <>
          <p className="text-gray-800 whitespace-pre-line mb-3">
            {q.question_text}
          </p>
          <input
            className="w-full border rounded p-2"
            placeholder="Type your answer…"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      );
    }

    // Theory & Programming – accept input but mark ungraded
    if (q.question_type === "theory") {
      return (
        <>
          <p className="text-gray-800 whitespace-pre-line mb-3">
            {q.question_text}
          </p>
          <textarea
            className="w-full border rounded p-2"
            rows={4}
            placeholder="Write your answer… (will be graded manually)"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      );
    }

    if (q.question_type === "programming") {
      return (
        <>
          <p className="text-gray-800 whitespace-pre-line mb-3">
            {q.question_text}
          </p>
          {q.starterCode ? (
            <pre className="bg-gray-100 text-sm p-3 rounded border overflow-auto mb-3">
              <code>{q.starterCode}</code>
            </pre>
          ) : null}
          <textarea
            className="w-full border rounded p-2"
            rows={8}
            placeholder="Paste your code here… (auto-tests run on server; this UI just records your attempt)"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      );
    }

    return <p>{q.question_text}</p>;
  };

  return (
    <>
      {/* Page heading with the course title */}
      <div className="px-6 lg:px-20 pt-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          {course?.title || "Course"}
        </h1>
      </div>

      {/* Main layout */}
      <div className="w-full flex flex-col lg:flex-row px-6 lg:px-20 py-8 container border-b pb-5">
        {/* Sidebar */}
        <div className="lg:w-72 w-full lg:pr-4 border-r mb-6 lg:mb-0">
          <h2 className="text-xl font-bold mb-6 text-purple-700">
            Course Contents
          </h2>

          {loading ? (
            <div className="text-sm text-gray-500 mb-4">Loading…</div>
          ) : courseStructure.length === 0 ? (
            <div className="text-sm text-gray-500 mb-4">
              No sections available.
            </div>
          ) : null}

          <div className="space-y-4">
            {courseStructure.map((section, index) => (
              <div key={`${section.title}-${index}`}>
                <button
                  onClick={() =>
                    setExpandedSection(expandedSection === index ? null : index)
                  }
                  className="flex justify-between items-center w-full text-left font-semibold text-blue-900 hover:underline"
                >
                  {section.title}
                  {expandedSection === index ? (
                    <FaChevronUp className="ml-2" />
                  ) : (
                    <FaChevronDown className="ml-2" />
                  )}
                </button>

                {/* Non-Quiz Sections */}
                {section.title !== "Quizzes" && (
                  <div
                    className={`transition-all duration-500 overflow-hidden ${
                      expandedSection === index ? "max-h-96 mt-2" : "max-h-0"
                    }`}
                  >
                    <ul className="pl-4 space-y-1">
                      {(section.topics || []).map((topic, idx) => (
                        <li
                          key={`${topic}-${idx}`}
                          className="flex items-center gap-2"
                        >
                          <button
                            onClick={() => handleTopicChange(topic)}
                            className={`text-sm text-left ${
                              selectedTopic === topic
                                ? "text-purple-700 font-bold underline"
                                : "text-gray-800 font-semibold hover:text-purple-600"
                            }`}
                          >
                            {topic}
                          </button>
                          {isPaid && visitedTopics.includes(topic) && (
                            <FaCheckCircle className="text-green-500 text-xs" />
                          )}
                        </li>
                      ))}
                      {(section.topics || []).length === 0 ? (
                        <li className="text-xs text-gray-400 pl-1">
                          No items yet
                        </li>
                      ) : null}
                    </ul>
                  </div>
                )}

                {/* Quizzes */}
                {section.title === "Quizzes" && expandedSection === index && (
                  <div className="pl-4 mt-2 space-y-2">
                    {(section.topics || []).map((quizCat, quizIndex) => (
                      <div key={`${quizCat.title}-${quizIndex}`}>
                        <button
                          onClick={() =>
                            setExpandedQuizCategory(
                              expandedQuizCategory === quizIndex
                                ? null
                                : quizIndex
                            )
                          }
                          className="flex justify-between items-center w-full text-left text-sm font-semibold text-indigo-700"
                        >
                          {quizCat.title}
                          {expandedQuizCategory === quizIndex ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </button>

                        {/* Each quiz under this category */}
                        <div
                          className={`transition-all duration-500 overflow-hidden ${
                            expandedQuizCategory === quizIndex
                              ? "max-h-[1000px] mt-1"
                              : "max-h-0"
                          }`}
                        >
                          <ul className="pl-4 space-y-2 mt-2">
                            {(quizCat.quizzes || []).map((quizName, qidx) => {
                              const quizId = getQuizIdByName(quizName);
                              const isExpanded = !!expandedQuizzes[quizName];
                              const qList = quizId
                                ? quizQuestionsCache[quizId] || []
                                : [];
                              const allAnswered =
                                qList.length > 0 &&
                                qList.every((q) =>
                                  answeredQuestionIds.has(q._id)
                                );

                              return (
                                <li key={`${quizName}-${qidx}`}>
                                  {/* quiz title row */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        openQuizAndLoadQuestions(quizName)
                                      }
                                      className={`text-sm text-left ${
                                        selectedTopic === quizName
                                          ? "text-purple-700 font-bold underline"
                                          : "text-gray-800 font-semibold hover:text-purple-600"
                                      }`}
                                    >
                                      {quizName}
                                    </button>
                                    {/* tick if all questions answered */}
                                    {allAnswered ? (
                                      <FaCheckCircle className="text-green-500 text-xs" />
                                    ) : null}

                                    {/* toggle icon for nested questions (NO TEXT) */}
                                    <button
                                      onClick={() => toggleQuizExpand(quizName)}
                                      className="ml-auto text-gray-600 hover:text-gray-800"
                                      title={
                                        isExpanded
                                          ? "Hide questions"
                                          : "Show questions"
                                      }
                                    >
                                      {isExpanded ? (
                                        <FaChevronUp className="w-4 h-4" />
                                      ) : (
                                        <FaChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>

                                  {/* nested questions list */}
                                  <div
                                    className={`transition-all duration-500 overflow-hidden ${
                                      isExpanded
                                        ? "max-h-[1000px] mt-1"
                                        : "max-h-0"
                                    }`}
                                  >
                                    <ul className="pl-4 space-y-1 mt-1">
                                      {(qList || []).map((q, qi) => (
                                        <li
                                          key={q._id || qi}
                                          className="flex items-center gap-2"
                                        >
                                          <button
                                            onClick={() =>
                                              jumpToQuestion(quizName, qi)
                                            }
                                            className={`text-xs text-left ${
                                              selectedTopic === quizName &&
                                              quizQuestions[qIndex]?._id ===
                                                q._id
                                                ? "text-purple-700 font-bold underline"
                                                : "text-gray-700 hover:text-purple-600"
                                            }`}
                                          >
                                            {quizQuestionDisplayText(q, qi)}
                                          </button>
                                          {answeredQuestionIds.has(q._id) && (
                                            <FaCheckCircle className="text-green-500 text-[10px]" />
                                          )}
                                        </li>
                                      ))}
                                      {(qList || []).length === 0 ? (
                                        <li className="text-[11px] text-gray-400 pl-1">
                                          {quizId
                                            ? "No questions yet"
                                            : "Loading…"}
                                        </li>
                                      ) : null}
                                    </ul>
                                  </div>
                                </li>
                              );
                            })}
                            {(quizCat.quizzes || []).length === 0 ? (
                              <li className="text-xs text-gray-400 pl-1">
                                No items yet
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      </div>
                    ))}
                    {(section.topics || []).length === 0 ? (
                      <div className="text-xs text-gray-400 pl-1">
                        No categories yet
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 pl-0 lg:pl-8">
          {/* If not a quiz — keep your existing content view */}
          {!isQuizSelected && (
            <>
              <div className="flex items-start flex-wrap gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
                  {current.heading}
                </h1>
                {isPaid && totalTopics > 0 ? (
                  <span className="ml-auto text-sm text-gray-600">
                    Course Progress: {percentageCompleted}% completed
                  </span>
                ) : null}

                {/* Topic meta badges */}
                <div className="flex flex-wrap  items-center gap-2 mb-4">
                  {typeof current.duration === "number" ? (
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-gray-100 border">
                      ⏱ {current.duration} mins
                    </span>
                  ) : null}
                  {current.codeLanguage ? (
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-gray-100 border">
                      🧩 {current.codeLanguage}
                    </span>
                  ) : null}
                  {current.isFreePreview ? (
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200">
                      Free preview
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Explanation */}
              {current.explanation ? (
                <div className="mb-6">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                    {current.explanation}
                  </p>
                </div>
              ) : null}

              {/* Code Example */}
              {current.code ? (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-purple-700 mb-2">
                    Code Example
                  </h2>
                  <pre className="bg-gray-100 text-sm p-4 rounded border overflow-auto">
                    <code>{current.code}</code>
                  </pre>
                </div>
              ) : null}

              {/* Code Explanation */}
              {current.codeExplanation ? (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-purple-700 mb-2">
                    Code Explanation
                  </h2>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                    {current.codeExplanation}
                  </p>
                </div>
              ) : null}

              {/* Resources */}
              {current.videoUrl || current.pdfUrl ? (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-purple-700 mb-2">
                    Resources
                  </h2>
                  <ul className="list-disc ml-6 space-y-1">
                    {current.videoUrl ? (
                      <li>
                        <a
                          href={current.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-700 underline"
                        >
                          Watch video
                        </a>
                      </li>
                    ) : null}
                    {current.pdfUrl ? (
                      <li>
                        <a
                          href={current.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-700 underline"
                        >
                          Open PDF
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {/* Pager */}
              {totalTopics > 0 ? (
                <div className="mt-8 flex items-center flex-wrap gap-4">
                  <button
                    onClick={prevTopic}
                    disabled={currentIndex <= 0}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                    ← {allFlatTopics[currentIndex - 1] || ""}
                  </button>
                  <button
                    onClick={nextTopic}
                    disabled={
                      currentIndex === -1 || currentIndex >= totalTopics - 1
                    }
                    className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {allFlatTopics[currentIndex + 1] || ""} →
                  </button>
                </div>
              ) : null}
            </>
          )}

          {/* If a quiz is selected — run the quiz here */}
          {isQuizSelected && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {selectedTopic}
                </h1>
                <div className="text-sm text-gray-600">
                  {quizQuestions.length > 0
                    ? `Question ${qIndex + 1} of ${quizQuestions.length}`
                    : "No questions"}
                </div>
              </div>

              {quizLoading ? (
                <div className="text-sm text-gray-500">Loading quiz…</div>
              ) : quizFinished ? (
                <div className="border rounded p-4 bg-gray-50">
                  <h2 className="text-xl font-semibold mb-2">
                    Quiz Completed 🎉
                  </h2>
                  <div className="text-gray-800">
                    <div>Correct: {score.correct}</div>
                    <div>Wrong: {score.wrong}</div>
                    <div>Ungraded (theory/programming): {score.ungraded}</div>
                    <div className="mt-2 font-semibold">
                      Percentage (auto-gradable only): {percent}%
                    </div>
                  </div>
                </div>
              ) : quizQuestions.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No questions available for this quiz.
                </div>
              ) : (
                <>
                  {/* current question card */}
                  <div className="border rounded p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                      Type: {quizQuestions[qIndex]?.question_type}
                    </div>

                    <QuestionUI
                      q={quizQuestions[qIndex]}
                      value={answerDraft}
                      onChange={setAnswerDraft}
                    />

                    {/* Submit / Feedback / Next */}
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      {!answered ? (
                        <button
                          onClick={submitAnswer}
                          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                          disabled={
                            quizQuestions[qIndex]?.question_type === "mcq" &&
                            Number(answerDraft) === -1
                          }
                        >
                          Submit Answer
                        </button>
                      ) : (
                        <>
                          {isAutoGradable(quizQuestions[qIndex]) ? (
                            <div
                              className={`px-3 py-2 rounded border text-sm ${
                                isCorrect
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {isCorrect ? "✅ Correct!" : "❌ Wrong."}
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded border text-sm bg-yellow-50 text-yellow-700 border-yellow-200">
                              Submitted. This question is graded manually.
                            </div>
                          )}

                          <button
                            onClick={nextQuestion}
                            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                          >
                            {qIndex + 1 >= quizQuestions.length
                              ? "Finish Quiz"
                              : "Next Question →"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Running score */}
                  <div className="mt-4 text-sm text-gray-700">
                    <span className="mr-4">✅ {score.correct}</span>
                    <span className="mr-4">❌ {score.wrong}</span>
                    <span>📝 {score.ungraded} ungraded</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Course;
