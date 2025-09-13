// src/pages/degree_pages/CreateDegree.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiPlus,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiTag,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

import globalBackendRoute from "@/config/Config.js";

const slugify = (s = "") =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

const DEFAULT_LEVELS = [
  "certificate",
  "diploma",
  "undergraduate",
  "postgraduate",
  "doctorate",
];

const CreateDegree = () => {
  const API =
    globalBackendRoute ||
    import.meta?.env?.VITE_BACKEND_URL ||
    "http://localhost:5000";

  const navigate = useNavigate();

  // UI + alerts
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ type: "", text: "" });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Facets
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [departments, setDepartments] = useState([]);

  // Form state
  const [form, setForm] = useState({
    name: "",
    code: "",
    slug: "",
    description: "",
    level: "undergraduate",
    durationYears: "",
    totalSemesters: "",
    department: "",
    awardingBody: "",
    accreditationCsv: "", // for UI input; will split to array
    isActive: true,
    coordinatorsCsv: "", // comma-separated user ids
    logoUrl: "",
    brochureUrl: "",
    metadataText: "{}", // JSON text area
  });

  // Load facets (levels, departments)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setFacetsLoading(true);
        const res = await fetch(`${API}/api/degrees/facets`);
        if (!res.ok) throw new Error("Failed to fetch facets");
        const json = await res.json();
        if (!active) return;
        setLevels(
          Array.isArray(json?.levels) && json.levels.length
            ? json.levels
            : DEFAULT_LEVELS
        );
        setDepartments(
          Array.isArray(json?.departments)
            ? json.departments.filter(Boolean)
            : []
        );
      } catch {
        // keep defaults silently
      } finally {
        if (active) setFacetsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [API]);

  // Derived previews
  const derivedSlug = useMemo(
    () => (form.slug.trim() ? form.slug.trim() : slugify(form.name)),
    [form.slug, form.name]
  );

  // Handlers
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  // Validate metadata JSON
  const metadataIsValid = useMemo(() => {
    try {
      JSON.parse(form.metadataText || "{}");
      return true;
    } catch {
      return false;
    }
  }, [form.metadataText]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: "", text: "" });

    // Basic validations
    if (!form.name.trim() || !form.code.trim()) {
      setAlert({ type: "error", text: "Name and Code are required." });
      return;
    }
    if (!metadataIsValid) {
      setAlert({ type: "error", text: "Metadata must be valid JSON." });
      return;
    }

    // Build payload expected by controller.normalizeDegreeInput
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      // Optional slug – controller can also auto-generate from name if omitted
      slug: derivedSlug || undefined,
      description: form.description || undefined,
      level: form.level || undefined,
      durationYears:
        form.durationYears !== "" ? Number(form.durationYears) : undefined,
      totalSemesters:
        form.totalSemesters !== "" ? Number(form.totalSemesters) : undefined,
      department: form.department || undefined,
      awardingBody: form.awardingBody || undefined,
      accreditation: form.accreditationCsv
        ? form.accreditationCsv
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
      isActive: Boolean(form.isActive),
      // the controller accepts top-level logoUrl/brochureUrl or assets
      logoUrl: form.logoUrl || undefined,
      brochureUrl: form.brochureUrl || undefined,
      coordinators: form.coordinatorsCsv
        ? form.coordinatorsCsv
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
      metadata: form.metadataText ? JSON.parse(form.metadataText) : {},
    };

    // Client-side number sanity
    if (
      payload.totalSemesters !== undefined &&
      !Number.isInteger(payload.totalSemesters)
    ) {
      setAlert({ type: "error", text: "Total semesters must be an integer." });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/api/create-degree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.message ||
          (res.status === 409
            ? "Duplicate degree code or slug."
            : "Failed to create degree.");
        throw new Error(msg);
      }

      setAlert({
        type: "success",
        text: `Degree "${data.name}" created successfully.`,
      });

      // Reset main fields but keep some helpful values
      setForm((p) => ({
        ...p,
        name: "",
        code: "",
        slug: "",
        description: "",
        durationYears: "",
        totalSemesters: "",
        accreditationCsv: "",
        coordinatorsCsv: "",
        logoUrl: "",
        brochureUrl: "",
        metadataText: "{}",
      }));
      // optional: navigate to a list page
      // setTimeout(() => navigate("/degrees"), 800);
    } catch (err) {
      setAlert({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  // Chips preview for accreditation
  const accreditationChips = useMemo(() => {
    return (form.accreditationCsv || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [form.accreditationCsv]);

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white">
        {/* Header */}
        <div className="px-6 md:px-8 pt-6 md:pt-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700">
              <FiBookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Create Degree
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Add a new degree/program with core details and optional
                metadata.
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alert.text ? (
          <div
            className={`mx-6 md:mx-8 mt-4 rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
              alert.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {alert.type === "success" ? (
              <FiCheckCircle className="mt-0.5 shrink-0" />
            ) : (
              <FiAlertCircle className="mt-0.5 shrink-0" />
            )}
            <span>{alert.text}</span>
          </div>
        ) : null}

        {/* Form */}
        <form
          className="px-6 md:px-8 pb-6 md:pb-8 mt-6 space-y-6"
          onSubmit={onSubmit}
        >
          {/* Basic details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Degree Name <span className="text-red-600">*</span>
              </label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={onChange}
                placeholder="e.g., Bachelor of Computer Science"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Code <span className="text-red-600">*</span>
              </label>
              <input
                name="code"
                type="text"
                value={form.code}
                onChange={onChange}
                placeholder="e.g., BSC-CS"
                className="mt-2 uppercase w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-800">
                  Slug (optional)
                </label>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiInfo />
                  Will be auto-generated from name if left blank
                </span>
              </div>
              <input
                name="slug"
                type="text"
                value={form.slug}
                onChange={onChange}
                placeholder="e.g., bachelor-of-computer-science"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Preview: <span className="font-mono">{derivedSlug || "—"}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={onChange}
              placeholder="Brief overview of the degree/program…"
              className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Academic/Structure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Level
              </label>
              <select
                name="level"
                value={form.level}
                onChange={onChange}
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-3 py-2.5 text-gray-900"
              >
                {(levels || DEFAULT_LEVELS).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Duration (years)
              </label>
              <input
                name="durationYears"
                type="number"
                step="0.5"
                min="0"
                value={form.durationYears}
                onChange={onChange}
                placeholder="e.g., 3"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800">
                Total Semesters
              </label>
              <input
                name="totalSemesters"
                type="number"
                step="1"
                min="1"
                value={form.totalSemesters}
                onChange={onChange}
                placeholder="e.g., 6"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Org */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Department
              </label>
              <input
                list="departments"
                name="department"
                type="text"
                value={form.department}
                onChange={onChange}
                placeholder="e.g., Computer Science"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
              <datalist id="departments">
                {departments.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800">
                Awarding Body
              </label>
              <input
                name="awardingBody"
                type="text"
                value={form.awardingBody}
                onChange={onChange}
                placeholder="e.g., University of X"
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Accreditation */}
          <div>
            <label className="block text-sm font-medium text-gray-800">
              Accreditations (comma separated)
            </label>
            <div className="mt-2 flex items-center gap-2">
              <FiTag className="text-gray-500" />
              <input
                name="accreditationCsv"
                type="text"
                value={form.accreditationCsv}
                onChange={onChange}
                placeholder="e.g., NAAC, AICTE"
                className="flex-1 rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
              />
            </div>
            {accreditationChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {accreditationChips.map((chip, i) => (
                  <span
                    key={`${chip}-${i}`}
                    className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={onChange}
              className="h-4 w-4 text-gray-900 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-800">
              Active
            </label>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((s) => !s)}
            className="inline-flex items-center gap-2 text-sm text-gray-800 border rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            {advancedOpen ? <FiChevronUp /> : <FiChevronDown />}
            Advanced fields
            {facetsLoading && (
              <FiLoader className="h-4 w-4 animate-spin text-gray-500 ml-1" />
            )}
          </button>

          {/* Advanced fields */}
          {advancedOpen && (
            <div className="space-y-6 border rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Coordinators (comma-separated user IDs)
                </label>
                <input
                  name="coordinatorsCsv"
                  type="text"
                  value={form.coordinatorsCsv}
                  onChange={onChange}
                  placeholder="605c5f1a..., 605c5f1b..., ..."
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Logo URL
                  </label>
                  <input
                    name="logoUrl"
                    type="url"
                    value={form.logoUrl}
                    onChange={onChange}
                    placeholder="https://…"
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Brochure URL
                  </label>
                  <input
                    name="brochureUrl"
                    type="url"
                    value={form.brochureUrl}
                    onChange={onChange}
                    placeholder="https://…"
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-800">
                    Metadata (JSON)
                  </label>
                  {!metadataIsValid && (
                    <span className="text-xs text-red-600">
                      Invalid JSON format
                    </span>
                  )}
                </div>
                <textarea
                  name="metadataText"
                  rows={5}
                  value={form.metadataText}
                  onChange={onChange}
                  className={`mt-2 w-full rounded-lg border ${
                    metadataIsValid
                      ? "border-gray-300 focus:border-gray-400"
                      : "border-red-300 focus:border-red-400"
                  } focus:ring-0 px-4 py-2.5 text-gray-900 placeholder-gray-400`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Example: <code>{'{"creditsRequired": 120}'}</code>
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
            >
              {submitting ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiPlus className="h-4 w-4" />
              )}
              {submitting ? "Creating…" : "Create Degree"}
            </button>

            <Link
              to="/degrees"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDegree;
