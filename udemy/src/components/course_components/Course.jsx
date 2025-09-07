// // // // import React, { useState } from "react";
// // // // import { FaChevronDown, FaChevronUp, FaCheckCircle } from "react-icons/fa";

// // // // const courseStructure = [
// // // //   {
// // // //     title: "Python Basics",
// // // //     topics: ["What is Python?", "Why Learn Python?", "Python Features"],
// // // //   },
// // // //   {
// // // //     title: "Python Intermediate",
// // // //     topics: ["Variables", "Data Types", "Operators"],
// // // //   },
// // // //   {
// // // //     title: "Python Advanced",
// // // //     topics: ["if-else", "for loop", "while loop", "Function Syntax"],
// // // //   },
// // // //   {
// // // //     title: "Quizzes",
// // // //     topics: [
// // // //       {
// // // //         title: "Basics",
// // // //         quizzes: ["Quiz 1: Intro", "Quiz 2: Syntax"],
// // // //       },
// // // //       {
// // // //         title: "Intermediate",
// // // //         quizzes: ["Quiz 3: Variables", "Quiz 4: Data Types"],
// // // //       },
// // // //       {
// // // //         title: "Advanced",
// // // //         quizzes: ["Quiz 5: Loops", "Quiz 6: Functions"],
// // // //       },
// // // //     ],
// // // //   },
// // // // ];

// // // // const contentMap = {
// // // //   "What is Python?": {
// // // //     heading: "What is Python?",
// // // //     code: `print("Hello, Python")\nprint(type(3.14))`,
// // // //     explanation:
// // // //       "Python is a high-level, interpreted programming language known for its readability and flexibility.",
// // // //   },
// // // //   Variables: {
// // // //     heading: "Variables in Python",
// // // //     code: `name = "Alice"\nage = 30\nprint(name, age)`,
// // // //     explanation:
// // // //       "Variables are used to store data in a program. Python uses dynamic typing.",
// // // //   },
// // // //   "Quiz 1: Intro": {
// // // //     heading: "Quiz 1: Python Basics",
// // // //     code: "",
// // // //     explanation: "This quiz tests your understanding of Python basics.",
// // // //   },
// // // //   "Quiz 5: Loops": {
// // // //     heading: "Quiz 5: Loops",
// // // //     code: "",
// // // //     explanation: "This quiz focuses on for-loops and while-loops in Python.",
// // // //   },
// // // // };

// // // // const Course = () => {
// // // //   const [expandedSection, setExpandedSection] = useState(null);
// // // //   const [expandedQuizCategory, setExpandedQuizCategory] = useState(null);
// // // //   const [selectedTopic, setSelectedTopic] = useState("What is Python?");
// // // //   const [visitedTopics, setVisitedTopics] = useState(["What is Python?"]);

// // // //   // 🟡 Toggle this for free vs paid course
// // // //   const isPaid = false;

// // // //   const allFlatTopics = courseStructure.flatMap((section) =>
// // // //     section.title === "Quizzes"
// // // //       ? section.topics.flatMap((cat) => cat.quizzes)
// // // //       : section.topics
// // // //   );

// // // //   const currentIndex = allFlatTopics.indexOf(selectedTopic);
// // // //   const totalTopics = allFlatTopics.length;
// // // //   const percentageCompleted = Math.floor(
// // // //     (visitedTopics.length / totalTopics) * 100
// // // //   );

// // // //   const current = contentMap[selectedTopic] || {
// // // //     heading: "Select a topic",
// // // //     code: "",
// // // //     explanation: "Choose a topic from the left sidebar to see details here.",
// // // //   };

// // // //   const handleTopicChange = (topic) => {
// // // //     setSelectedTopic(topic);
// // // //     if (isPaid && !visitedTopics.includes(topic)) {
// // // //       setVisitedTopics((prev) => [...prev, topic]);
// // // //     }
// // // //   };

// // // //   const nextTopic = () => {
// // // //     if (currentIndex < totalTopics - 1) {
// // // //       handleTopicChange(allFlatTopics[currentIndex + 1]);
// // // //     }
// // // //   };

// // // //   const prevTopic = () => {
// // // //     if (currentIndex > 0) {
// // // //       handleTopicChange(allFlatTopics[currentIndex - 1]);
// // // //     }
// // // //   };

// // // //   return (
// // // //     <div className="w-full flex flex-col lg:flex-row px-6 lg:px-20 py-8 container border-b pb-5">
// // // //       {/* Sidebar */}
// // // //       <div className="lg:w-72 w-full lg:pr-4 border-r mb-6 lg:mb-0">
// // // //         <h2 className="text-xl font-bold mb-6 text-purple-700">
// // // //           Course Contents
// // // //         </h2>
// // // //         <div className="space-y-4">
// // // //           {courseStructure.map((section, index) => (
// // // //             <div key={index}>
// // // //               <button
// // // //                 onClick={() =>
// // // //                   setExpandedSection(expandedSection === index ? null : index)
// // // //                 }
// // // //                 className="flex justify-between items-center w-full text-left font-medium text-blue-900 hover:underline"
// // // //               >
// // // //                 {section.title}
// // // //                 {expandedSection === index ? (
// // // //                   <FaChevronUp className="ml-2" />
// // // //                 ) : (
// // // //                   <FaChevronDown className="ml-2" />
// // // //                 )}
// // // //               </button>

