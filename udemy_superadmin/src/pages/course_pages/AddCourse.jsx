// src/pages/courses/AddCourse.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import globalBackendRoute from "../../config/Config";

// ====== API ROUTES (match your backend) ======
const ROUTES = {
  CREATE_COURSE: `${globalBackendRoute}/api/create-course`,
  GET_ALL_CATEGORIES: `${globalBackendRoute}/api/all-categories`,
  GET_SUBCATEGORIES_BY_CATEGORY: (catId) =>
    `${globalBackendRoute}/api/get-subcategories-by-category?category=${catId}`,
  GET_INSTRUCTORS: `${globalBackendRoute}/api/get-instructors`,
  GET_AUTHORS: `${globalBackendRoute}/api/get-authors`,
};

const defaultCourse = {
  title: "",
  slug: "",
  description: "",
  language: "English",
  level: "Beginner",
  thumbnail: "",
  promoVideoUrl: "",
  durationInHours: "",
  price: 0,
  category: "",
  subCategory: "",
  requirements: "",
  learningOutcomes: "",
  tags: "",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  authors: [],
  instructor: "",
  modules: [],
  totalModules: 0,
  totalTopics: 0,
  totalTests: 0,
  learningResources: {
    videos: "",
    pdfs: "",
    assignments: "",
    externalLinks: "",
  },
  exams: "",
  accessType: "Paid",
  maxStudents: "",
  enrollmentDeadline: "",
  completionCriteria: "All Topics",
  issueCertificate: true,
  certificateTemplateUrl: "",
  published: false,
  isArchived: false,
  isFeatured: false,
  order: 0,
  version: "1.0",
};

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const AddCourse = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultCourse);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // NEW: instructors & authors lists
  const [instructors, setInstructors] = useState([]);
  const [authors, setAuthors] = useState([]);

  const token = localStorage.getItem("token");
  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

  // ====== load categories once ======
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await axios.get(ROUTES.GET_ALL_CATEGORIES, {
          headers: authHeader,
          signal: controller.signal,
        });
        // Expect: [{ _id, category_name }]
        setCategories(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Failed to fetch categories", err);
        setStatusMsg("Failed to load categories. Is the backend running?");
      } finally {
        setLoadingCats(false);
      }
    })();

    // load users (instructors + authors)
    (async () => {
      try {
        const [insRes, authRes] = await Promise.all([
          axios.get(ROUTES.GET_INSTRUCTORS, { headers: authHeader }),
          axios.get(ROUTES.GET_AUTHORS, { headers: authHeader }),
        ]);
        setInstructors(Array.isArray(insRes.data) ? insRes.data : []);
        setAuthors(Array.isArray(authRes.data) ? authRes.data : []);
      } catch (err) {
        console.error("Failed to load users", err);
        setStatusMsg("Failed to load users. Is the backend running?");
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== load subcategories whenever category changes ======
  useEffect(() => {
    if (!form.category) {
      setSubcategories([]);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingSubs(true);
        const res = await axios.get(
          ROUTES.GET_SUBCATEGORIES_BY_CATEGORY(form.category),
          { headers: authHeader, signal: controller.signal }
        );
        // Expect: [{ _id, subcategory_name, category }]
        const list = Array.isArray(res.data) ? res.data : [];
        setSubcategories(list);
        // reset subCategory if not in list
        if (form.subCategory && !list.some((s) => s._id === form.subCategory)) {
          setForm((p) => ({ ...p, subCategory: "" }));
        }
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Failed to fetch subcategories", err);
        setStatusMsg("Failed to load subcategories. Is the backend running?");
        setSubcategories([]);
      } finally {
        setLoadingSubs(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  // ====== Handlers ======
  const handleChange = (e) => {
    const { name, value, type, checked, multiple, selectedOptions } = e.target;

    // multi-select authors
    if (name === "authors" && multiple) {
      const vals = Array.from(selectedOptions).map((o) => o.value);
      setForm((p) => ({ ...p, authors: vals }));
      return;
    }

    if (name.startsWith("lr.")) {
      const key = name.split("lr.")[1];
      setForm((p) => ({
        ...p,
        learningResources: { ...p.learningResources, [key]: value },
      }));
      return;
    }

    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
      return;
    }

    if (["durationInHours", "price", "maxStudents", "order"].includes(name)) {
      const numVal = value === "" ? "" : Number(value);
      setForm((p) => ({ ...p, [name]: Number.isNaN(numVal) ? "" : numVal }));
      return;
    }

    if (name === "title") {
      setForm((p) => {
        const next = value;
        const derived = slugify(next);
        const keepUserSlug = p.slug && p.slug !== slugify(p.title);
        return { ...p, title: next, slug: keepUserSlug ? p.slug : derived };
      });
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleModuleAdd = () => {
    setForm((p) => ({
      ...p,
      modules: [...p.modules, { title: "", description: "", topics: [] }],
    }));
  };

  const handleModuleChange = (idx, field, value) => {
    setForm((p) => {
      const modules = [...p.modules];
      modules[idx] = { ...modules[idx], [field]: value };
      return { ...p, modules };
    });
  };

  const handleModuleRemove = (idx) => {
    setForm((p) => {
      const modules = p.modules.filter((_, i) => i !== idx);
      return { ...p, modules };
    });
  };

  const handleTopicAdd = (mIdx) => {
    setForm((p) => {
      const modules = [...p.modules];
      const topics = modules[mIdx].topics ? [...modules[mIdx].topics] : [];
      topics.push({
        title: "",
        videoUrl: "",
        pdfUrl: "",
        duration: "",
        isFreePreview: false,
      });
      modules[mIdx] = { ...modules[mIdx], topics };
      return { ...p, modules };
    });
  };

  const handleTopicChange = (mIdx, tIdx, field, value) => {
    setForm((p) => {
      const modules = [...p.modules];
      const topics = [...modules[mIdx].topics];
      topics[tIdx] = {
        ...topics[tIdx],
        [field]:
          field === "duration"
            ? value === ""
              ? ""
              : Number.isNaN(Number(value))
              ? ""
              : Number(value)
            : field === "isFreePreview"
            ? !!value
            : value,
      };
      modules[mIdx] = { ...modules[mIdx], topics };
      return { ...p, modules };
    });
  };

  const handleTopicRemove = (mIdx, tIdx) => {
    setForm((p) => {
      const modules = [...p.modules];
      modules[mIdx].topics = modules[mIdx].topics.filter((_, i) => i !== tIdx);
      return { ...p, modules };
    });
  };

  const computeTotals = (modules) => {
    const totalModules = modules.length;
    let totalTopics = 0;
    modules.forEach((m) => (totalTopics += (m.topics || []).length));
    return { totalModules, totalTopics };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    setSaving(true);

    try {
      const { totalModules, totalTopics } = computeTotals(form.modules);

      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        description: form.description,
        language: form.language,
        level: form.level,
        thumbnail: form.thumbnail || undefined,
        promoVideoUrl: form.promoVideoUrl || undefined,
        durationInHours: Number(form.durationInHours || 0),
        price: Number(form.price || 0),

        category: form.category,
        subCategory: form.subCategory,

        requirements: splitCsv(form.requirements),
        learningOutcomes: splitCsv(form.learningOutcomes),
        tags: splitCsv(form.tags),
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        keywords: splitCsv(form.keywords),

        authors: form.authors, // already array of userIds
        instructor: form.instructor, // single userId

        modules: form.modules.map((m) => ({
          title: m.title,
          description: m.description,
          topics: (m.topics || []).map((t) => ({
            title: t.title,
            videoUrl: t.videoUrl || undefined,
            pdfUrl: t.pdfUrl || undefined,
            duration: Number(t.duration || 0),
            isFreePreview: !!t.isFreePreview,
          })),
        })),
        totalModules,
        totalTopics,
        totalTests: Number(form.totalTests || 0),

        learningResources: {
          videos: splitCsv(form.learningResources.videos),
          pdfs: splitCsv(form.learningResources.pdfs),
          assignments: splitCsv(form.learningResources.assignments),
          externalLinks: splitCsv(form.learningResources.externalLinks),
        },

        exams: splitCsv(form.exams),

        accessType: form.accessType,
        maxStudents:
          form.maxStudents === "" ? undefined : Number(form.maxStudents),
        enrollmentDeadline: form.enrollmentDeadline
          ? new Date(form.enrollmentDeadline)
          : undefined,
        completionCriteria: form.completionCriteria,

        issueCertificate: !!form.issueCertificate,
        certificateTemplateUrl: form.certificateTemplateUrl || undefined,

        published: !!form.published,
        isArchived: !!form.isArchived,
        isFeatured: !!form.isFeatured,
        order: Number(form.order || 0),
        version: form.version || "1.0",
      };

      await axios.post(ROUTES.CREATE_COURSE, payload, {
        headers: { "Content-Type": "application/json", ...(authHeader || {}) },
      });

      setStatusMsg("✅ Course created successfully!");
      setForm(defaultCourse);
      setSubcategories([]);
      // navigate("/courses");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.details ||
        err?.response?.data?.error ||
        err.message ||
        "Course creation failed";
      setStatusMsg(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  function splitCsv(v) {
    if (!v || typeof v !== "string") return [];
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const totals = useMemo(() => computeTotals(form.modules), [form.modules]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-2xl font-semibold mb-6">Create New Course</h1>

      {statusMsg && (
        <div className="mb-4 rounded-lg border p-3 text-sm">{statusMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Row: Title + Slug */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., Mastering Java"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug *</label>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="mastering-java"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm mb-1">Description *</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            required
          />
        </div>

        {/* Row: Language + Level */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Language</label>
            <input
              name="language"
              value={form.language}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="English"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Level</label>
            <select
              name="level"
              value={form.level}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>

        {/* Row: Thumbnail + Promo Video */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Thumbnail (URL)</label>
            <input
              name="thumbnail"
              value={form.thumbnail}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="https://…/image.jpg"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Promo Video URL</label>
            <input
              name="promoVideoUrl"
              value={form.promoVideoUrl}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="https://…"
            />
          </div>
        </div>

        {/* Row: Duration + Price */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Duration (hours) *</label>
            <input
              type="number"
              name="durationInHours"
              value={form.durationInHours}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="12"
              min={0}
              step="0.1"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Price</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        {/* Row: Category + Subcategory */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Category *</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">
                {loadingCats ? "Loading…" : "Select category"}
              </option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Subcategory *</label>
            <select
              name="subCategory"
              value={form.subCategory}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
              disabled={!form.category}
            >
              <option value="">
                {loadingSubs
                  ? "Loading…"
                  : form.category && subcategories.length
                  ? "Select subcategory"
                  : !form.category
                  ? "Select a category first"
                  : "No subcategories"}
              </option>
              {subcategories.map((sc) => (
                <option key={sc._id} value={sc._id}>
                  {sc.subcategory_name || sc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Authors & Instructor (DROPDOWNS) */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Instructor (single) */}
          <div>
            <label className="block text-sm mb-1">Instructor *</label>
            <select
              name="instructor"
              value={form.instructor}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select instructor</option>
              {instructors.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} {u.email ? `(${u.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Authors (multi) */}
          <div>
            <label className="block text-sm mb-1">
              Authors (hold Ctrl/Cmd to select multiple)
            </label>
            <select
              multiple
              name="authors"
              value={form.authors}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 h-32"
            >
              {authors.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} {u.email ? `(${u.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Marketing meta */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">
              Requirements (comma-separated)
            </label>
            <input
              name="requirements"
              value={form.requirements}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Java basics, VS Code"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Learning Outcomes (comma-separated)
            </label>
            <input
              name="learningOutcomes"
              value={form.learningOutcomes}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="OOP, Collections, Streams"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Tags (comma-separated)</label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="java, backend, dsa"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Keywords (comma-separated)
            </label>
            <input
              name="keywords"
              value={form.keywords}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="spring, microservices, maven"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Meta Title</label>
            <input
              name="metaTitle"
              value={form.metaTitle}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Mastering Java - Complete Guide"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Meta Description</label>
          <textarea
            name="metaDescription"
            value={form.metaDescription}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
            placeholder="A comprehensive course covering Java from basics to advanced topics."
          />
        </div>

        {/* Learning Resources */}
        <div>
          <h2 className="text-lg font-medium mb-2">Learning Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              name="lr.videos"
              value={form.learningResources.videos}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Video URLs (comma-separated)"
            />
            <input
              name="lr.pdfs"
              value={form.learningResources.pdfs}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="PDF URLs (comma-separated)"
            />
            <input
              name="lr.assignments"
              value={form.learningResources.assignments}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Assignment names (comma-separated)"
            />
            <input
              name="lr.externalLinks"
              value={form.learningResources.externalLinks}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="External links (comma-separated)"
            />
          </div>
        </div>

        {/* Modules & Topics */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Modules & Topics</h2>
            <button
              type="button"
              onClick={handleModuleAdd}
              className="px-3 py-1 rounded-lg border hover:bg-gray-50"
            >
              + Add Module
            </button>
          </div>

          {form.modules.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No modules added yet.</p>
          )}

          <div className="space-y-6 mt-4">
            {form.modules.map((m, mIdx) => (
              <div key={mIdx} className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Module {mIdx + 1}</h3>
                  <button
                    type="button"
                    onClick={() => handleModuleRemove(mIdx)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <input
                    value={m.title}
                    onChange={(e) =>
                      handleModuleChange(mIdx, "title", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Module title"
                  />
                  <input
                    value={m.description}
                    onChange={(e) =>
                      handleModuleChange(mIdx, "description", e.target.value)
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Module description"
                  />
                </div>

                {/* Topics */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Topics</h4>
                    <button
                      type="button"
                      onClick={() => handleTopicAdd(mIdx)}
                      className="px-3 py-1 rounded-lg border hover:bg-gray-50 text-sm"
                    >
                      + Add Topic
                    </button>
                  </div>

                  {(m.topics || []).length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">No topics yet.</p>
                  )}

                  <div className="space-y-4 mt-3">
                    {(m.topics || []).map((t, tIdx) => (
                      <div key={tIdx} className="border rounded-lg p-3">
                        <div className="grid md:grid-cols-2 gap-4">
                          <input
                            value={t.title}
                            onChange={(e) =>
                              handleTopicChange(
                                mIdx,
                                tIdx,
                                "title",
                                e.target.value
                              )
                            }
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Topic title"
                          />
                          <input
                            value={t.videoUrl}
                            onChange={(e) =>
                              handleTopicChange(
                                mIdx,
                                tIdx,
                                "videoUrl",
                                e.target.value
                              )
                            }
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Video URL"
                          />
                          <input
                            value={t.pdfUrl}
                            onChange={(e) =>
                              handleTopicChange(
                                mIdx,
                                tIdx,
                                "pdfUrl",
                                e.target.value
                              )
                            }
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="PDF URL"
                          />
                          <input
                            type="number"
                            value={t.duration}
                            onChange={(e) =>
                              handleTopicChange(
                                mIdx,
                                tIdx,
                                "duration",
                                e.target.value
                              )
                            }
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Duration (minutes)"
                            min={0}
                          />
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!t.isFreePreview}
                              onChange={(e) =>
                                handleTopicChange(
                                  mIdx,
                                  tIdx,
                                  "isFreePreview",
                                  e.target.checked
                                )
                              }
                            />
                            Free Preview
                          </label>
                        </div>

                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => handleTopicRemove(mIdx, tIdx)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove Topic
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals preview */}
          <div className="text-sm text-gray-600 mt-2">
            Modules: <b>{totals.totalModules}</b> • Topics:{" "}
            <b>{totals.totalTopics}</b>
          </div>
        </div>

        {/* Exams & Access */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">
              Exams (IDs, comma-separated)
            </label>
            <input
              name="exams"
              value={form.exams}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="66a..., 66b..."
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Access Type</label>
            <select
              name="accessType"
              value={form.accessType}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option>Free</option>
              <option>Paid</option>
              <option>Subscription</option>
              <option>Lifetime</option>
            </select>
          </div>
        </div>

        {/* Enrollment & Completion */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Max Students</label>
            <input
              type="number"
              name="maxStudents"
              value={form.maxStudents}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g., 100"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Enrollment Deadline</label>
            <input
              type="date"
              name="enrollmentDeadline"
              value={form.enrollmentDeadline}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Completion Criteria</label>
            <select
              name="completionCriteria"
              value={form.completionCriteria}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option>All Topics</option>
              <option>Final Exam</option>
              <option>Manual Approval</option>
            </select>
          </div>
        </div>

        {/* Certificate */}
        <div className="grid md:grid-cols-2 gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="issueCertificate"
              checked={!!form.issueCertificate}
              onChange={handleChange}
            />
            Issue Certificate
          </label>

          <input
            name="certificateTemplateUrl"
            value={form.certificateTemplateUrl}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Certificate template URL"
          />
        </div>

        {/* Flags */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="published"
                checked={!!form.published}
                onChange={handleChange}
              />
              Published
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="isArchived"
                checked={!!form.isArchived}
                onChange={handleChange}
              />
              Archived
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="isFeatured"
                checked={!!form.isFeatured}
                onChange={handleChange}
              />
              Featured
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="order"
              value={form.order}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Order (for sorting)"
            />
            <input
              name="version"
              value={form.version}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="1.0"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create Course"}
          </button>
          <span className="text-sm text-gray-500">
            {totals.totalModules} modules • {totals.totalTopics} topics
          </span>
        </div>
      </form>
    </div>
  );
};

export default AddCourse;
