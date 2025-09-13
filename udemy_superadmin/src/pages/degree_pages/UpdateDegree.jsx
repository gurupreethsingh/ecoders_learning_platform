// src/pages/degree_pages/UpdateDegree.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
import {
  FiSave,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCcw,
} from "react-icons/fi";

const API = globalBackendRoute;

const LEVELS = [
  "certificate",
  "diploma",
  "undergraduate",
  "postgraduate",
  "doctorate",
];

const cleanCsv = (s) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const UpdateDegree = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

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
    accreditationCsv: "",
    coordinatorsCsv: "",
    isActive: true,
    logoUrl: "",
    brochureUrl: "",
    metadataText: "",
  });

  // Load degree
  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) {
        setErr("No degree id provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr("");
        // ✅ matches: router.get("/get-degree-by-id/slug/:id", ...)
        const res = await fetch(`${API}/api/get-degree-by-id/slug/${id}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch degree.");

        if (!active) return;
        const accCsv = Array.isArray(json.accreditation)
          ? json.accreditation.join(", ")
          : "";
        const coordCsv = Array.isArray(json.coordinators)
          ? json.coordinators.join(", ")
          : "";
        const metadataText = json?.metadata
          ? JSON.stringify(json.metadata, null, 2)
          : "";

        setForm({
          name: json.name || "",
          code: json.code || "",
          slug: json.slug || "",
          description: json.description || "",
          level: json.level || "undergraduate",
          durationYears: json.durationYears ?? "",
          totalSemesters: json.totalSemesters ?? "",
          department: json.department || "",
          awardingBody: json.awardingBody || "",
          accreditationCsv: accCsv,
          coordinatorsCsv: coordCsv,
          isActive: Boolean(json.isActive),
          logoUrl: json?.assets?.logoUrl || "",
          brochureUrl: json?.assets?.brochureUrl || "",
          metadataText,
        });
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [API, id]);

  const canSave = useMemo(
    () => form.name.trim() && form.code.trim() && !saving,
    [form, saving]
  );

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

    if (!form.name.trim() || !form.code.trim()) {
      setMsg({ type: "error", text: "Name and Code are required." });
      return;
    }

    // validate metadata JSON (if provided)
    let metadataParsed = undefined;
    if (form.metadataText && form.metadataText.trim()) {
      try {
        metadataParsed = JSON.parse(form.metadataText);
      } catch {
        setMsg({ type: "error", text: "Metadata must be valid JSON." });
        return;
      }
    }

    // ✅ Build payload WITHOUT empty fields
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description,
      level: form.level,
      department: form.department,
      awardingBody: form.awardingBody,
      accreditation: cleanCsv(form.accreditationCsv),
      coordinators: cleanCsv(form.coordinatorsCsv),
      isActive: form.isActive,
      logoUrl: form.logoUrl,
      brochureUrl: form.brochureUrl,
      metadata: metadataParsed,
    };

    // only send slug if not blank (prevents “slug is required” errors)
    if (form.slug && form.slug.trim()) payload.slug = form.slug.trim();

    // only send numeric fields if provided (prevents "" → 0 → min validation errors)
    if (form.durationYears !== "")
      payload.durationYears = Number(form.durationYears);
    if (form.totalSemesters !== "")
      payload.totalSemesters = Number(form.totalSemesters);

    try {
      setSaving(true);
      // ✅ matches: router.patch("/update-degree/slug/:id", ...)
      const res = await fetch(`${API}/api/update-degree/slug/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // guard against HTML responses on errors
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await res.json()
        : { message: await res.text() };

      if (!res.ok) throw new Error(body?.message || "Failed to update degree.");

      setMsg({ type: "success", text: "Degree updated successfully." });

      // Optional: navigate back to Single after a moment (uses returned slug if present)
      // const newSlug = body?.slug || payload.slug || form.slug || "degree";
      // setTimeout(() => navigate(`/single-degree/${encodeURIComponent(newSlug)}/${id}`), 700);
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
            <Link to="/all-degrees" className="text-gray-900 underline">
              ← Back to All Degrees
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
              Update Degree
            </h1>
            <p className="text-gray-600 mt-1">
              Edit and save changes to this degree.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/single-degree/${encodeURIComponent(
                form.slug || "degree"
              )}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Back to Degree"
            >
              <FiRefreshCcw className="h-4 w-4" />
              View Degree
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
                  Name *
                </label>
                <input
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., Bachelor of Science in Computer Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Code *
                </label>
                <input
                  name="code"
                  type="text"
                  value={form.code}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., BSC-CS"
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
                  value={form.durationYears}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 3 or 4"
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
                  value={form.totalSemesters}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., 6 or 8"
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
                placeholder="Short overview of the degree…"
              />
            </div>
          </div>

          {/* Organization & Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Organization</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Department
                  </label>
                  <input
                    name="department"
                    type="text"
                    value={form.department}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., Computer Science"
                  />
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
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., University of X"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Accreditation (comma separated)
                  </label>
                  <input
                    name="accreditationCsv"
                    type="text"
                    value={form.accreditationCsv}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., NAAC,AACSB"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Coordinators (IDs, comma separated)
                  </label>
                  <input
                    name="coordinatorsCsv"
                    type="text"
                    value={form.coordinatorsCsv}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., 65a1...,65b2..."
                  />
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
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Assets & Metadata
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Logo URL
                  </label>
                  <input
                    name="logoUrl"
                    type="text"
                    value={form.logoUrl}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="https://…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Brochure URL
                  </label>
                  <input
                    name="brochureUrl"
                    type="text"
                    value={form.brochureUrl}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="https://…"
                  />
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
                    placeholder='e.g., { "catalogYear": 2025 }'
                  />
                </div>
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
              to={`/single-degree/${encodeURIComponent(
                form.slug || "degree"
              )}/${id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Cancel and view degree"
            >
              <FiX className="h-4 w-4" /> Cancel
            </Link>

            <Link
              to="/all-degrees"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            >
              Back to All Degrees
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateDegree;