// // // //               {/* Non-Quiz Sections */}
// // // //               {section.title !== "Quizzes" && (
// // // //                 <div
// // // //                   className={`transition-all duration-500 overflow-hidden ${
// // // //                     expandedSection === index ? "max-h-96 mt-2" : "max-h-0"
// // // //                   }`}
// // // //                 >
// // // //                   <ul className="pl-4 space-y-1">
// // // //                     {section.topics.map((topic, idx) => (
// // // //                       <li key={idx} className="flex items-center gap-2">
// // // //                         <button
// // // //                           onClick={() => handleTopicChange(topic)}
// // // //                           className={`text-sm ${
// // // //                             selectedTopic === topic
// // // //                               ? "text-purple-600 font-medium underline"
// // // //                               : "text-gray-700 hover:text-purple-500"
// // // //                           }`}
// // // //                         >
// // // //                           {topic}
// // // //                         </button>
// // // //                         {isPaid && visitedTopics.includes(topic) && (
// // // //                           <FaCheckCircle className="text-green-500 text-xs" />
// // // //                         )}
// // // //                       </li>
// // // //                     ))}
// // // //                   </ul>
// // // //                 </div>
// // // //               )}

// // // //               {/* Quizzes */}
// // // //               {section.title === "Quizzes" && expandedSection === index && (
// // // //                 <div className="pl-4 mt-2 space-y-2">
// // // //                   {section.topics.map((quizCat, quizIndex) => (
// // // //                     <div key={quizIndex}>
// // // //                       <button
// // // //                         onClick={() =>
// // // //                           setExpandedQuizCategory(
// // // //                             expandedQuizCategory === quizIndex
// // // //                               ? null
// // // //                               : quizIndex
// // // //                           )
// // // //                         }
// // // //                         className="flex justify-between items-center w-full text-left text-sm font-medium text-indigo-700"
// // // //                       >
// // // //                         {quizCat.title}
// // // //                         {expandedQuizCategory === quizIndex ? (
// // // //                           <FaChevronUp />
// // // //                         ) : (
// // // //                           <FaChevronDown />
// // // //                         )}
// // // //                       </button>
// // // //                       <div
// // // //                         className={`transition-all duration-500 overflow-hidden ${
// // // //                           expandedQuizCategory === quizIndex
// // // //                             ? "max-h-96 mt-1"
// // // //                             : "max-h-0"
// // // //                         }`}
// // // //                       >
// // // //                         <ul className="pl-4 space-y-1 mt-1">
// // // //                           {quizCat.quizzes.map((quiz, qidx) => (
// // // //                             <li key={qidx} className="flex items-center gap-2">
// // // //                               <button
// // // //                                 onClick={() => handleTopicChange(quiz)}
// // // //                                 className={`text-sm ${
// // // //                                   selectedTopic === quiz
// // // //                                     ? "text-purple-600 font-medium underline"
// // // //                                     : "text-gray-700 hover:text-purple-500"
// // // //                                 }`}
// // // //                               >
// // // //                                 {quiz}
// // // //                               </button>
// // // //                               {isPaid && visitedTopics.includes(quiz) && (
// // // //                                 <FaCheckCircle className="text-green-500 text-xs" />
// // // //                               )}
// // // //                             </li>
// // // //                           ))}
// // // //                         </ul>
// // // //                       </div>
// // // //                     </div>
// // // //                   ))}
// // // //                 </div>
// // // //               )}
// // // //             </div>
// // // //           ))}
// // // //         </div>
// // // //       </div>

// // // //       {/* Main Content */}
// // // //       <div className="flex-1 pl-0 lg:pl-8">
// // // //         <div className="flex items-center flex-wrap gap-2">
// // // //           <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
// // // //             {current.heading}
// // // //           </h1>
// // // //           {isPaid && (
// // // //             <span className="ml-auto text-sm text-gray-600">
// // // //               Course Progress: {percentageCompleted}% completed
// // // //             </span>
// // // //           )}
// // // //         </div>

// // // //         {/* Code Section */}
// // // //         {current.code && (
// // // //           <div className="mb-6">
// // // //             <h2 className="text-xl font-semibold text-purple-700 mb-2">
// // // //               Code Example:
// // // //             </h2>
// // // //             <pre className="bg-gray-100 text-sm p-4 rounded border overflow-auto">
// // // //               <code>{current.code}</code>
// // // //             </pre>
// // // //           </div>
// // // //         )}

