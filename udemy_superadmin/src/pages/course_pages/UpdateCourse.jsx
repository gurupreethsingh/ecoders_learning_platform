import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "../../config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
} from "react-icons/fi";

const API = globalBackendRoute;

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const ACCESS = ["Free", "Paid"];

const cleanCsv = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const UpdateCourse = () => {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    language: "English",
    level: "Beginner",
    durationInHours: "",
    price: "",
    accessType: "Paid",
    metaTitle: "",
    metaDescription: "",
    keywordsCsv: "",
    tagsCsv: "",
    published: false,
    isArchived: false,
    isFeatured: false,
    degree: "",
    semister: "",
    category: "",
    subCategory: "",
    instructor: "",
  });

  // lookups
  const [degrees, setDegrees] = useState([]);
  const [semisters, setSemisters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [instructors, setInstructors] = useState([]);

  // load course
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        const [courseRes, deg, sem, cat, sub, inst] = await Promise.allSettled([
          fetch(`${API}/api/get-course-by-id/${id}`).then((r) => r.json()),
          fetch(`${API}/api/list-degrees?page=1&limit=500`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/semisters?page=1&limit=2000`).then((r) => r.json()),
          fetch(`${API}/api/all-categories`).then((r) => r.json()),
          fetch(`${API}/api/all-subcategories`).then((r) => r.json()),
          // ✅ FIXED
          fetch(`${API}/api/get-instructors`).then((r) => r.json()),
        ]);

        if (!active) return;

        if (courseRes.status !== "fulfilled") {
          throw new Error("Failed to load course.");
        }
        const c = courseRes.value;
        if (!c || c.message) throw new Error(c.message || "Course not found.");

        setForm({
          title: c.title || "",
          slug: c.slug || "",
          description: c.description || "",
          language: c.language || "English",
          level: c.level || "Beginner",
          durationInHours:
            typeof c.durationInHours === "number" ? c.durationInHours : "",
          price: typeof c.price === "number" ? c.price : "",
          accessType: c.accessType || "Paid",
          metaTitle: c.metaTitle || "",
          metaDescription: c.metaDescription || "",
          keywordsCsv: Array.isArray(c.keywords) ? c.keywords.join(", ") : "",
          tagsCsv: Array.isArray(c.tags) ? c.tags.join(", ") : "",
          published: Boolean(c.published),
          isArchived: Boolean(c.isArchived),
          isFeatured: Boolean(c.isFeatured),
          degree: c.degree || "",
          semister: c.semister || "",
          category: c.category || "",
          subCategory: c.subCategory || "",
          instructor: c.instructor || "",
        });

        if (deg.status === "fulfilled") {
          setDegrees(deg.value?.data || deg.value || []);
        }
        if (sem.status === "fulfilled") {
          setSemisters(sem.value?.data || sem.value || []);
        }
        if (cat.status === "fulfilled") {
          setCategories(cat.value?.data || cat.value || []);
        }
        if (sub.status === "fulfilled") {
          setSubcategories(sub.value?.data || sub.value || []);
        }
        if (inst.status === "fulfilled") {
          const list =
            inst.value?.data?.data || inst.value?.data || inst.value || [];
          setInstructors(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [API, id]);

  const canSave = useMemo(() => form.title.trim() && !saving, [form, saving]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMsg({ type: "", text: "" });
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!form.title.trim()) {
      setMsg({ type: "error", text: "Title is required." });
      return;
    }

    // Build payload without empty fields
    const payload = {
      title: form.title.trim(),
      description: form.description,
      language: form.language,
      level: form.level,
      accessType: form.accessType,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      tags: cleanCsv(form.tagsCsv),
      keywords: cleanCsv(form.keywordsCsv),
      published: Boolean(form.published),
      isArchived: Boolean(form.isArchived),
      isFeatured: Boolean(form.isFeatured),
      degree: form.degree || undefined,
      semister: form.semister || undefined,
      category: form.category || undefined,
      subCategory: form.subCategory || undefined,
      instructor: form.instructor || undefined,
    };

    if (form.slug && form.slug.trim()) payload.slug = form.slug.trim();
    if (form.durationInHours !== "")
      payload.durationInHours = Number(form.durationInHours);
    if (form.price !== "") payload.price = Number(form.price);

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/update-course/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) throw new Error(body?.message || "Failed to update course.");

      setMsg({ type: "success", text: "Course updated successfully." });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setSaving(false);
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
            <Link to="/all-courses" className="text-gray-900 underline">
              ← Back to All Courses
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Update Course
            </h1>
            <p className="text-gray-600 mt-1">
              Edit and save changes to this course.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/single-course/${encodeURIComponent(
                form.slug || "course"
              )}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Back to Course"
            >
              <FiRefreshCcw className="h-4 w-4" />
              View Course
            </Link>
          </div>
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
            <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Title *
                </label>
                <input
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., SQL for Analysts"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Slug
                </label>
                <input
                  name="slug"
                  type="text"
                  value={form.slug}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="auto-generated from title if blank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Level
                </label>
                <select
                  name="level"
                  value={form.level}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Language
                </label>
                <input
                  name="language"
                  type="text"
                  value={form.language}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., English"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Duration (hours)
                </label>
                <input
                  name="durationInHours"
                  type="number"
                  step="1"
                  value={form.durationInHours}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Price (0 for Free)
                </label>
                <input
                  name="price"
                  type="number"
                  step="1"
                  value={form.price}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 199"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-800">
                Description
              </label>
              <textarea
                name="description"
                rows={4}
                value={form.description}
                onChange={onChange}
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                placeholder="Short overview of the course…"
              />
            </div>
          </div>

          {/* Associations */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Associations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Degree
                </label>
                <select
                  name="degree"
                  value={form.degree || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {degrees.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.name || "Untitled Degree"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Semister
                </label>
                <select
                  name="semister"
                  value={form.semister || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {semisters.map((s) => {
                    const label =
                      s.title ||
                      s.semister_name ||
                      (s.semNumber ? `Semister ${s.semNumber}` : s.slug) ||
                      "Semister";
                    return (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Category
                </label>
                <select
                  name="category"
                  value={form.category || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.category_name || c.name || "Uncategorized"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Subcategory
                </label>
                <select
                  name="subCategory"
                  value={form.subCategory || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {subcategories.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.subcategory_name || s.name || "—"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800">
                  Instructor
                </label>
                <select
                  name="instructor"
                  value={form.instructor || ""}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">—</option>
                  {instructors.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.name || u.fullName || u.email || "Instructor"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SEO & Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Meta Title
                  </label>
                  <input
                    name="metaTitle"
                    type="text"
                    value={form.metaTitle}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    rows={3}
                    value={form.metaDescription}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Keywords (comma separated)
                  </label>
                  <input
                    name="keywordsCsv"
                    type="text"
                    value={form.keywordsCsv}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Tags (comma separated)
                  </label>
                  <input
                    name="tagsCsv"
                    type="text"
                    value={form.tagsCsv}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Access Type
                  </label>
                  <select
                    name="accessType"
                    value={form.accessType}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                  >
                    {ACCESS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Visibility</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    name="published"
                    checked={form.published}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={form.isFeatured}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    name="isArchived"
                    checked={form.isArchived}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Archived
                </label>
              </div>
            </div>
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
              <FiSave className="h-4 w-4" />{" "}
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <Link
              to={`/single-course/${encodeURIComponent(
                form.slug || "course"
              )}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Cancel and view course"
            >
              <FiX className="h-4 w-4" /> Cancel
            </Link>

            <Link
              to="/all-courses"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Back to All Courses
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateCourse;
