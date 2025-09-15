// src/pages/CreateQuestion.jsx
import React, { useEffect, useMemo, useState } from "react";

const API = import.meta?.env?.VITE_API_URL || "http://localhost:3011";

// ---------- tiny UI primitives ----------
const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-lg border p-4 mb-6">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-gray-600">{open ? "−" : "+"}</span>
      </div>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
};

const Field = ({ label, children, required, hint }) => (
  <div className="mb-4">
    <label className="block font-medium mb-1">
      {label} {required ? <span className="text-red-600">*</span> : null}
    </label>
    {children}
    {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
  </div>
);

const Row = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

const Button = ({ className = "", ...props }) => (
  <button
    className={
      "px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 " +
      className
    }
    {...props}
  />
);

const PrimaryButton = ({ className = "", ...props }) => (
  <button
    className={
      "px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 " +
      className
    }
    {...props}
  />
);

// ---------- helpers ----------
const coerceNumber = (v, def = undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const toCSV = (arr) =>
  Array.isArray(arr) ? arr.join(",") : typeof arr === "string" ? arr : "";

export default function CreateQuestion() {
  // -------- dropdowns / lists --------
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  // selection
  const [degreeId, setDegreeId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [attachTarget, setAttachTarget] = useState("none"); // "none" | "exam" | "quiz"
  const [examId, setExamId] = useState("");
  const [quizId, setQuizId] = useState("");

  // -------- core fields --------
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("mcq");

  // MCQ
  const [options, setOptions] = useState([
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" },
  ]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [randomizeOptions, setRandomizeOptions] = useState(true);

  // T/F
  const [correctBoolean, setCorrectBoolean] = useState(true);

  // Theory (essay)
  const [theoryAnswer, setTheoryAnswer] = useState("");
  const [rubric, setRubric] = useState("");
  const [maxWords, setMaxWords] = useState("");

  // Programming
  const [programmingLanguage, setProgrammingLanguage] = useState("javascript");
  const [starterCode, setStarterCode] = useState("");
  const [testcases, setTestcases] = useState([
    { input: "", expectedOutput: "", weight: 1 },
  ]);

  // Direct
  const [directAnswer, setDirectAnswer] = useState("");

  // Scoring / control
  const [marksAlloted, setMarksAlloted] = useState(1);
  const [negativeMark, setNegativeMark] = useState(0);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0);
  const [difficulty, setDifficulty] = useState("medium");
  const [status, setStatus] = useState("draft");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState("");
  const [section, setSection] = useState("");

  // Classification / meta
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [chapter, setChapter] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState(""); // CSV or JSON handled server-side
  const [language, setLanguage] = useState("English");
  const [tags, setTags] = useState(""); // CSV or JSON
  const [explanation, setExplanation] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState([
    { type: "image", url: "", caption: "" },
  ]);

  // Feedback
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [serverErr, setServerErr] = useState("");

  // ---------- load dropdown data ----------
  // Degrees
  useEffect(() => {
    const loadDegrees = async () => {
      try {
        const r = await fetch(`${API}/api/list-degrees`);
        const j = await r.json();
        setDegrees(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []);
      } catch {
        setDegrees([]);
      }
    };
    loadDegrees();
  }, []);

  // Semesters by degree
  useEffect(() => {
    if (!degreeId) {
      setSemesters([]);
      setSemesterId("");
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(
          `${API}/api/semesters?degree=${encodeURIComponent(
            degreeId
          )}&degreeId=${encodeURIComponent(
            degreeId
          )}&limit=1000&sortBy=order&sortDir=asc`,
          { signal: ac.signal }
        );
        const j = await r.json();
        setSemesters(
          Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
        );
      } catch (e) {
        if (e.name !== "AbortError") setSemesters([]);
      }
    })();
    return () => ac.abort();
  }, [degreeId]);

  // Courses (try multiple endpoints)
  useEffect(() => {
    const loadCourses = async () => {
      const tryUrls = [`${API}/api/list-courses`, `${API}/api/courses`];
      for (const url of tryUrls) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const j = await r.json();
          const arr = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j?.items)
            ? j.items
            : Array.isArray(j?.results)
            ? j.results
            : Array.isArray(j)
            ? j
            : [];
          if (arr.length) {
            setCourses(arr);
            return;
          }
        } catch {
          /* try next */
        }
      }
      setCourses([]);
    };
    loadCourses();
  }, []);

  // Exams
  useEffect(() => {
    const loadExams = async () => {
      try {
        const r = await fetch(`${API}/api/list-exams`);
        const j = await r.json();
        const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setExams(arr);
      } catch {
        setExams([]);
      }
    };
    loadExams();
  }, []);

  // Quizzes
  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const r = await fetch(`${API}/api/list-quizzes`);
        const j = await r.json();
        const arr = Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j?.quizzes)
          ? j.quizzes
          : Array.isArray(j)
          ? j
          : [];
        setQuizzes(arr);
      } catch {
        setQuizzes([]);
      }
    };
    loadQuizzes();
  }, []);

  // ensure only one container selected
  useEffect(() => {
    if (attachTarget === "exam") {
      setQuizId("");
    } else if (attachTarget === "quiz") {
      setExamId("");
    } else {
      setExamId("");
      setQuizId("");
    }
  }, [attachTarget]);

  // ---------- handlers ----------
  const updateOption = (idx, field, value) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o))
    );
  };

  const addAttachment = () => {
    setAttachments((prev) => [
      ...prev,
      { type: "image", url: "", caption: "" },
    ]);
  };

  const updateAttachment = (idx, field, value) => {
    setAttachments((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const addTestcase = () => {
    setTestcases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", weight: 1 },
    ]);
  };

  const updateTestcase = (idx, field, value) => {
    setTestcases((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  };

  const removeTestcase = (idx) => {
    setTestcases((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setServerMsg("");
    setServerErr("");

    try {
      const payload = {
        // core
        question_text: questionText,
        question_type: questionType,

        // relations (optional)
        degree: degreeId || undefined,
        semester: semesterId || undefined,
        course: courseId || undefined,

        // choose one container
        exam: attachTarget === "exam" ? examId || undefined : undefined,
        quiz: attachTarget === "quiz" ? quizId || undefined : undefined,

        // section/order
        section: section || undefined,
        order: coerceNumber(order, undefined),

        // type-specific
        ...(questionType === "mcq"
          ? {
              options: options.map((o, i) => ({
                key: ["A", "B", "C", "D"][i] || o.key || "",
                text: o.text,
                media: Array.isArray(o.media) ? o.media : undefined, // left for future; UI not editing media here
              })),
              correctOptionIndex: Number(correctOptionIndex),
              randomizeOptions: !!randomizeOptions,
            }
          : {}),
        ...(questionType === "true_false"
          ? { correctBoolean: !!correctBoolean }
          : {}),
        ...(questionType === "theory"
          ? {
              theory_answer: theoryAnswer || undefined,
              rubric: rubric || undefined,
              maxWords: coerceNumber(maxWords, 0),
            }
          : {}),
        ...(questionType === "programming"
          ? {
              programming_language: programmingLanguage || undefined,
              starterCode: starterCode || undefined,
              testcases: (testcases || []).map((t) => ({
                input: t.input ?? "",
                expectedOutput: t.expectedOutput ?? "",
                weight: coerceNumber(t.weight, 1) ?? 1,
              })),
            }
          : {}),
        ...(questionType === "direct"
          ? { direct_answer: directAnswer || undefined }
          : {}),

        // scoring
        marks_alloted: coerceNumber(marksAlloted, 1) ?? 1,
        negativeMarkPerQuestion: coerceNumber(negativeMark, 0) ?? 0,
        timeLimitSeconds: coerceNumber(timeLimitSeconds, 0) ?? 0,

        // meta
        topic: topic || undefined,
        subtopic: subtopic || undefined,
        chapter: chapter || undefined,
        learningOutcomes: learningOutcomes, // server accepts CSV/JSON
        difficultyLevel: difficulty,
        language: language || "English",
        tags: tags, // server accepts CSV/JSON
        explanation: explanation || undefined,

        // attachments
        attachments: (attachments || [])
          .filter((a) => a.url?.trim())
          .map((a) => ({
            type: a.type || "image",
            url: a.url.trim(),
            caption: a.caption || "",
          })),

        // lifecycle
        isActive: !!isActive,
        status,
      };

      const r = await fetch(`${API}/api/create-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!r.ok) {
        setServerErr(j?.message || "Failed to create question");
      } else {
        setServerMsg("✅ Question created successfully.");
        // optional: reset();
      }
    } catch (err) {
      setServerErr("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDegreeId("");
    setSemesterId("");
    setCourseId("");
    setAttachTarget("none");
    setExamId("");
    setQuizId("");
    setQuestionText("");
    setQuestionType("mcq");
    setOptions([
      { key: "A", text: "" },
      { key: "B", text: "" },
      { key: "C", text: "" },
      { key: "D", text: "" },
    ]);
    setCorrectOptionIndex(0);
    setRandomizeOptions(true);
    setCorrectBoolean(true);
    setTheoryAnswer("");
    setRubric("");
    setMaxWords("");
    setProgrammingLanguage("javascript");
    setStarterCode("");
    setTestcases([{ input: "", expectedOutput: "", weight: 1 }]);
    setDirectAnswer("");
    setMarksAlloted(1);
    setNegativeMark(0);
    setTimeLimitSeconds(0);
    setDifficulty("medium");
    setStatus("draft");
    setIsActive(true);
    setOrder("");
    setSection("");
    setTopic("");
    setSubtopic("");
    setChapter("");
    setLearningOutcomes("");
    setLanguage("English");
    setTags("");
    setExplanation("");
    setAttachments([{ type: "image", url: "", caption: "" }]);
    setServerErr("");
    setServerMsg("");
  };

  const containerHint = useMemo(() => {
    if (attachTarget === "exam")
      return "Attach this question to an Exam (order auto if omitted).";
    if (attachTarget === "quiz")
      return "Attach this question to a Quiz (order auto if omitted).";
    return "Keep in Bank (no Exam/Quiz association).";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachTarget]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-6">Create Question</h1>

      {/* Container (Exam / Quiz / None) */}
      <Section title="Attach To (Optional)" defaultOpen={true}>
        <Field label="Where to attach?" hint={containerHint}>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="attachTarget"
                checked={attachTarget === "none"}
                onChange={() => setAttachTarget("none")}
              />
              <span>None (Question Bank)</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="attachTarget"
                checked={attachTarget === "exam"}
                onChange={() => setAttachTarget("exam")}
              />
              <span>Exam</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="attachTarget"
                checked={attachTarget === "quiz"}
                onChange={() => setAttachTarget("quiz")}
              />
              <span>Quiz</span>
            </label>
          </div>
        </Field>

        {attachTarget === "exam" && (
          <Row>
            <Field label="Exam">
              <select
                className="w-full border rounded-md p-2"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
              >
                <option value="">Select exam…</option>
                {exams.map((ex) => (
                  <option key={ex._id || ex.id} value={ex._id || ex.id}>
                    {ex.title || ex.examName || ex.name || ex._id}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Section (optional)"
              hint={`e.g. "Section 1 - One Mark"`}
            >
              <input
                className="w-full border rounded-md p-2"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </Field>
          </Row>
        )}

        {attachTarget === "quiz" && (
          <Row>
            <Field label="Quiz">
              <select
                className="w-full border rounded-md p-2"
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
              >
                <option value="">Select quiz…</option>
                {quizzes.map((q) => (
                  <option key={q._id || q.id} value={q._id || q.id}>
                    {q.title || q.quizName || q.name || q._id}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Section (optional)"
              hint={`e.g. "Section 1 - One Mark"`}
            >
              <input
                className="w-full border rounded-md p-2"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </Field>
          </Row>
        )}

        <Row>
          <Field
            label="Explicit Order (optional)"
            hint="Leave blank to auto-place at end."
          >
            <input
              type="number"
              className="w-full border rounded-md p-2"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            />
          </Field>
        </Row>
      </Section>

      {/* Academic relations (optional) */}
      <Section title="Academic Context (Optional)" defaultOpen={false}>
        <Row>
          <Field label="Degree">
            <select
              className="w-full border rounded-md p-2"
              value={degreeId}
              onChange={(e) => setDegreeId(e.target.value)}
            >
              <option value="">(none)</option>
              {degrees.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  {d.title || d.name || d.slug || d._id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Semester">
            <select
              className="w-full border rounded-md p-2"
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              disabled={!degreeId}
            >
              <option value="">(none)</option>
              {semesters.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.title || s.name || s.slug || s._id}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Course">
            <select
              className="w-full border rounded-md p-2"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">(none)</option>
              {courses.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.title || c.name || c.slug || c.code || c._id}
                </option>
              ))}
            </select>
          </Field>
        </Row>
      </Section>

      {/* Core question */}
      <Section title="Question" defaultOpen={true}>
        <Row>
          <Field label="Question Type" required>
            <select
              className="w-full border rounded-md p-2"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
            >
              <option value="mcq">mcq</option>
              <option value="true_false">true_false</option>
              <option value="theory">theory</option>
              <option value="programming">programming</option>
              <option value="direct">direct</option>
            </select>
          </Field>

          <Field label="Language">
            <input
              className="w-full border rounded-md p-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="English"
            />
          </Field>
        </Row>

        <Field label="Question Text" required>
          <textarea
            className="w-full border rounded-md p-2"
            rows={3}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </Field>

        {/* Type specific UIs */}
        {questionType === "mcq" && (
          <div className="border rounded-md p-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Multiple Choice (4 options)</h3>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!randomizeOptions}
                  onChange={(e) => setRandomizeOptions(e.target.checked)}
                />
                <span>Randomize Options</span>
              </label>
            </div>
            {options.map((opt, idx) => (
              <div key={idx} className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Option {["A", "B", "C", "D"][idx]}
                </label>
                <input
                  className="w-full border rounded-md p-2"
                  value={opt.text}
                  onChange={(e) => updateOption(idx, "text", e.target.value)}
                  placeholder={`Enter option ${["A", "B", "C", "D"][idx]} text`}
                />
              </div>
            ))}
            <Field label="Correct Option">
              <select
                className="w-full border rounded-md p-2"
                value={correctOptionIndex}
                onChange={(e) => setCorrectOptionIndex(Number(e.target.value))}
              >
                <option value={0}>A</option>
                <option value={1}>B</option>
                <option value={2}>C</option>
                <option value={3}>D</option>
              </select>
            </Field>
          </div>
        )}

        {questionType === "true_false" && (
          <div className="border rounded-md p-3 mb-4">
            <h3 className="font-medium mb-2">True or False</h3>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!correctBoolean}
                onChange={(e) => setCorrectBoolean(e.target.checked)}
              />
              <span>Correct is True (untick for False)</span>
            </label>
          </div>
        )}

        {questionType === "theory" && (
          <div className="border rounded-md p-3 mb-4">
            <h3 className="font-medium mb-2">Theory (Essay)</h3>
            <Field label="Model Answer (optional)">
              <textarea
                className="w-full border rounded-md p-2"
                rows={4}
                value={theoryAnswer}
                onChange={(e) => setTheoryAnswer(e.target.value)}
              />
            </Field>
            <Row>
              <Field label="Rubric (optional)">
                <textarea
                  className="w-full border rounded-md p-2"
                  rows={3}
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                />
              </Field>
              <Field label="Max Words (0 = no limit)">
                <input
                  type="number"
                  className="w-full border rounded-md p-2"
                  value={maxWords}
                  onChange={(e) => setMaxWords(e.target.value)}
                  min={0}
                />
              </Field>
            </Row>
          </div>
        )}

        {questionType === "programming" && (
          <div className="border rounded-md p-3 mb-4">
            <h3 className="font-medium mb-2">Programming (Coding)</h3>
            <Row>
              <Field label="Language">
                <select
                  className="w-full border rounded-md p-2"
                  value={programmingLanguage}
                  onChange={(e) => setProgrammingLanguage(e.target.value)}
                >
                  <option>javascript</option>
                  <option>typescript</option>
                  <option>python</option>
                  <option>java</option>
                  <option>c</option>
                  <option>cpp</option>
                  <option>csharp</option>
                  <option>go</option>
                  <option>rust</option>
                  <option>ruby</option>
                  <option>php</option>
                  <option>swift</option>
                  <option>kotlin</option>
                </select>
              </Field>
              <Field label="Starter Code">
                <textarea
                  className="w-full border rounded-md p-2"
                  rows={4}
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  placeholder={`// boilerplate code shown to students`}
                />
              </Field>
            </Row>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Hidden Testcases</h4>
                <Button type="button" onClick={addTestcase}>
                  + Add Testcase
                </Button>
              </div>
              {testcases.map((t, idx) => (
                <div key={idx} className="border rounded p-3 mb-3">
                  <Row>
                    <Field label="Input">
                      <textarea
                        className="w-full border rounded-md p-2"
                        rows={2}
                        value={t.input}
                        onChange={(e) =>
                          updateTestcase(idx, "input", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Expected Output">
                      <textarea
                        className="w-full border rounded-md p-2"
                        rows={2}
                        value={t.expectedOutput}
                        onChange={(e) =>
                          updateTestcase(idx, "expectedOutput", e.target.value)
                        }
                      />
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Weight">
                      <input
                        type="number"
                        className="w-full border rounded-md p-2"
                        value={t.weight}
                        onChange={(e) =>
                          updateTestcase(idx, "weight", e.target.value)
                        }
                        min={0}
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        className="text-red-600 border-red-300"
                        onClick={() => removeTestcase(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                  </Row>
                </div>
              ))}
            </div>
          </div>
        )}

        {questionType === "direct" && (
          <div className="border rounded-md p-3 mb-4">
            <h3 className="font-medium mb-2">Direct Q & A</h3>
            <Field label="Direct Answer (expected answer)">
              <textarea
                className="w-full border rounded-md p-2"
                rows={3}
                value={directAnswer}
                onChange={(e) => setDirectAnswer(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      {/* Scoring & Difficulty */}
      <Section title="Scoring & Constraints" defaultOpen={false}>
        <Row>
          <Field label="Marks Alloted" required>
            <input
              type="number"
              className="w-full border rounded-md p-2"
              value={marksAlloted}
              onChange={(e) => setMarksAlloted(e.target.value)}
              min={0}
            />
          </Field>

          <Field label="Negative Mark per Question">
            <input
              type="number"
              className="w-full border rounded-md p-2"
              value={negativeMark}
              onChange={(e) => setNegativeMark(e.target.value)}
              min={0}
            />
          </Field>
        </Row>

        <Row>
          <Field label="Time Limit (seconds)">
            <input
              type="number"
              className="w-full border rounded-md p-2"
              value={timeLimitSeconds}
              onChange={(e) => setTimeLimitSeconds(e.target.value)}
              min={0}
            />
          </Field>

          <Field label="Difficulty">
            <select
              className="w-full border rounded-md p-2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </Field>
        </Row>
      </Section>

      {/* Classification / metadata */}
      <Section title="Classification & Metadata" defaultOpen={false}>
        <Row>
          <Field label="Topic">
            <input
              className="w-full border rounded-md p-2"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </Field>
          <Field label="Subtopic">
            <input
              className="w-full border rounded-md p-2"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
            />
          </Field>
        </Row>

        <Row>
          <Field label="Chapter">
            <input
              className="w-full border rounded-md p-2"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            />
          </Field>

          <Field label="Learning Outcomes" hint="CSV or JSON array">
            <input
              className="w-full border rounded-md p-2"
              value={learningOutcomes}
              onChange={(e) => setLearningOutcomes(e.target.value)}
              placeholder='e.g. "Trees,BST,Traversals" or ["Trees","BST","Traversals"]'
            />
          </Field>
        </Row>

        <Field label="Tags" hint="CSV or JSON">
          <input
            className="w-full border rounded-md p-2"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </Field>

        <Field label="Post-answer Explanation">
          <textarea
            className="w-full border rounded-md p-2"
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </Field>
      </Section>

      {/* Attachments */}
      <Section title="Attachments (Optional)" defaultOpen={false}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            Add images/audio/video/file URLs that support the question.
          </div>
          <Button type="button" onClick={addAttachment}>
            + Add Attachment
          </Button>
        </div>
        {attachments.map((a, idx) => (
          <div key={idx} className="border rounded p-3 mb-3">
            <Row>
              <Field label="Type">
                <select
                  className="w-full border rounded-md p-2"
                  value={a.type}
                  onChange={(e) =>
                    updateAttachment(idx, "type", e.target.value)
                  }
                >
                  <option>image</option>
                  <option>audio</option>
                  <option>video</option>
                  <option>file</option>
                </select>
              </Field>
              <Field label="URL">
                <input
                  className="w-full border rounded-md p-2"
                  value={a.url}
                  onChange={(e) => updateAttachment(idx, "url", e.target.value)}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Caption">
                <input
                  className="w-full border rounded-md p-2"
                  value={a.caption}
                  onChange={(e) =>
                    updateAttachment(idx, "caption", e.target.value)
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="text-red-600 border-red-300"
                  onClick={() => removeAttachment(idx)}
                >
                  Remove
                </Button>
              </div>
            </Row>
          </div>
        ))}
      </Section>

      {/* Lifecycle */}
      <Section title="Lifecycle" defaultOpen={false}>
        <Row>
          <Field label="Status">
            <select
              className="w-full border rounded-md p-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>draft</option>
              <option>published</option>
              <option>archived</option>
            </select>
          </Field>

          <Field label="Active?">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>isActive</span>
            </label>
          </Field>
        </Row>
      </Section>

      {/* Server feedback */}
      {(serverErr || serverMsg) && (
        <div
          className={
            "mb-4 rounded-md px-3 py-2 text-sm " +
            (serverErr
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200")
          }
        >
          {serverErr || serverMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <PrimaryButton
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create Question"}
        </PrimaryButton>
        <Button type="button" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