// // // //         {/* Explanation Section */}
// // // //         <div>
// // // //           <h2 className="text-xl font-semibold text-purple-700 mb-2">
// // // //             Explanation:
// // // //           </h2>
// // // //           <p className="text-gray-800 leading-relaxed whitespace-pre-line">
// // // //             {current.explanation}
// // // //           </p>
// // // //         </div>

// // // //         {/* Pagination */}
// // // //         <div className="mt-8 flex items-center flex-wrap gap-4">
// // // //           <button
// // // //             onClick={prevTopic}
// // // //             disabled={currentIndex === 0}
// // // //             className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
// // // //           >
// // // //             ← {allFlatTopics[currentIndex - 1] || ""}
// // // //           </button>
// // // //           <button
// // // //             onClick={nextTopic}
// // // //             disabled={currentIndex === totalTopics - 1}
// // // //             className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
// // // //           >
// // // //             {allFlatTopics[currentIndex + 1] || ""} →
// // // //           </button>
// // // //         </div>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Course;

// // // //
// // // // src/pages/course_pages/Course.jsx
// // // import React, { useState, useEffect, useMemo } from "react";
// // // import { FaChevronDown, FaChevronUp, FaCheckCircle } from "react-icons/fa";
// // // import { useParams } from "react-router-dom";
// // // import axios from "axios";
// // // import globalBackendRoute from "../../config/Config";

// // // const API = globalBackendRoute;
// // // const looksLikeId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

// // // /* ---------- helpers to unwrap common API shapes ---------- */
// // // const pickObject = (x) => {
// // //   if (!x) return null;
// // //   if (x.data && typeof x.data === "object") {
// // //     if (x.data.data && typeof x.data.data === "object") return x.data.data;
// // //     return x.data;
// // //   }
// // //   if (x.course && typeof x.course === "object") return x.course;
// // //   return typeof x === "object" ? x : null;
// // // };
// // // const pickArray = (x) => {
// // //   if (!x) return [];
// // //   if (Array.isArray(x)) return x;
// // //   if (Array.isArray(x.data)) return x.data;
// // //   if (Array.isArray(x.items)) return x.items;
// // //   if (Array.isArray(x.results)) return x.results;
// // //   if (x.data && Array.isArray(x.data.data)) return x.data.data;
// // //   return [];
// // // };

// // // /* ---------- normalize modules / topics ---------- */
// // // const extractModulesArray = (course) => {
// // //   if (!course || typeof course !== "object") return [];
// // //   const candidates = [
// // //     course.modules,
// // //     course.sections,
// // //     course.syllabus,
// // //     course?.content?.modules,
// // //     course?.moduleList,
// // //   ];
// // //   const firstArr = candidates.find((a) => Array.isArray(a) && a.length);
// // //   return Array.isArray(firstArr) ? firstArr : [];
// // // };
// // // const getTopicsArr = (m) =>
// // //   (Array.isArray(m?.topics) && m.topics) ||
// // //   (Array.isArray(m?.lessons) && m.lessons) ||
// // //   (Array.isArray(m?.items) && m.items) ||
// // //   [];
// // // const getTopicTitle = (t, idx) =>
// // //   t?.title || t?.name || t?.heading || `Topic ${idx + 1}`;
// // // const getTopicCode = (t) => t?.codeExample || t?.code || t?.snippet || "";
// // // const getTopicBody = (t) =>
// // //   t?.content || t?.description || t?.body || t?.text || "";

// // // /* ---------- NEW: build Overview section from DB (requirements/outcomes) ---------- */
// // // const buildOverviewSection = (course) => {
// // //   const req = Array.isArray(course?.requirements) ? course.requirements : [];
// // //   const los = Array.isArray(course?.learningOutcomes)
// // //     ? course.learningOutcomes
// // //     : [];
// // //   const topics = [];
// // //   req.forEach((r, i) => topics.push(`Requirement: ${String(r)}`));
// // //   los.forEach((o, i) => topics.push(`Outcome: ${String(o)}`));
// // //   return topics.length ? { title: "Overview", topics } : null;
// // // };

// // // /* ---------- NEW: build Resources section from DB (videos/pdfs/etc.) ---------- */
// // // const buildResourcesSection = (course) => {
// // //   const r = course?.learningResources || {};
// // //   const videos = Array.isArray(r.videos) ? r.videos : [];
// // //   const pdfs = Array.isArray(r.pdfs) ? r.pdfs : [];
// // //   const assignments = Array.isArray(r.assignments) ? r.assignments : [];
// // //   const links = Array.isArray(r.externalLinks) ? r.externalLinks : [];

