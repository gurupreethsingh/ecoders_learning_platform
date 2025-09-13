import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiPlusCircle,
  FiCheckCircle,
  FiAlertTriangle,
  FiCalendar,
  FiHash,
  FiBookOpen,
  FiInfo,
} from "react-icons/fi";
import globalBackendRoute from "@/config/Config.js";

const API = globalBackendRoute;

const numberOrEmpty = (v) => (v === "" || v === null ? "" : Number(v));
const isValidInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 1;

export default function Createsemester() {
  // degrees + counts
  const [degrees, setDegrees] = useState([]);
  const [loadingDeg, setLoadingDeg] = useState(true);
  const [degErr, setDegErr] = useState("");

  // form
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    degreeId: "",
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

  // Load degrees + counts (gracefully handle 404 for counts)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingDeg(true);
        setDegErr("");

        const qs = new URLSearchParams({
          page: "1",
          limit: "200", // safe cap per controller
          sortBy: "name",
          sortDir: "asc",
        });

        const [degRes, countRes] = await Promise.all([
          fetch(`${API}/api/list-degrees?${qs.toString()}`),
          fetch(`${API}/api/semesters/counts/by-degree`),
        ]);

        const degJson = await degRes.json();
        if (!degRes.ok)
          throw new Error(degJson?.message || "Failed to load degrees");

        // handle 404 for counts (treat as empty)
        let countJson = [];
        if (countRes.ok) {
          countJson = await countRes.json();
        } else if (countRes.status === 404) {
          countJson = [];
        } else {
          const errText = await countRes.text().catch(() => "");
          throw new Error(errText || "Failed to load semester counts");
        }

        if (!active) return;

        const rows = Array.isArray(degJson?.data) ? degJson.data : [];
        const countsArr = Array.isArray(countJson) ? countJson : [];
        const countIndex = countsArr.reduce((acc, row) => {
          if (row && row._id) acc[String(row._id)] = Number(row.count || 0);
          return acc;
        }, {});

        const merged = rows
          .map((d) => ({
            ...d,
            currentSemCount: countIndex[String(d._id)] || 0,
          }))
          .sort((a, b) =>
            String(a.name || "").localeCompare(
              String(b.name || ""),
              undefined,
              { sensitivity: "base" }
            )
          );

        setDegrees(merged);
      } catch (e) {
        if (active) setDegErr(e.message || "Failed to load degrees.");
      } finally {
        if (active) setLoadingDeg(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedDegree = useMemo(
    () => degrees.find((d) => String(d._id) === String(form.degreeId)),
    [degrees, form.degreeId]
  );

  const createdCount = selectedDegree?.currentSemCount || 0;
  const planned = selectedDegree?.totalSemesters || 0;
  const remaining = Math.max(0, planned - createdCount);
  const suggestedNext = createdCount + 1;

  // when degree changes, auto-suggest next sem number if empty
  useEffect(() => {
    if (!form.degreeId) return;
    setForm((prev) => {
      if (String(prev.semNumber || "") === "") {
        return { ...prev, semNumber: suggestedNext };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.degreeId, suggestedNext]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMsg({ type: "", text: "" });
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // simple sanity helper for start/end dates
  const dateOrderWarning =
    form.startDate &&
    form.endDate &&
    new Date(form.endDate) < new Date(form.startDate)
      ? "End date is earlier than Start date."
      : "";

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!form.degreeId) {
      setMsg({ type: "error", text: "Please select a degree." });
      return;
    }
    if (!isValidInt(form.semNumber)) {
      setMsg({
        type: "error",
        text: "Semester number must be an integer ≥ 1.",
      });
      return;
    }

    // parse metadata JSON if present
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
      degree: form.degreeId,
      semNumber: Number(form.semNumber),
      semester_name: form.semester_name,
      semester_code: form.semester_code,
      slug: form.slug.trim(), // optional; backend will build from name if omitted
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
      const res = await fetch(`${API}/api/semesters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.message ||
            (res.status === 409
              ? "Duplicate (semNumber or slug) within this degree."
              : "Failed to create semester.")
        );
      }

      // success
      setMsg({ type: "success", text: "semester created successfully." });

      // increment the local count for the selected degree & suggest next sem
      setDegrees((prev) =>
        prev.map((d) =>
          String(d._id) === String(form.degreeId)
            ? { ...d, currentSemCount: (d.currentSemCount || 0) + 1 }
            : d
        )
      );

      setForm((prev) => ({
        ...prev,
        semNumber: Number(prev.semNumber) + 1,
        semester_name: "",
        semester_code: "",
        slug: "",
        description: "",
        startDate: "",
        endDate: "",
        totalCredits: "",
        totalCoursesPlanned: "",
        metadataText: "",
      }));
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Create semester
            </h1>
            <p className="text-gray-600 mt-1">
              Add a new semester under a degree. Subtle design, fully
              responsive.
            </p>
          </div>

          <Link
            to="/all-degrees"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
            title="Back to All Degrees"
          >
            <FiBookOpen className="h-4 w-4" />
            All Degrees
          </Link>
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

        {/* Degrees loader/error */}
        {loadingDeg ? (
          <div className="mt-6 text-gray-600">Loading degrees…</div>
        ) : degErr ? (
          <div className="mt-6 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {degErr}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* Degree selector + summary */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Degree</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800">
                  Select Degree *
                </label>
                <select
                  name="degreeId"
                  value={form.degreeId}
                  onChange={onChange}
                  required
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
                >
                  <option value="">— Select —</option>
                  {degrees.map((d) => {
                    const created = d.currentSemCount || 0;
                    const plan = d.totalSemesters || 0;
                    const rem = Math.max(0, plan - created);
                    return (
                      <option key={d._id} value={d._id}>
                        {d.name} {d.code ? `(${d.code})` : ""} — {created} /{" "}
                        {plan} created
                        {plan ? ` (Remaining: ${rem})` : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <FiInfo /> Tip: We auto-suggest the next semester number based
                  on how many already exist in the selected degree.
                </p>
              </div>

              {/* Snapshot card */}
              <div className="rounded-lg border p-3 bg-gray-50">
                <div className="text-sm text-gray-800">
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    <span className="font-semibold">{createdCount}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>Planned</span>
                    <span className="font-semibold">{planned || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>Remaining</span>
                    <span className="font-semibold">
                      {selectedDegree ? remaining : "—"}
                    </span>
                  </div>
                  <div className="border-t mt-2 pt-2 flex items-center justify-between">
                    <span>Suggested next</span>
                    <span className="font-semibold">
                      {selectedDegree ? suggestedNext : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800">
                  semester Number *
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
                  placeholder={selectedDegree ? String(suggestedNext) : "1"}
                />
                {selectedDegree &&
                form.semNumber &&
                Number(form.semNumber) > planned ? (
                  <p className="text-xs text-gray-500 mt-1">
                    You’re creating more than the planned semesters. That’s
                    allowed, but double-check your plan.
                  </p>
                ) : null}
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
                  placeholder="e.g., Semester 1, Fall 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  semester Code
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="semester_code"
                    type="text"
                    value={form.semester_code}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 pl-9 py-2.5 text-gray-900"
                    placeholder="Optional short code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Slug (optional)
                </label>
                <div className="relative">
                  <FiBookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="slug"
                    type="text"
                    value={form.slug}
                    onChange={onChange}
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 pl-9 py-2.5 text-gray-900"
                    placeholder="auto-generated from name if left blank"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-800">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={onChange}
                className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                placeholder="Short overview of the semester…"
              />
            </div>
          </div>

          {/* Dates & Planning */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Schedule</h3>
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
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 pl-9 py-2.5 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    End Date
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={onChange}
                      className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 pl-9 py-2.5 text-gray-900"
                    />
                  </div>
                  {dateOrderWarning ? (
                    <p className="text-xs text-red-600 mt-1">
                      {dateOrderWarning}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Planning</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800">
                    Total Credits
                  </label>
                  <input
                    name="totalCredits"
                    type="number"
                    step="1"
                    value={form.totalCredits}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        totalCredits: numberOrEmpty(e.target.value),
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., 20"
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
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        totalCoursesPlanned: numberOrEmpty(e.target.value),
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                    placeholder="e.g., 5"
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
          </div>

          {/* Metadata */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Metadata (JSON)
            </h3>
            <textarea
              name="metadataText"
              rows={5}
              value={form.metadataText}
              onChange={onChange}
              className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 font-mono text-xs"
              placeholder='e.g., { "note": "evening batch", "cohort": "A" }'
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !form.degreeId || !isValidInt(form.semNumber)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                saving || !form.degreeId || !isValidInt(form.semNumber)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
              title="Create semester"
            >
              <FiPlusCircle className="h-4 w-4" />
              {saving ? "Creating…" : "Create semester"}
            </button>

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
}
