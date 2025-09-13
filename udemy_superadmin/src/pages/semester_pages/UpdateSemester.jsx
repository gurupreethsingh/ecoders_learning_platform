import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
  FiHash,
  FiGrid,
} from "react-icons/fi";

const API = globalBackendRoute;

const formatDateInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  // yyyy-mm-dd for <input type="date">
  return dt.toISOString().slice(0, 10);
};

const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const getId = (val) => {
  if (!val) return null;
  if (typeof val === "object") return val._id || val.id || null;
  return val;
};
// normalize {data:[...]} | {items:[...]} | array
const extractArray = (payload) => {
  const d = payload?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const Updatesemester = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [degrees, setDegrees] = useState([]);
  const [degLoading, setDegLoading] = useState(false);

  const [form, setForm] = useState({
    degree: "",
    semNumber: "",
    semester_name: "",
    semester_code: "",
    slug: "",
    description: "",
    academicYear: "",
    startDate: "",
    endDate: "",
    totalCredits: "",
    totalCoursesPlanned: "",
    isActive: true,
    metadataText: "",
  });

  // ---- Associations Preview state ----
  const [assocLoading, setAssocLoading] = useState(false);
  const [degreeDetail, setDegreeDetail] = useState(null);
  const [categories, setCategories] = useState([]); // {id,name}
  const [subcategories, setSubcategories] = useState([]); // {id,name}
  const [courses, setCourses] = useState([]); // {id,title,slug}
  const [exams, setExams] = useState([]); // {id,examName,examCode,isPublished,...}

  const semId = id;

  // Load semester + degrees
  useEffect(() => {
    let active = true;

    (async () => {
      if (!id) {
        setErr("No semester id provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr("");

        // fetch semester
        const sRes = await fetch(`${API}/api/semesters/${id}`);
        const sJson = await sRes.json();
        if (!sRes.ok)
          throw new Error(sJson?.message || "Failed to fetch semester.");

        if (!active) return;

        setForm({
          degree: sJson.degree || "",
          semNumber: sJson.semNumber ?? "",
          semester_name: sJson.semester_name || "",
          semester_code: sJson.semester_code || "",
          slug: sJson.slug || "",
          description: sJson.description || "",
          academicYear: sJson.academicYear || "",
          startDate: formatDateInput(sJson.startDate),
          endDate: formatDateInput(sJson.endDate),
          totalCredits: sJson.totalCredits ?? "",
          totalCoursesPlanned: sJson.totalCoursesPlanned ?? "",
          isActive: Boolean(sJson.isActive),
          metadataText: sJson?.metadata
            ? JSON.stringify(sJson.metadata, null, 2)
            : "",
        });

        // fetch degrees list (for moving between degrees)
        setDegLoading(true);
        const params = new URLSearchParams({
          page: "1",
          limit: "1000",
          sortBy: "name",
          sortDir: "asc",
        });
        const dRes = await fetch(
          `${API}/api/list-degrees?` + params.toString()
        );
        const dJson = await dRes.json();
        if (dRes.ok) {
          setDegrees(Array.isArray(dJson?.data) ? dJson.data : []);
        } else {
          // Non-fatal for this page; user can still update other fields
          console.warn(
            "Failed to load degrees list:",
            dJson?.message || dRes.statusText
          );
        }
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) {
          setLoading(false);
          setDegLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [API, id]);

  // ---- Associations Preview loader (runs after semester loaded; re-runs if degree or semNumber change) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!semId) return;
      setAssocLoading(true);
      try {
        // Degree details (best-effort)
        let degDetail = null;
        const degId = form.degree && getId(form.degree);
        if (degId) {
          try {
            // Your DegreeRoutes has /get-degree-by-id/slug/:id
            const r = await fetch(
              `${API}/api/get-degree-by-id/slug/${encodeURIComponent(degId)}`
            );
            if (r.ok) {
              const j = await r.json();
              degDetail = j?.data || j;
            }
          } catch {}
          if (!degDetail) {
            // fallback: find from loaded degrees
            degDetail = degrees.find((d) => (d._id || d.id) === degId) || null;
          }
        }

        // Lookups for category/subcategory names
        const [catRaw, subcatRaw] = await Promise.all([
          fetch(`${API}/api/all-categories`).then((r) =>
            r.json().catch(() => [])
          ),
          fetch(`${API}/api/all-subcategories`).then((r) =>
            r.json().catch(() => [])
          ),
        ]);
        const catsArr = extractArray(catRaw);
        const subcatsArr = extractArray(subcatRaw);
        const catMap = {};
        const subcatMap = {};
        catsArr.forEach((c) => {
          const id = c?._id || c?.id;
          const name = c?.name || c?.category_name || c?.title;
          if (id && name) catMap[id] = name;
        });
        subcatsArr.forEach((s) => {
          const id = s?._id || s?.id;
          const name = s?.name || s?.subCategory_name || s?.title;
          if (id && name) subcatMap[id] = name;
        });

        // Courses: pull many and filter by this semester (supporting multiple schema variants)
        const courseFetch = await fetch(
          `${API}/api/list-courses?page=1&limit=5000&sortBy=createdAt&order=desc`
        );
        const courseJson = await courseFetch.json();
        const allCourses = extractArray(courseJson);
        const belongsToSem = (c) => {
          const cid = getId(c?.semester) || getId(c?.semester);
          if (cid && cid === semId) return true;
          if (Array.isArray(c?.semesters) && c.semesters.length) {
            if (c.semesters.some((s) => getId(s) === semId)) return true;
          }
          if (c?.semesterId && getId(c.semesterId) === semId) return true;
          if (c?.semesterId && getId(c.semesterId) === semId) return true;
          // sometimes only semNumber is stored:
          if (
            form.semNumber != null &&
            c?.semNumber != null &&
            Number(c.semNumber) === Number(form.semNumber)
          )
            return true;
          return false;
        };
        const courseFiltered = allCourses.filter(belongsToSem);
        const normCourses = courseFiltered.map((c) => ({
          id: c?._id || c?.id,
          title: c?.title || c?.name || c?.code || "Untitled Course",
          slug:
            c?.slug ||
            (c?.title ? c.title.toLowerCase().replace(/\s+/g, "-") : "course"),
          categoryId:
            getId(c?.category) ||
            getId(c?.categoryId) ||
            (Array.isArray(c?.categories) ? getId(c.categories[0]) : null),
          subCategoryId:
            getId(c?.subCategory) ||
            getId(c?.subCategoryId) ||
            (Array.isArray(c?.subcategories)
              ? getId(c.subcategories[0])
              : null),
        }));

        // Categories/Subcategories derived from courses
        const catSet = new Map();
        const subcatSet = new Map();
        normCourses.forEach((c) => {
          if (c.categoryId)
            catSet.set(c.categoryId, catMap[c.categoryId] || "Category");
          if (c.subCategoryId)
            subcatSet.set(
              c.subCategoryId,
              subcatMap[c.subCategoryId] || "SubCategory"
            );
        });

        // Exams: pull many and filter by semester (or degree fallback)
        const examFetch = await fetch(
          `${API}/api/list-exams?page=1&limit=5000`
        );
        const examJson = await examFetch.json();
        const allExams = extractArray(examJson);
        const belongsToExam = (e) => {
          const eSem =
            getId(e?.semester) ||
            getId(e?.semester) ||
            getId(e?.semesterId) ||
            getId(e?.semesterId);
          const eDeg =
            getId(e?.degree) || getId(e?.degreeId) || getId(e?.program) || null;
          if (eSem && eSem === semId) return true;
          if (
            e?.semNumber != null &&
            form?.semNumber != null &&
            Number(e.semNumber) === Number(form.semNumber)
          )
            return true;
          if (degId && eDeg && eDeg === degId) return true;
          return false;
        };
        const examFiltered = allExams.filter(belongsToExam);
        const normExams = examFiltered.map((e) => ({
          id: e?._id || e?.id,
          examName:
            e?.examName ||
            e?.title ||
            e?.name ||
            e?.exam_code ||
            e?.examCode ||
            "Exam",
          examCode: e?.examCode || e?.exam_code || null,
          isPublished: !!e?.isPublished,
          totalMarks: e?.totalMarks ?? null,
          passPercentage: e?.passPercentage ?? null,
        }));

        if (!alive) return;

        setDegreeDetail(degDetail || null);
        setCategories(
          Array.from(catSet.entries()).map(([id, name]) => ({ id, name }))
        );
        setSubcategories(
          Array.from(subcatSet.entries()).map(([id, name]) => ({ id, name }))
        );
        setCourses(normCourses);
        setExams(normExams);
      } catch (e) {
        console.error("Associations preview error:", e);
      } finally {
        if (alive) setAssocLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // re-run when semester, degree selection, or semNumber change
  }, [API, semId, form.degree, form.semNumber, degrees]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMsg({ type: "", text: "" });
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const canSave = useMemo(() => {
    const n = Number(form.semNumber);
    return form.degree && Number.isInteger(n) && n >= 1 && !saving;
  }, [form.degree, form.semNumber, saving]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    // basic validation
    const n = Number(form.semNumber);
    if (!form.degree) {
      setMsg({ type: "error", text: "Degree is required." });
      return;
    }
    if (!Number.isInteger(n) || n < 1) {
      setMsg({ type: "error", text: "Sem Number must be a positive integer." });
      return;
    }

    // validate metadata JSON (optional)
    let metadataParsed = undefined;
    if (form.metadataText && form.metadataText.trim()) {
      try {
        metadataParsed = JSON.parse(form.metadataText);
      } catch {
        setMsg({ type: "error", text: "Metadata must be valid JSON." });
        return;
      }
    }

    const payload = {
      degree: form.degree, // controller will ObjectId-ify
      semNumber: Number(form.semNumber),
      semester_name: form.semester_name.trim(),
      semester_code: form.semester_code.trim(),
      slug: form.slug.trim(), // controller normalizes
      description: form.description,
      academicYear: form.academicYear,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      totalCredits: form.totalCredits === "" ? "" : Number(form.totalCredits),
      totalCoursesPlanned:
        form.totalCoursesPlanned === "" ? "" : Number(form.totalCoursesPlanned),
      isActive: form.isActive,
      metadata: metadataParsed,
    };

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/semesters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to update semester.");
      }

      setMsg({ type: "success", text: "semester updated successfully." });
      // Optionally navigate back after a short delay:
      // setTimeout(() => navigate(`/single-semester/${encodeURIComponent(form.slug || `semester-${form.semNumber || "1"}`)}/${id}`), 700);
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
            <Link to="/all-semesters" className="text-gray-900 underline">
              ← Back to All semesters
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const viewHref = `/single-semester/${encodeURIComponent(
    form.slug || `semester-${form.semNumber || "1"}`
  )}/${id}`;

  const selectedDegree =
    degrees.find((d) => (d._id || d.id) === form.degree) || null;

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Update semester
            </h1>
            <p className="text-gray-600 mt-1">
              Edit and save changes to this semester.
            </p>

            {/* ✅ semester ID under header */}
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <FiHash className="text-purple-600" />
              <code className="bg-gray-100 border px-2 py-0.5 rounded">
                {semId}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={viewHref}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Back to semester"
            >
              <FiRefreshCcw className="h-4 w-4" />
              View semester
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
              {/* ✅ semester ID in Basic */}
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  semester ID
                </label>
                <div className="mt-2">
                  <code className="bg-gray-100 border px-2 py-1 rounded text-xs">
                    {semId}
                  </code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  semester Name
                </label>
                <input
                  name="semester_name"
                  type="text"
                  value={form.semester_name}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., Semester 1 / Fall 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  semester Code
                </label>
                <input
                  name="semester_code"
                  type="text"
                  value={form.semester_code}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., SEM-1"
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
                  placeholder="auto-generated from name if blank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Sem Number *
                </label>
                <input
                  name="semNumber"
                  type="number"
                  step="1"
                  min="1"
                  value={form.semNumber}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 1"
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
                placeholder="Overview or notes for this semester…"
              />
            </div>
          </div>

          {/* Planning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Planning</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Academic Year
                  </label>
                  <input
                    name="academicYear"
                    type="text"
                    value={form.academicYear}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., 2025-2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Start Date
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    End Date
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Total Credits
                  </label>
                  <input
                    name="totalCredits"
                    type="number"
                    step="1"
                    value={form.totalCredits}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., 24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Total Courses Planned
                  </label>
                  <input
                    name="totalCoursesPlanned"
                    type="number"
                    step="1"
                    value={form.totalCoursesPlanned}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., 6"
                  />
                </div>
              </div>
            </div>

            {/* Relations & Status */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Relations & Status
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Degree *
                  </label>
                  <select
                    name="degree"
                    value={form.degree}
                    onChange={onChange}
                    required
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                    disabled={degLoading}
                  >
                    <option value="">Select a degree…</option>
                    {degrees.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        {d.name || d.code || d.slug}
                      </option>
                    ))}
                  </select>

                  {/* ✅ Show selected degree ID + name */}
                  <div className="mt-2 text-xs text-gray-700 flex items-center gap-2">
                    <span className="font-medium">Selected Degree:</span>
                    <span className="truncate">
                      {selectedDegree?.name ||
                        selectedDegree?.title ||
                        selectedDegree?.code ||
                        "—"}
                    </span>
                    <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                      {form.degree || "—"}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={onChange}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-800">
                    Active
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Metadata (JSON)
                  </label>
                  <textarea
                    name="metadataText"
                    rows={6}
                    value={form.metadataText}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 font-mono text-xs"
                    placeholder='e.g., { "note": "advising complete" }'
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ---- Associations Preview (read-only) ---- */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FiGrid /> Associations Preview
            </h3>
            {assocLoading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {/* Degree */}
                <div>
                  <div className="font-medium text-gray-900 mb-1">Degree</div>
                  <div className="flex items-center gap-2">
                    <span className="truncate">
                      {degreeDetail?.name || degreeDetail?.title || "—"}
                    </span>
                    <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                      {getId(degreeDetail) || form.degree || "—"}
                    </code>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <div className="font-medium text-gray-900 mb-1">
                    Categories ({categories.length})
                  </div>
                  {categories.length === 0 ? (
                    <div className="text-gray-600">—</div>
                  ) : (
                    <ul className="space-y-1">
                      {categories.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className="truncate">{c.name}</span>
                          <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                            {c.id}
                          </code>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Subcategories */}
                <div>
                  <div className="font-medium text-gray-900 mb-1">
                    Subcategories ({subcategories.length})
                  </div>
                  {subcategories.length === 0 ? (
                    <div className="text-gray-600">—</div>
                  ) : (
                    <ul className="space-y-1">
                      {subcategories.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <span className="truncate">{s.name}</span>
                          <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                            {s.id}
                          </code>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Courses */}
                <div className="md:col-span-2">
                  <div className="font-medium text-gray-900 mb-1">
                    Courses ({courses.length})
                  </div>
                  {courses.length === 0 ? (
                    <div className="text-gray-600">—</div>
                  ) : (
                    <ul className="space-y-1">
                      {courses.map((c) => (
                        <li key={c.id} className="flex items-center gap-2">
                          <span className="truncate">
                            {c.title}{" "}
                            {c.slug ? (
                              <span className="text-gray-500">({c.slug})</span>
                            ) : null}
                          </span>
                          <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                            {c.id}
                          </code>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Exams */}
                <div className="md:col-span-2">
                  <div className="font-medium text-gray-900 mb-1">
                    Exams ({exams.length})
                  </div>
                  {exams.length === 0 ? (
                    <div className="text-gray-600">—</div>
                  ) : (
                    <ul className="space-y-1">
                      {exams.map((e) => (
                        <li key={e.id} className="flex items-center gap-2">
                          <span className="truncate">
                            {e.examName}
                            {e.examCode ? (
                              <span className="text-gray-500">
                                {" "}
                                ({e.examCode})
                              </span>
                            ) : null}
                          </span>
                          <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                            {e.id}
                          </code>
                          {e.totalMarks != null && (
                            <span className="text-gray-600">
                              • Marks: {e.totalMarks}
                            </span>
                          )}
                          {e.passPercentage != null && (
                            <span className="text-gray-600">
                              • Pass%: {e.passPercentage}
                            </span>
                          )}
                          <span
                            className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
                              e.isPublished
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {e.isPublished ? "Published" : "Draft"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
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
              <FiSave className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <Link
              to={viewHref}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Cancel and view semester"
            >
              <FiX className="h-4 w-4" /> Cancel
            </Link>

            <Link
              to="/all-semesters"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Back to All semesters
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Updatesemester;