// // //   const topics = [];
// // //   videos.forEach((v, i) => topics.push(`Video: ${String(v)}`));
// // //   pdfs.forEach((p, i) => topics.push(`PDF: ${String(p)}`));
// // //   assignments.forEach((a, i) => topics.push(`Assignment: ${String(a)}`));
// // //   links.forEach((l, i) => topics.push(`Link: ${String(l)}`));

// // //   return topics.length ? { title: "Resources", topics } : null;
// // // };

// // // /* ---------- NEW: content map for Overview/Resources entries ---------- */
// // // const buildContentMapForExtras = (course) => {
// // //   const map = {};

// // //   // Overview
// // //   (Array.isArray(course?.requirements) ? course.requirements : []).forEach(
// // //     (r) => {
// // //       const key = `Requirement: ${String(r)}`;
// // //       map[key] = {
// // //         heading: key,
// // //         code: "",
// // //         explanation: String(r),
// // //       };
// // //     }
// // //   );
// // //   (Array.isArray(course?.learningOutcomes)
// // //     ? course.learningOutcomes
// // //     : []
// // //   ).forEach((o) => {
// // //     const key = `Outcome: ${String(o)}`;
// // //     map[key] = {
// // //       heading: key,
// // //       code: "",
// // //       explanation: String(o),
// // //     };
// // //   });

// // //   // Resources
// // //   const r = course?.learningResources || {};
// // //   (Array.isArray(r.videos) ? r.videos : []).forEach((v) => {
// // //     const key = `Video: ${String(v)}`;
// // //     map[key] = { heading: key, code: "", explanation: String(v) };
// // //   });
// // //   (Array.isArray(r.pdfs) ? r.pdfs : []).forEach((p) => {
// // //     const key = `PDF: ${String(p)}`;
// // //     map[key] = { heading: key, code: "", explanation: String(p) };
// // //   });
// // //   (Array.isArray(r.assignments) ? r.assignments : []).forEach((a) => {
// // //     const key = `Assignment: ${String(a)}`;
// // //     map[key] = { heading: key, code: "", explanation: String(a) };
// // //   });
// // //   (Array.isArray(r.externalLinks) ? r.externalLinks : []).forEach((l) => {
// // //     const key = `Link: ${String(l)}`;
// // //     map[key] = { heading: key, code: "", explanation: String(l) };
// // //   });

// // //   return map;
// // // };

// // // /* ========================================================= */
// // // const Course = () => {
// // //   const { userid, courseid } = useParams();

// // //   const [expandedSection, setExpandedSection] = useState(null);
// // //   const [expandedQuizCategory, setExpandedQuizCategory] = useState(null);

// // //   const [loading, setLoading] = useState(true);
// // //   const [course, setCourse] = useState(null);

// // //   // Sidebar structure and content map come ONLY from DB
// // //   const [courseStructure, setCourseStructure] = useState([]);
// // //   const [contentMap, setContentMap] = useState({});

// // //   const [selectedTopic, setSelectedTopic] = useState(null);
// // //   const [visitedTopics, setVisitedTopics] = useState([]);

// // //   const isPaid = useMemo(() => {
// // //     const price = Number(course?.price ?? 0);
// // //     const accessType = String(course?.accessType || "").toLowerCase();
// // //     return price > 0 || accessType === "paid";
// // //   }, [course]);

// // //   const authHeader = (() => {
// // //     const token = localStorage.getItem("token");
// // //     return token ? { Authorization: `Bearer ${token}` } : {};
// // //   })();

// // //   const buildFromModules = (modules) => {
// // //     if (!Array.isArray(modules) || !modules.length) return [];
// // //     return modules.map((m, mi) => ({
// // //       title: m?.title || m?.name || `Module ${mi + 1}`,
// // //       topics: getTopicsArr(m).map((t, ti) => getTopicTitle(t, ti)),
// // //     }));
// // //   };

// // //   const buildContentMapFromModules = (modules) => {
// // //     const map = {};
// // //     if (!Array.isArray(modules)) return map;
// // //     modules.forEach((m) => {
// // //       getTopicsArr(m).forEach((t, ti) => {
// // //         const key = getTopicTitle(t, ti);
// // //         if (!key) return;
// // //         map[key] = {
// // //           heading: key,
// // //           code: getTopicCode(t),
// // //           explanation: getTopicBody(t) || "",
// // //         };
// // //       });
// // //     });
// // //     return map;
// // //   };

// // //   const groupExams = (exams) => {
// // //     if (!Array.isArray(exams) || exams.length === 0) return null;
// // //     const buckets = { Basics: [], Intermediate: [], Advanced: [], Other: [] };

// // //     exams.forEach((e, idx) => {
// // //       const base =
// // //         e?.title ||
// // //         e?.name ||
// // //         e?.slug ||
// // //         `Quiz ${String(idx + 1).padStart(2, "0")}`;
// // //       const qLabel = base.startsWith("Quiz") ? base : `Quiz: ${base}`;

