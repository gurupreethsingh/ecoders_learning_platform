import React, { useEffect, useMemo, useState } from "react";

const API = import.meta?.env?.VITE_API_URL || "http://localhost:3011";

// simple slug helper (client-side; server will also slugify if missing)
const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

// ---------- tiny UI primitives ----------
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

// ---------- page ----------
export default function CreateCourse() {
  // dropdown data
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemisters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcats, setSubcats] = useState([]);

  // selection (degree/semester are not sent to course API; just part of flow)
  const [degreeId, setDegreeId] = useState("");
  const [semesterId, setSemisterId] = useState("");

  // category & subcategory (subcategory optional here)
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");

  // subcategory UI state
  const [subcatLoading, setSubcatLoading] = useState(false);
  const [subcatMessage, setSubcatMessage] = useState("");

  // basic course fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("Beginner");
  const [thumbnail, setThumbnail] = useState("");
  const [promoVideoUrl, setPromoVideoUrl] = useState("");
  const [durationInHours, setDurationInHours] = useState("");
  const [price, setPrice] = useState("");

  // marketing
  const [requirements, setRequirements] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [tags, setTags] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  // people
  const [authors, setAuthors] = useState(""); // CSV or JSON of ObjectIds
  const [instructor, setInstructor] = useState(""); // ObjectId

  // content (modules & topics)
  const [modules, setModules] = useState([]);

  // learning resources
  const [videos, setVideos] = useState("");
  const [pdfs, setPdfs] = useState("");
  const [assignments, setAssignments] = useState("");
  const [externalLinks, setExternalLinks] = useState("");

  // access
  const [accessType, setAccessType] = useState("Paid");
  const [maxStudents, setMaxStudents] = useState("");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState("All Topics");

  // certificate
  const [issueCertificate, setIssueCertificate] = useState(true);
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState("");

  // flags & misc
  const [published, setPublished] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [order, setOrder] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [serverErr, setServerErr] = useState("");

  // ---------- load dropdown data ----------
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

    const loadCategories = async () => {
      try {
        const r = await fetch(`${API}/api/all-categories`);
        const j = await r.json();
        // Accept {categories:[]}, {data:[]}, or []
        const arr = Array.isArray(j?.categories)
          ? j.categories
          : Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j)
          ? j
          : [];
        setCategories(arr);
      } catch {
        setCategories([]);
      }
    };

    loadDegrees();
    loadCategories();
  }, []);

  // when degree changes -> load semesters for degree
  useEffect(() => {
    if (!degreeId) {
      setSemisters([]);
      setSemisterId("");
      return;
    }
    const ac = new AbortController();
    const loadSemisters = async () => {
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
        setSemisters(
          Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          setSemisters([]);
        }
      }
    };
    loadSemisters();
    return () => ac.abort();
  }, [degreeId]);

  // when category changes -> load subcategories for category (fail-safe + multiple shapes)
  useEffect(() => {
    if (!categoryId) {
      setSubcats([]);
      setSubCategoryId("");
      setSubcatMessage("");
      return;
    }

    const ac = new AbortController();
    const run = async () => {
      setSubcatLoading(true);
      setSubcatMessage("");

      try {
        // Be compatible with different controller implementations
        const url = `${API}/api/get-subcategories-by-category?categoryId=${encodeURIComponent(
          categoryId
        )}&category=${encodeURIComponent(categoryId)}`;

        const r = await fetch(url, { signal: ac.signal });

        if (!r.ok) {
          setSubcats([]);
          setSubcatMessage(
            "No subcategories are available for the selected category."
          );
          return;
        }

        const j = await r.json();

        // Accept {subcategories:[]}, {data:[]}, {items:[]}, {results:[]}, or []
        const arr = Array.isArray(j?.subcategories)
          ? j.subcategories
          : Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j?.items)
          ? j.items
          : Array.isArray(j?.results)
          ? j.results
          : Array.isArray(j)
          ? j
          : [];

        setSubcats(arr);

        if (arr.length === 0) {
          setSubcatMessage(
            "No subcategories are available for the selected category."
          );
        } else {
          setSubcatMessage("");
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setSubcats([]);
          setSubcatMessage(
            "No subcategories are available for the selected category."
          );
        }
      } finally {
        setSubcatLoading(false);
      }
    };

    run();
    return () => ac.abort();
  }, [categoryId]);

  // keep slug synced with title unless user manually edited
  const derivedSlug = useMemo(() => slugify(title), [title]);
  useEffect(() => {
    if (!slug) setSlug(derivedSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedSlug]);

  // When access type toggles, enforce price rules
  useEffect(() => {
    if (accessType === "Free") {
      // lock UI to 0 while Free
      setPrice("0");
    } else {
      // when switching away from Free, clear old 0 so user re-enters a paid price
      setPrice("");
    }
  }, [accessType]);

  // ---------- modules & topics handlers ----------
  const addModule = () => {
    setModules((prev) => [...prev, { title: "", description: "", topics: [] }]);
  };

  const removeModule = (idx) => {
    setModules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateModuleField = (idx, field, value) => {
    setModules((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const addTopic = (mIndex) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              topics: [
                ...(m.topics || []),
                {
                  title: "",
                  explanation: "",
                  code: "",
                  codeExplanation: "",
                  codeLanguage: "plaintext",
                  videoUrl: "",
                  pdfUrl: "",
                  duration: "",
                  isFreePreview: false,
                },
              ],
            }
          : m
      )
    );
  };

  const removeTopic = (mIndex, tIndex) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? { ...m, topics: m.topics.filter((_, j) => j !== tIndex) }
          : m
      )
    );
  };

  const updateTopicField = (mIndex, tIndex, field, value) => {
    setModules((prev) =>
      prev.map((m, i) =>
        i === mIndex
          ? {
              ...m,
              topics: m.topics.map((t, j) =>
                j === tIndex ? { ...t, [field]: value } : t
              ),
            }
          : m
      )
    );
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setServerMsg("");
    setServerErr("");

    // compute price to send
    const normalizedPrice =
      accessType === "Free"
        ? 0
        : price
        ? Math.max(0, Number(price))
        : undefined;

    // Build payload matching CourseController.normalizeCourseInput
    const payload = {
      title,
      slug: slug || undefined, // server can also fill if missing
      description,
      language,
      level,
      thumbnail: thumbnail || undefined,
      promoVideoUrl: promoVideoUrl || undefined,
      durationInHours: durationInHours ? Number(durationInHours) : undefined,
      price: normalizedPrice,

      category: categoryId || undefined,
      ...(subCategoryId ? { subCategory: subCategoryId } : {}), // optional in UI

      // Marketing strings (CSV/JSON accepted by backend)
      requirements,
      learningOutcomes,
      tags,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      keywords,

      // People
      authors,
      instructor, // required by backend

      // Content
      modules: modules.map((m) => ({
        title: m.title,
        description: m.description,
        topics: (m.topics || []).map((t) => ({
          title: t.title,
          explanation: t.explanation,
          code: t.code,
          codeExplanation: t.codeExplanation,
          codeLanguage: t.codeLanguage || "plaintext",
          videoUrl: t.videoUrl,
          pdfUrl: t.pdfUrl,
          duration: t.duration ? Number(t.duration) : undefined,
          isFreePreview: !!t.isFreePreview,
        })),
      })),

      // Learning resources (CSV/JSON strings OK)
      learningResources: {
        videos,
        pdfs,
        assignments,
        externalLinks,
      },

      // Access
      accessType,
      maxStudents: maxStudents ? Number(maxStudents) : undefined,
      enrollmentDeadline: enrollmentDeadline || undefined,
      completionCriteria,

      // Certificate
      issueCertificate,
      certificateTemplateUrl: certificateTemplateUrl || undefined,

      // Flags
      published,
      isArchived,
      isFeatured,
      order: order ? Number(order) : undefined,
    };

    try {
      const r = await fetch(`${API}/api/create-courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!r.ok) {
        setServerErr(j?.message || "Failed to create course");
      } else {
        setServerMsg("✅ Course created successfully.");
        // Optionally clear the form:
        // reset();
      }
    } catch {
      setServerErr("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDegreeId("");
    setSemisterId("");
    setCategoryId("");
    setSubCategoryId("");
    setTitle("");
    setSlug("");
    setDescription("");
    setLanguage("English");
    setLevel("Beginner");
    setThumbnail("");
    setPromoVideoUrl("");
    setDurationInHours("");
    setPrice("");
    setRequirements("");
    setLearningOutcomes("");
    setTags("");
    setMetaTitle("");
    setMetaDescription("");
    setKeywords("");
    setAuthors("");
    setInstructor("");
    setModules([]);
    setVideos("");
    setPdfs("");
    setAssignments("");
    setExternalLinks("");
    setAccessType("Paid");
    setMaxStudents("");
    setEnrollmentDeadline("");
    setCompletionCriteria("All Topics");
    setIssueCertificate(true);
    setCertificateTemplateUrl("");
    setPublished(false);
    setIsArchived(false);
    setIsFeatured(false);
    setOrder("");
    setServerErr("");
    setServerMsg("");
    setSubcatMessage("");
    setSubcats([]);
  };

  const isFree = accessType === "Free";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-6">Create Course</h1>

      {/* Step 1: Degree & Semister */}
      <div className="rounded-lg border p-4 mb-6">
        <h2 className="font-semibold mb-4">Step 1 — Degree & Semister</h2>
        <Row>
          <Field label="Degree" required>
            <select
              className="w-full border rounded-md p-2"
              value={degreeId}
              onChange={(e) => setDegreeId(e.target.value)}
            >
              <option value="">Select a degree…</option>
              {degrees.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  {d.title || d.name || d.slug || d._id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Semister (within selected degree)" required>
            <select
              className="w-full border rounded-md p-2"
              value={semesterId}
              onChange={(e) => setSemisterId(e.target.value)}
              disabled={!degreeId}
            >
              <option value="">Select semester…</option>
              {semesters.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.title || s.name || s.slug || s._id}
                </option>
              ))}
            </select>
          </Field>
        </Row>
        <div className="text-xs text-gray-500">
          (Degree & Semister are for your selection flow; they are not sent to
          the course API unless you later add fields in the Course model.)
        </div>
      </div>

      {/* Step 2: Category & SubCategory */}
      <div className="rounded-lg border p-4 mb-6">
        <h2 className="font-semibold mb-4">Step 2 — Category</h2>
        <Row>
          <Field label="Category" required>
            <select
              className="w-full border rounded-md p-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.category_name || c.name || c.title || c._id}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Sub Category"
            hint={
              subcatLoading
                ? "Loading subcategories…"
                : subcatMessage ||
                  "Optional here. If your backend requires subCategory, leaving this empty will cause a server validation error."
            }
          >
            <select
              className="w-full border rounded-md p-2"
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
              // keep enabled so the user can explicitly choose "(none)"
              disabled={!categoryId || subcatLoading}
            >
              <option value="">(none)</option>
              {subcats.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.subcategory_name || s.name || s.title || s._id}
                </option>
              ))}
            </select>
          </Field>
        </Row>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Basic */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Basic Info</h2>
          <Row>
            <Field label="Title" required>
              <input
                className="w-full border rounded-md p-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Intro to Algorithms"
              />
            </Field>

            <Field label="Slug (optional; auto from title)">
              <input
                className="w-full border rounded-md p-2"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </Field>
          </Row>

          <Field label="Description" required>
            <textarea
              className="w-full border rounded-md p-2"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Row>
            <Field label="Language">
              <input
                className="w-full border rounded-md p-2"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="English"
              />
            </Field>

            <Field label="Level">
              <select
                className="w-full border rounded-md p-2"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Thumbnail URL">
              <input
                className="w-full border rounded-md p-2"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
              />
            </Field>

            <Field label="Promo Video URL">
              <input
                className="w-full border rounded-md p-2"
                value={promoVideoUrl}
                onChange={(e) => setPromoVideoUrl(e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Duration (hours)" required>
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={durationInHours}
                onChange={(e) => setDurationInHours(e.target.value)}
                min={0}
              />
            </Field>

            <Field
              label="Price"
              hint={
                isFree
                  ? "Access Type is Free — price is locked to 0."
                  : "Set a non-zero price for paid courses."
              }
            >
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={isFree ? "0" : price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
                disabled={isFree}
              />
            </Field>
          </Row>
        </div>

        {/* Marketing */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Audience & Marketing</h2>
          <Row>
            <Field
              label="Requirements"
              hint="CSV or JSON array. Example: HTML,CSS,JavaScript"
            >
              <input
                className="w-full border rounded-md p-2"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </Field>

            <Field
              label="Learning Outcomes"
              hint="CSV or JSON array. Example: Recursion,Sorting,Graph Basics"
            >
              <input
                className="w-full border rounded-md p-2"
                value={learningOutcomes}
                onChange={(e) => setLearningOutcomes(e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Tags" hint="CSV or JSON">
              <input
                className="w-full border rounded-md p-2"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Field>

            <Field label="Keywords" hint="CSV or JSON">
              <input
                className="w-full border rounded-md p-2"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Meta Title">
              <input
                className="w-full border rounded-md p-2"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </Field>

            <Field label="Meta Description">
              <input
                className="w-full border rounded-md p-2"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </Field>
          </Row>
        </div>

        {/* People */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Authors & Instructor</h2>
          <Row>
            <Field label="Authors" hint="ObjectId list as CSV or JSON">
              <input
                className="w-full border rounded-md p-2"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder='e.g. ["661e...","661f..."] or 661e...,661f...'
              />
            </Field>

            <Field label="Instructor" required hint="Instructor ObjectId">
              <input
                className="w-full border rounded-md p-2"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g. 661e9a2abc..."
              />
            </Field>
          </Row>
        </div>

        {/* Modules & Topics */}
        <div className="rounded-lg border p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              Course Content (Modules & SubTopics)
            </h2>
            <Button type="button" onClick={addModule}>
              + Add Module
            </Button>
          </div>

          {modules.map((m, mIdx) => (
            <div key={mIdx} className="border rounded-md p-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Module #{mIdx + 1}</h3>
                <div className="space-x-2">
                  <Button type="button" onClick={() => addTopic(mIdx)}>
                    + Add Topic
                  </Button>
                  <Button
                    type="button"
                    className="text-red-600 border-red-300"
                    onClick={() => removeModule(mIdx)}
                  >
                    Remove Module
                  </Button>
                </div>
              </div>

              <Row>
                <Field label="Module Title">
                  <input
                    className="w-full border rounded-md p-2"
                    value={m.title}
                    onChange={(e) =>
                      updateModuleField(mIdx, "title", e.target.value)
                    }
                  />
                </Field>
                <Field label="Module Description">
                  <input
                    className="w-full border rounded-md p-2"
                    value={m.description}
                    onChange={(e) =>
                      updateModuleField(mIdx, "description", e.target.value)
                    }
                  />
                </Field>
              </Row>

              {(m.topics || []).map((t, tIdx) => (
                <div key={tIdx} className="mt-4 border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Topic #{tIdx + 1}</h4>
                    <Button
                      type="button"
                      className="text-red-600 border-red-300"
                      onClick={() => removeTopic(mIdx, tIdx)}
                    >
                      Remove Topic
                    </Button>
                  </div>

                  <Field label="Title">
                    <input
                      className="w-full border rounded-md p-2"
                      value={t.title}
                      onChange={(e) =>
                        updateTopicField(mIdx, tIdx, "title", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="Explanation (theory)">
                    <textarea
                      className="w-full border rounded-md p-2"
                      rows={3}
                      value={t.explanation}
                      onChange={(e) =>
                        updateTopicField(
                          mIdx,
                          tIdx,
                          "explanation",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Row>
                    <Field label="Code Snippet">
                      <textarea
                        className="w-full border rounded-md p-2"
                        rows={4}
                        value={t.code}
                        onChange={(e) =>
                          updateTopicField(mIdx, tIdx, "code", e.target.value)
                        }
                        placeholder={`// your code here`}
                      />
                    </Field>

                    <Field label="Code Explanation">
                      <textarea
                        className="w-full border rounded-md p-2"
                        rows={4}
                        value={t.codeExplanation}
                        onChange={(e) =>
                          updateTopicField(
                            mIdx,
                            tIdx,
                            "codeExplanation",
                            e.target.value
                          )
                        }
                        placeholder="Walk through the code line by line…"
                      />
                    </Field>
                  </Row>

                  <Row>
                    <Field label="Code Language">
                      <select
                        className="w-full border rounded-md p-2"
                        value={t.codeLanguage || "plaintext"}
                        onChange={(e) =>
                          updateTopicField(
                            mIdx,
                            tIdx,
                            "codeLanguage",
                            e.target.value
                          )
                        }
                      >
                        <option value="plaintext">plaintext</option>
                        <option value="javascript">javascript</option>
                        <option value="typescript">typescript</option>
                        <option value="python">python</option>
                        <option value="java">java</option>
                        <option value="c">c</option>
                        <option value="cpp">cpp</option>
                        <option value="csharp">csharp</option>
                        <option value="go">go</option>
                        <option value="rust">rust</option>
                        <option value="ruby">ruby</option>
                        <option value="php">php</option>
                        <option value="swift">swift</option>
                        <option value="kotlin">kotlin</option>
                        <option value="sql">sql</option>
                        <option value="bash">bash</option>
                      </select>
                    </Field>

                    <Field label="Duration (mins)">
                      <input
                        type="number"
                        className="w-full border rounded-md p-2"
                        value={t.duration}
                        onChange={(e) =>
                          updateTopicField(
                            mIdx,
                            tIdx,
                            "duration",
                            e.target.value
                          )
                        }
                        min={0}
                      />
                    </Field>
                  </Row>

                  <Row>
                    <Field label="Video URL">
                      <input
                        className="w-full border rounded-md p-2"
                        value={t.videoUrl}
                        onChange={(e) =>
                          updateTopicField(
                            mIdx,
                            tIdx,
                            "videoUrl",
                            e.target.value
                          )
                        }
                      />
                    </Field>

                    <Field label="PDF URL">
                      <input
                        className="w-full border rounded-md p-2"
                        value={t.pdfUrl}
                        onChange={(e) =>
                          updateTopicField(mIdx, tIdx, "pdfUrl", e.target.value)
                        }
                      />
                    </Field>
                  </Row>

                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!t.isFreePreview}
                        onChange={(e) =>
                          updateTopicField(
                            mIdx,
                            tIdx,
                            "isFreePreview",
                            e.target.checked
                          )
                        }
                      />
                      <span>Mark as free preview</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Learning Resources */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Learning Resources</h2>
          <Row>
            <Field label="Videos" hint="CSV or JSON array of URLs">
              <input
                className="w-full border rounded-md p-2"
                value={videos}
                onChange={(e) => setVideos(e.target.value)}
              />
            </Field>
            <Field label="PDFs" hint="CSV or JSON array of URLs">
              <input
                className="w-full border rounded-md p-2"
                value={pdfs}
                onChange={(e) => setPdfs(e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Assignments" hint="CSV or JSON array of IDs/links">
              <input
                className="w-full border rounded-md p-2"
                value={assignments}
                onChange={(e) => setAssignments(e.target.value)}
              />
            </Field>
            <Field label="External Links" hint="CSV or JSON array of URLs">
              <input
                className="w-full border rounded-md p-2"
                value={externalLinks}
                onChange={(e) => setExternalLinks(e.target.value)}
              />
            </Field>
          </Row>
        </div>

        {/* Access */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Access</h2>
          <Row>
            <Field label="Access Type">
              <select
                className="w-full border rounded-md p-2"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value)}
              >
                <option>Free</option>
                <option>Paid</option>
                <option>Subscription</option>
                <option>Lifetime</option>
              </select>
            </Field>

            <Field label="Max Students">
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                min={0}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Enrollment Deadline (ISO date)">
              <input
                type="datetime-local"
                className="w-full border rounded-md p-2"
                value={enrollmentDeadline}
                onChange={(e) => setEnrollmentDeadline(e.target.value)}
              />
            </Field>

            <Field label="Completion Criteria">
              <select
                className="w-full border rounded-md p-2"
                value={completionCriteria}
                onChange={(e) => setCompletionCriteria(e.target.value)}
              >
                <option>All Topics</option>
                <option>Final Exam</option>
                <option>Manual Approval</option>
              </select>
            </Field>
          </Row>
        </div>

        {/* Certificate */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Certificate</h2>
          <Row>
            <Field label="Issue Certificate?">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!issueCertificate}
                  onChange={(e) => setIssueCertificate(e.target.checked)}
                />
                <span>Enable</span>
              </label>
            </Field>

            <Field label="Certificate Template URL">
              <input
                className="w-full border rounded-md p-2"
                value={certificateTemplateUrl}
                onChange={(e) => setCertificateTemplateUrl(e.target.value)}
              />
            </Field>
          </Row>
        </div>

        {/* Flags */}
        <div className="rounded-lg border p-4 mb-6">
          <h2 className="font-semibold mb-4">Flags</h2>
          <Row>
            <Field label="Published">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                <span>Published</span>
              </label>
            </Field>

            <Field label="Archived">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                />
                <span>Archived</span>
              </label>
            </Field>
          </Row>

          <Row>
            <Field label="Featured">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <span>Featured</span>
              </label>
            </Field>

            <Field label="Order (number)">
              <input
                type="number"
                className="w-full border rounded-md p-2"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </Field>
          </Row>
        </div>

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
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create Course"}
          </PrimaryButton>
          <Button type="button" onClick={reset}>
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
