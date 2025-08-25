// src/pages/semister_pages/SingleSemister.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "../../config/Config";
import {
  FiCheckCircle,
  FiSlash,
  FiCalendar,
  FiRefreshCcw,
  FiTag,
  FiHash,
  FiLayers,
  FiBookOpen,
  FiEdit3,
} from "react-icons/fi";

const API = globalBackendRoute;

const pretty = (v) => (v == null || v === "" ? "—" : String(v));

const SingleSemister = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [toggling, setToggling] = useState(false);

  // Fetch semister by id
  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) {
        setErr("No semister id provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API}/api/semisters/${id}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch semister.");
        if (!active) return;
        setData(json);
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

  const createdAt = useMemo(
    () => (data?.createdAt ? new Date(data.createdAt).toLocaleString() : "—"),
    [data]
  );
  const updatedAt = useMemo(
    () => (data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"),
    [data]
  );

  const toggleActive = async () => {
    if (!data?._id) return;
    const nextState = !data.isActive;
    const ok = window.confirm(
      `Are you sure you want to ${nextState ? "activate" : "deactivate"} "${
        data.semister_name || `Semester ${data.semNumber || ""}`
      }"?`
    );
    if (!ok) return;

    try {
      setToggling(true);
      setMsg({ type: "", text: "" });

      const res = await fetch(
        `${API}/api/semisters/${data._id}/toggle-active`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextState }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update status.");

      setData((prev) => (prev ? { ...prev, isActive: json.isActive } : prev));
      setMsg({
        type: "success",
        text: `Semister is now ${json.isActive ? "Active" : "Inactive"}.`,
      });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Something went wrong." });
    } finally {
      setToggling(false);
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
            <Link to="/all-semisters" className="text-gray-900 underline">
              ← Back to All Semisters
            </Link>
            <Link to="/dashboard" className="text-gray-900 underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const updateHref = `/update-semister/${encodeURIComponent(
    data.slug || `semester-${data.semNumber || "1"}`
  )}/${data._id}`;

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Title */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Semister Details
            </h1>
            <p className="text-gray-600 mt-1">
              View semister information and toggle its active status.
            </p>
          </div>

          {/* Status pill + toggle + update */}
          <div className="flex items-center gap-3">
            {data.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash />
                Inactive
              </span>
            )}

            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
                toggling
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
              title="Toggle active status"
            >
              <FiRefreshCcw className="h-4 w-4" />
              {toggling
                ? "Updating…"
                : data.isActive
                ? "Deactivate"
                : "Activate"}
            </button>

            <Link
              to={updateHref}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
              title="Update this semister"
            >
              <FiEdit3 className="h-4 w-4" />
              Update
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
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <div className="mt-6 rounded-lg border p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Name:</span>{" "}
                <span className="semister_name font-bold">
                  {pretty(data.semister_name)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiLayers className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Slug:</span> {pretty(data.slug)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Code:</span>{" "}
                {pretty(data.semister_code)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiBookOpen className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Sem Number:</span>{" "}
                {pretty(data.semNumber)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Created:</span> {createdAt}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiCalendar className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Updated:</span> {updatedAt}
              </span>
            </div>
          </div>

          {data.description ? (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Description
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {data.description}
              </div>
            </div>
          ) : null}
        </div>

        {/* Planning & Organization */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Planning</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Academic Year:</span>{" "}
              {pretty(data.academicYear)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Start Date:</span>{" "}
              {data?.startDate
                ? new Date(data.startDate).toLocaleDateString()
                : "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">End Date:</span>{" "}
              {data?.endDate
                ? new Date(data.endDate).toLocaleDateString()
                : "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Total Credits:</span>{" "}
              {data?.totalCredits ?? "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Total Courses Planned:</span>{" "}
              {data?.totalCoursesPlanned ?? "—"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Relations</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Degree ID:</span>{" "}
              {pretty(data.degree)}
            </p>
          </div>

          {data?.metadata ? (
            <div className="rounded-lg border p-4 md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-2">Metadata</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto">
                {JSON.stringify(data.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-semisters"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Semisters
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SingleSemister;