// // //       const level = String(
// // //         e?.difficulty || e?.level || e?.section || ""
// // //       ).toLowerCase();
// // //       if (level.includes("basic")) buckets.Basics.push(qLabel);
// // //       else if (level.includes("inter") || level === "medium")
// // //         buckets.Intermediate.push(qLabel);
// // //       else if (level.includes("adv") || level === "hard")
// // //         buckets.Advanced.push(qLabel);
// // //       else buckets.Other.push(qLabel);
// // //     });

// // //     const topics = [];
// // //     if (buckets.Basics.length)
// // //       topics.push({ title: "Basics", quizzes: buckets.Basics });
// // //     if (buckets.Intermediate.length)
// // //       topics.push({ title: "Intermediate", quizzes: buckets.Intermediate });
// // //     if (buckets.Advanced.length)
// // //       topics.push({ title: "Advanced", quizzes: buckets.Advanced });
// // //     if (buckets.Other.length)
// // //       topics.push({ title: "Other", quizzes: buckets.Other });

// // //     return topics.length ? { title: "Quizzes", topics } : null;
// // //   };

// // //   const fetchCourse = async () => {
// // //     if (looksLikeId(courseid)) {
// // //       return axios.get(`${API}/api/get-course-by-id/${courseid}`, {
// // //         headers: authHeader,
// // //       });
// // //     }
// // //     return axios.get(
// // //       `${API}/api/get-course-by-slug/slug/${encodeURIComponent(courseid)}`,
// // //       {
// // //         headers: authHeader,
// // //       }
// // //     );
// // //   };

// // //   const fetchExamsSmart = async (c) => {
// // //     const degreeId = typeof c?.degree === "object" ? c?.degree?._id : c?.degree;
// // //     const semId =
// // //       typeof c?.semister === "object" ? c?.semister?._id : c?.semister;
// // //     const cid = c?._id || c?.id || courseid;

// // //     if (looksLikeId(degreeId) && looksLikeId(semId) && looksLikeId(cid)) {
// // //       try {
// // //         const r = await axios.get(
// // //           `${API}/api/get-published-by-dsc/${degreeId}/${semId}/${cid}`,
// // //           { headers: authHeader }
// // //         );
// // //         const arr = pickArray(r.data);
// // //         if (arr.length) return arr;
// // //       } catch {
// // //         /* ignore and fall back */
// // //       }
// // //     }

// // //     try {
// // //       const r = await axios.get(`${API}/api/list-exams`, {
// // //         headers: authHeader,
// // //       });
// // //       const arr = pickArray(r.data);
// // //       return arr.filter((ex) => {
// // //         const exCourseId =
// // //           (typeof ex?.course === "object" ? ex?.course?._id : ex?.course) ||
// // //           (typeof ex?.courseId === "object" ? ex?.courseId?._id : ex?.courseId);
// // //         return exCourseId && (exCourseId === c?._id || exCourseId === c?.id);
// // //       });
// // //     } catch {
// // //       return [];
// // //     }
// // //   };

// // //   const load = async () => {
// // //     setLoading(true);
// // //     try {
// // //       // 1) Course
// // //       const courseRes = await fetchCourse();
// // //       const c = pickObject(courseRes.data);
// // //       setCourse(c || null);

// // //       // 2) Modules
// // //       const modules = extractModulesArray(c);
// // //       const sectionBlocks = buildFromModules(modules);
// // //       const contentFromModules = buildContentMapFromModules(modules);

// // //       // 3) Exams (Quizzes)
// // //       const exams = await fetchExamsSmart(c);
// // //       const quizSection = groupExams(exams);

// // //       // 4) NEW: Overview + Resources from DB
// // //       const overviewSection = buildOverviewSection(c);
// // //       const resourcesSection = buildResourcesSection(c);
// // //       const extrasContent = buildContentMapForExtras(c);

// // //       // 5) Build final structure (DB only)
// // //       const built = [];
// // //       if (overviewSection) built.push(overviewSection); // optional
// // //       if (sectionBlocks.length) built.push(...sectionBlocks);
// // //       if (resourcesSection) built.push(resourcesSection); // optional
// // //       if (quizSection) built.push(quizSection);

// // //       setCourseStructure(built);
// // //       setContentMap({ ...contentFromModules, ...extrasContent });

// // //       // 6) Select first available topic if any
// // //       const firstTopic =
// // //         overviewSection?.topics?.[0] ||
// // //         (sectionBlocks[0]?.topics && sectionBlocks[0].topics[0]) ||
// // //         resourcesSection?.topics?.[0] ||
// // //         (quizSection && quizSection.topics?.[0]?.quizzes?.[0]) ||
// // //         null;

