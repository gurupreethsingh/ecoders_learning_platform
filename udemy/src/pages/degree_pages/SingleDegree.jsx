// src/pages/degree_pages/SingleDegree.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "../../config/Config"; // keep consistent with your degrees pages
import {
  FiCheckCircle,
  FiSlash,
  FiCalendar,
  FiRefreshCcw,
  FiTag,
  FiHash,
  FiLayers,
  FiBookOpen,
  FiUsers,
  FiExternalLink,
} from "react-icons/fi";

const API = globalBackendRoute; // e.g., http://localhost:5000

const pretty = (v) => (v == null || v === "" ? "—" : String(v));

const levelLabel = (lvl) =>
  (lvl || "")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const SingleDegree = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [toggling, setToggling] = useState(false);

  // Fetch degree by id
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
        const res = await fetch(`${API}/api/get-degree-by-id/slug/${id}`);

        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch degree.");
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

  const accreditation = Array.isArray(data?.accreditation)
    ? data.accreditation
    : [];

  const toggleActive = async () => {
    if (!data?._id) return;
    const nextState = !data.isActive;
    const ok = window.confirm(
      `Are you sure you want to ${nextState ? "activate" : "deactivate"} "${
        data.name
      }"?`
    );
    if (!ok) return;

    try {
      setToggling(true);
      setMsg({ type: "", text: "" });

      const res = await fetch(`${API}/api/degrees/${data._id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // body optional; if omitted controller toggles. Send explicit if you prefer:
        body: JSON.stringify({ isActive: nextState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update status.");

      // Reflect new state and show success
      setData((prev) => (prev ? { ...prev, isActive: json.isActive } : prev));
      setMsg({
        type: "success",
        text: `Degree is now ${json.isActive ? "Active" : "Inactive"}.`,
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

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Title */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Degree Details
            </h1>
            <p className="text-gray-600 mt-1">
              View degree information and toggle its active status.
            </p>
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
                <span className="degree_name font-bold">
                  {pretty(data.name)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Code:</span>{" "}
                <span className="degree_code font-bold">
                  {pretty(data.code)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiLayers className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Slug:</span>{" "}
                <span className="degree_slug font-bold">
                  {pretty(data.slug)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiBookOpen className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Level:</span>{" "}
                <span className="degree_level font-bold">
                  {pretty(levelLabel(data.level))}
                </span>
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

        {/* Academic planning */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Planning</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Duration:</span>{" "}
              {data?.durationYears
                ? `${data.durationYears} year${
                    data.durationYears > 1 ? "s" : ""
                  }`
                : "—"}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Total Semesters:</span>{" "}
              {data?.totalSemesters ?? "—"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Organization</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Department:</span>{" "}
              {pretty(data.department)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Awarding Body:</span>{" "}
              {pretty(data.awardingBody)}
            </p>
            <div className="text-sm text-gray-700 mt-2">
              <span className="font-medium">Accreditation:</span>{" "}
              {accreditation.length ? accreditation.join(", ") : "—"}
            </div>
          </div>

          <div className="rounded-lg border p-4 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FiUsers /> Coordinators
            </h3>
            {Array.isArray(data.coordinators) &&
            data.coordinators.length > 0 ? (
              <ul className="list-disc pl-6 text-sm text-gray-800">
                {data.coordinators.map((c, i) => (
                  <li key={i} className="break-all">
                    {String(c)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">—</p>
            )}
          </div>

          <div className="rounded-lg border p-4 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-2">Assets</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="font-medium">Logo URL:</span>{" "}
                {data?.assets?.logoUrl ? (
                  <a
                    href={data.assets.logoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    {data.assets.logoUrl} <FiExternalLink />
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div>
                <span className="font-medium">Brochure URL:</span>{" "}
                {data?.assets?.brochureUrl ? (
                  <a
                    href={data.assets.brochureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    {data.assets.brochureUrl} <FiExternalLink />
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>
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
            to="/all-degrees"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Degrees
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SingleDegree;
