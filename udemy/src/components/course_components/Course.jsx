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
const groupQuizzes = (quizzes) => {
  if (!Array.isArray(quizzes) || quizzes.length === 0) return null;
  const buckets = { Basics: [], Intermediate: [], Advanced: [], Other: [] };
  quizzes.forEach((q, idx) => {
    const base =
      q?.quizName || q?.title || q?.name || q?.slug || `Quiz ${idx + 1}`;
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

  const [selectedTopic, setSelectedTopic] = useState(null);
  const [visitedTopics, setVisitedTopics] = useState([]);

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

      // Resources (KEEP). Requirements/learningOutcomes are purposely NOT added.
      const resourcesSection = buildResourcesSection(c);
      const extrasContent = buildContentMapForExtras(c);

      // Final structure (NO overview section with requirements/learningOutcomes)
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

  return (
    <>
      {/* Page heading with the course title */}
      <div className="px-6 lg:px-20 pt-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
          {course?.title || "Course"}
        </h1>
        {/* {(course?.level || course?.language) && (
          <p className="text-sm text-gray-600 mt-1">
            {course?.level ? `${course.level}` : ""}
            {course?.level && course?.language ? " · " : ""}
            {course?.language ? `${course.language}` : ""}
          </p>
        )} */}
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
                        <div
                          className={`transition-all duration-500 overflow-hidden ${
                            expandedQuizCategory === quizIndex
                              ? "max-h-96 mt-1"
                              : "max-h-0"
                          }`}
                        >
                          <ul className="pl-4 space-y-1 mt-1">
                            {(quizCat.quizzes || []).map((quiz, qidx) => (
                              <li
                                key={`${quiz}-${qidx}`}
                                className="flex items-center gap-2"
                              >
                                <button
                                  onClick={() => handleTopicChange(quiz)}
                                  className={`text-sm text-left ${
                                    selectedTopic === quiz
                                      ? "text-purple-700 font-bold underline"
                                      : "text-gray-800 font-semibold hover:text-purple-600"
                                  }`}
                                >
                                  {quiz}
                                </button>
                                {isPaid && visitedTopics.includes(quiz) && (
                                  <FaCheckCircle className="text-green-500 text-xs" />
                                )}
                              </li>
                            ))}
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
        </div>
      </div>
    </>
  );
};

export default Course;