// // //       setSelectedTopic(firstTopic);
// // //       setVisitedTopics(firstTopic ? [firstTopic] : []);
// // //     } catch {
// // //       setCourseStructure([]);
// // //       setContentMap({});
// // //       setSelectedTopic(null);
// // //       setVisitedTopics([]);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   useEffect(() => {
// // //     load();
// // //     // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [courseid]);

// // //   /* ---------- derived ---------- */
// // //   const allFlatTopics = useMemo(() => {
// // //     return courseStructure.flatMap((section) =>
// // //       section.title === "Quizzes"
// // //         ? (section.topics || []).flatMap((cat) => cat.quizzes || [])
// // //         : section.topics || []
// // //     );
// // //   }, [courseStructure]);

// // //   const currentIndex = selectedTopic
// // //     ? allFlatTopics.indexOf(selectedTopic)
// // //     : -1;
// // //   const totalTopics = allFlatTopics.length;
// // //   const percentageCompleted = Math.floor(
// // //     totalTopics > 0 ? (visitedTopics.length / totalTopics) * 100 : 0
// // //   );

// // //   const current = (selectedTopic && contentMap[selectedTopic]) || {
// // //     heading: "No data available from database.",
// // //     code: "",
// // //     explanation: "",
// // //   };

// // //   /* ---------- actions ---------- */
// // //   const handleTopicChange = (topic) => {
// // //     setSelectedTopic(topic);
// // //     if (isPaid && topic && !visitedTopics.includes(topic)) {
// // //       setVisitedTopics((prev) => [...prev, topic]);
// // //     }
// // //   };
// // //   const nextTopic = () => {
// // //     if (currentIndex > -1 && currentIndex < totalTopics - 1) {
// // //       handleTopicChange(allFlatTopics[currentIndex + 1]);
// // //     }
// // //   };
// // //   const prevTopic = () => {
// // //     if (currentIndex > 0) {
// // //       handleTopicChange(allFlatTopics[currentIndex - 1]);
// // //     }
// // //   };

// // //   /* ================== UI (unchanged) ================== */
// // //   return (
// // //     <div className="w-full flex flex-col lg:flex-row px-6 lg:px-20 py-8 container border-b pb-5">
// // //       {/* Sidebar */}
// // //       <div className="lg:w-72 w-full lg:pr-4 border-r mb-6 lg:mb-0">
// // //         <h2 className="text-xl font-bold mb-6 text-purple-700">
// // //           Course Contents
// // //         </h2>

// // //         {loading ? (
// // //           <div className="text-sm text-gray-500 mb-4">Loading…</div>
// // //         ) : courseStructure.length === 0 ? (
// // //           <div className="text-sm text-gray-500 mb-4">
// // //             No sections available.
// // //           </div>
// // //         ) : null}

// // //         <div className="space-y-4">
// // //           {courseStructure.map((section, index) => (
// // //             <div key={`${section.title}-${index}`}>
// // //               <button
// // //                 onClick={() =>
// // //                   setExpandedSection(expandedSection === index ? null : index)
// // //                 }
// // //                 className="flex justify-between items-center w-full text-left font-medium text-blue-900 hover:underline"
// // //               >
// // //                 {section.title}
// // //                 {expandedSection === index ? (
// // //                   <FaChevronUp className="ml-2" />
// // //                 ) : (
// // //                   <FaChevronDown className="ml-2" />
// // //                 )}
// // //               </button>

// // //               {/* Non-Quiz Sections */}
// // //               {section.title !== "Quizzes" && (
// // //                 <div
// // //                   className={`transition-all duration-500 overflow-hidden ${
// // //                     expandedSection === index ? "max-h-96 mt-2" : "max-h-0"
// // //                   }`}
// // //                 >
// // //                   <ul className="pl-4 space-y-1">
// // //                     {(section.topics || []).map((topic, idx) => (
// // //                       <li
// // //                         key={`${topic}-${idx}`}
// // //                         className="flex items-center gap-2"
// // //                       >
// // //                         <button
// // //                           onClick={() => handleTopicChange(topic)}
// // //                           className={`text-sm ${
// // //                             selectedTopic === topic
// // //                               ? "text-purple-600 font-medium underline"
// // //                               : "text-gray-700 hover:text-purple-500"
// // //                           }`}
// // //                         >
// // //                           {topic}
// // //                         </button>
// // //                         {isPaid && visitedTopics.includes(topic) && (
// // //                           <FaCheckCircle className="text-green-500 text-xs" />
// // //                         )}
// // //                       </li>
// // //                     ))}
// // //                   </ul>
// // //                 </div>
// // //               )}

// // //               {/* Quizzes */}
// // //               {section.title === "Quizzes" && expandedSection === index && (
// // //                 <div className="pl-4 mt-2 space-y-2">
// // //                   {(section.topics || []).map((quizCat, quizIndex) => (
// // //                     <div key={`${quizCat.title}-${quizIndex}`}>
// // //                       <button
// // //                         onClick={() =>
// // //                           setExpandedQuizCategory(
// // //                             expandedQuizCategory === quizIndex
// // //                               ? null
// // //                               : quizIndex
// // //                           )
// // //                         }
// // //                         className="flex justify-between items-center w-full text-left text-sm font-medium text-indigo-700"
// // //                       >
// // //                         {quizCat.title}
// // //                         {expandedQuizCategory === quizIndex ? (
// // //                           <FaChevronUp />
// // //                         ) : (
// // //                           <FaChevronDown />
// // //                         )}
// // //                       </button>
// // //                       <div
// // //                         className={`transition-all duration-500 overflow-hidden ${
// // //                           expandedQuizCategory === quizIndex
// // //                             ? "max-h-96 mt-1"
// // //                             : "max-h-0"
// // //                         }`}
// // //                       >
// // //                         <ul className="pl-4 space-y-1 mt-1">
// // //                           {(quizCat.quizzes || []).map((quiz, qidx) => (
// // //                             <li
// // //                               key={`${quiz}-${qidx}`}
// // //                               className="flex items-center gap-2"
// // //                             >
// // //                               <button
// // //                                 onClick={() => handleTopicChange(quiz)}
// // //                                 className={`text-sm ${
// // //                                   selectedTopic === quiz
// // //                                     ? "text-purple-600 font-medium underline"
// // //                                     : "text-gray-700 hover:text-purple-500"
// // //                                 }`}
// // //                               >
// // //                                 {quiz}
// // //                               </button>
// // //                               {isPaid && visitedTopics.includes(quiz) && (
// // //                                 <FaCheckCircle className="text-green-500 text-xs" />
// // //                               )}
// // //                             </li>
// // //                           ))}
// // //                         </ul>
// // //                       </div>
// // //                     </div>
// // //                   ))}
// // //                 </div>
// // //               )}
// // //             </div>
// // //           ))}
// // //         </div>
// // //       </div>

// // //       {/* Main Content */}
// // //       <div className="flex-1 pl-0 lg:pl-8">
// // //         <div className="flex items-center flex-wrap gap-2">
// // //           <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
// // //             {current.heading}
// // //           </h1>
// // //           {isPaid && totalTopics > 0 ? (
// // //             <span className="ml-auto text-sm text-gray-600">
// // //               Course Progress: {percentageCompleted}% completed
// // //             </span>
// // //           ) : null}
// // //         </div>

// // //         {/* Code (only if present from DB) */}
// // //         {current.code ? (
// // //           <div className="mb-6">
// // //             <h2 className="text-xl font-semibold text-purple-700 mb-2">
// // //               Code Example:
// // //             </h2>
// // //             <pre className="bg-gray-100 text-sm p-4 rounded border overflow-auto">
// // //               <code>{current.code}</code>
// // //             </pre>
// // //           </div>
// // //         ) : null}

// // //         {/* Explanation */}
// // //         {current.explanation ? (
// // //           <div>
// // //             <h2 className="text-xl font-semibold text-purple-700 mb-2">
// // //               Explanation:
// // //             </h2>
// // //             <p className="text-gray-800 leading-relaxed whitespace-pre-line">
// // //               {current.explanation}
// // //             </p>
// // //           </div>
// // //         ) : null}

// // //         {/* Pagination */}
// // //         {totalTopics > 0 ? (
// // //           <div className="mt-8 flex items-center flex-wrap gap-4">
// // //             <button
// // //               onClick={prevTopic}
// // //               disabled={currentIndex <= 0}
// // //               className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
// // //             >
// // //               ← {allFlatTopics[currentIndex - 1] || ""}
// // //             </button>
// // //             <button
// // //               onClick={nextTopic}
// // //               disabled={currentIndex === -1 || currentIndex >= totalTopics - 1}
// // //               className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
// // //             >
// // //               {allFlatTopics[currentIndex + 1] || ""} →
// // //             </button>
// // //           </div>
// // //         ) : null}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // export default Course;

// // ///

// // //

// // //
// src/pages/course_pages/Course.jsx
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
const getTopicCode = (t) => t?.codeExample || t?.code || t?.snippet || "";
const getTopicBody = (t) =>
  t?.content || t?.description || t?.body || t?.text || "";

/* ---------- sections from other DB fields ---------- */
const buildOverviewSection = (course) => {
  const req = Array.isArray(course?.requirements) ? course.requirements : [];
  const los = Array.isArray(course?.learningOutcomes)
    ? course.learningOutcomes
    : [];
  const topics = [];
  req.forEach((r) => topics.push(`Requirement: ${String(r)}`));
  los.forEach((o) => topics.push(`Outcome: ${String(o)}`));
  return topics.length ? { title: "Overview", topics } : null;
};
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
const buildContentMapForExtras = (course) => {
  const map = {};
  (Array.isArray(course?.requirements) ? course.requirements : []).forEach(
    (r) => {
      const key = `Requirement: ${String(r)}`;
      map[key] = { heading: key, code: "", explanation: String(r) };
    }
  );
  (Array.isArray(course?.learningOutcomes)
    ? course.learningOutcomes
    : []
  ).forEach((o) => {
    const key = `Outcome: ${String(o)}`;
    map[key] = { heading: key, code: "", explanation: String(o) };
  });
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
const groupExams = (exams) => {
  if (!Array.isArray(exams) || exams.length === 0) return null;
  const buckets = { Basics: [], Intermediate: [], Advanced: [], Other: [] };
  exams.forEach((e, idx) => {
    const base =
      e?.title ||
      e?.name ||
      e?.slug ||
      `Quiz ${String(idx + 1).padStart(2, "0")}`;
    const qLabel = base.startsWith("Quiz") ? base : `Quiz: ${base}`;
    const level = String(
      e?.difficulty || e?.level || e?.section || ""
    ).toLowerCase();
    if (level.includes("basic")) buckets.Basics.push(qLabel);
    else if (level.includes("inter") || level === "medium")
      buckets.Intermediate.push(qLabel);
    else if (level.includes("adv") || level === "hard")
      buckets.Advanced.push(qLabel);
    else buckets.Other.push(qLabel);
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

  // Update document title
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
  const buildContentMapFromModules = (modules) => {
    const map = {};
    if (!Array.isArray(modules)) return map;
    modules.forEach((m) => {
      getTopicsArr(m).forEach((t, ti) => {
        const key = getTopicTitle(t, ti);
        if (!key) return;
        map[key] = {
          heading: key,
          code: getTopicCode(t),
          explanation: getTopicBody(t) || "",
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
      {
        headers: authHeader,
      }
    );
  };
  const fetchExamsSmart = async (c) => {
    const degreeId = typeof c?.degree === "object" ? c?.degree?._id : c?.degree;
    const semId =
      typeof c?.semister === "object" ? c?.semister?._id : c?.semister;
    const cid = c?._id || c?.id || courseid;

    if (looksLikeId(degreeId) && looksLikeId(semId) && looksLikeId(cid)) {
      try {
        const r = await axios.get(
          `${API}/api/get-published-by-dsc/${degreeId}/${semId}/${cid}`,
          { headers: authHeader }
        );
        const arr = pickArray(r.data);
        if (arr.length) return arr;
      } catch {
        /* ignore */
      }
    }

    try {
      const r = await axios.get(`${API}/api/list-exams`, {
        headers: authHeader,
      });
      const arr = pickArray(r.data);
      return arr.filter((ex) => {
        const exCourseId =
          (typeof ex?.course === "object" ? ex?.course?._id : ex?.course) ||
          (typeof ex?.courseId === "object" ? ex?.courseId?._id : ex?.courseId);
        return exCourseId && (exCourseId === c?._id || exCourseId === c?.id);
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

      // Exams (Quizzes)
      const exams = await fetchExamsSmart(c);
      const actualQuizSection = groupExams(exams);
      const quizSection = actualQuizSection || emptyQuizSection;

      // Overview + Resources
      const overviewSection = buildOverviewSection(c);
      const resourcesSection = buildResourcesSection(c);
      const extrasContent = buildContentMapForExtras(c);

      // Final structure
      const built = [];
      if (overviewSection) built.push(overviewSection);
      if (sectionBlocks.length) built.push(...sectionBlocks);
      if (resourcesSection) built.push(resourcesSection);
      built.push(quizSection); // keep last like dummy page

      setCourseStructure(built);
      setContentMap({ ...contentFromModules, ...extrasContent });

      // Initial topic + expand first module (skip Quizzes)
      const firstTopic =
        overviewSection?.topics?.[0] ||
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
    code: "",
    explanation: "",
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
        {(course?.level || course?.language) && (
          <p className="text-sm text-gray-600 mt-1">
            {course?.level ? `${course.level}` : ""}
            {course?.level && course?.language ? " · " : ""}
            {course?.language ? `${course.language}` : ""}
          </p>
        )}
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
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
              {current.heading}
            </h1>
            {isPaid && totalTopics > 0 ? (
              <span className="ml-auto text-sm text-gray-600">
                Course Progress: {percentageCompleted}% completed
              </span>
            ) : null}
          </div>

          {current.code ? (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-purple-700 mb-2">
                Code Example:
              </h2>
              <pre className="bg-gray-100 text-sm p-4 rounded border overflow-auto">
                <code>{current.code}</code>
              </pre>
            </div>
          ) : null}

          {current.explanation ? (
            <div>
              <h2 className="text-xl font-semibold text-purple-700 mb-2">
                Explanation:
              </h2>
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                {current.explanation}
              </p>
            </div>
          ) : null}

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
