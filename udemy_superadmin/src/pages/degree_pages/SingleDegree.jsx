// src/pages/degree_pages/SingleDegree.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import globalBackendRoute from "@/config/Config.js";
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
  FiEdit,
  FiCopy,
  FiDatabase,
} from "react-icons/fi";

const API = globalBackendRoute;

const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const levelLabel = (lvl) =>
  (lvl || "")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const SingleDegree = () => {
  const { id } = useParams(); // /single-degree/:slug/:id

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [toggling, setToggling] = useState(false);

  // Related
  const [semesters, setSemesters] = useState({
    loading: false,
    list: [],
    err: "",
  });
  const [courses, setCourses] = useState({ loading: false, list: [], err: "" });

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* noop */
    }
  };

  // Fetch degree by ID (backend route expects slug param name in path)
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

  // When degree loads, fetch related: semesters & courses
  useEffect(() => {
    if (!data?._id) return;

    // Semesters for this degree
    (async () => {
      setSemesters((s) => ({ ...s, loading: true, err: "" }));
      try {
        const url = `${API}/api/semesters?degree=${encodeURIComponent(
          data._id
        )}&degreeId=${encodeURIComponent(data._id)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch semesters.");
        const list = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];
        setSemesters({ loading: false, list, err: "" });
      } catch (e) {
        setSemesters({
          loading: false,
          list: [],
          err: e.message || "Failed to fetch semesters.",
        });
      }
    })();

    // Courses for this degree (use /list-courses then filter client-side)
    (async () => {
      setCourses((s) => ({ ...s, loading: true, err: "" }));
      try {
        const url = `${API}/api/list-courses?page=1&limit=5000&sortBy=createdAt&order=desc`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch courses.");
        const arr = Array.isArray(json?.data) ? json.data : [];
        const degId = String(data._id);
        const filtered = arr.filter((c) => {
          const v =
            (typeof c.degree === "object" && c.degree
              ? c.degree._id
              : c.degree) ??
            (typeof c.degreeId === "object" && c.degreeId
              ? c.degreeId._id
              : c.degreeId);
          return v && String(v) === degId;
        });
        setCourses({ loading: false, list: filtered, err: "" });
      } catch (e) {
        setCourses({
          loading: false,
          list: [],
          err: e.message || "Failed to fetch courses.",
        });
      }
    })();
  }, [API, data?._id]);

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
        body: JSON.stringify({ isActive: nextState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to update status.");

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

  const fullId = data._id || "—";
  const shortId = fullId !== "—" ? fullId.slice(-10) : "—";

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-lg border overflow-hidden">
        {/* Title & actions */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">
              Degree Details
            </h1>
            <p className="text-gray-600 mt-1 break-words">
              View degree information and toggle its active status.
            </p>

            {/* ID badge */}
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gray-100 border px-3 py-1 max-w-full overflow-hidden">
              <FiDatabase className="shrink-0" />
              <span className="text-xs text-gray-700 truncate">
                <span className="font-semibold">ID:</span>{" "}
                <span className="font-mono break-all">{shortId}</span>
              </span>
              {fullId !== "—" && (
                <button
                  className="text-xs text-indigo-600 hover:underline shrink-0"
                  onClick={() => copy(fullId)}
                  title="Copy full ID"
                >
                  <FiCopy className="inline-block mr-1" />
                  Copy
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.isActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> Inactive
              </span>
            )}

            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
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
              to={`/update-degree/${encodeURIComponent(
                data.slug || "degree"
              )}/${data._id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-500"
              title="Update Degree"
            >
              <FiEdit className="h-4 w-4" />
              Update
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {msg.text ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm break-words ${
              msg.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <div className="mt-6 rounded-lg border p-4 overflow-hidden">
          <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2 text-gray-800 min-w-0">
              <FiTag className="shrink-0 mt-0.5" />
              <span className="truncate">
                <span className="font-medium">Name:</span>{" "}
                <span className="break-words">{pretty(data.name)}</span>
              </span>
            </div>
            <div className="flex items-start gap-2 text-gray-800 min-w-0">
              <FiHash className="shrink-0 mt-0.5" />
              <span className="truncate">
                <span className="font-medium">Code:</span>{" "}
                <span className="break-words">{pretty(data.code)}</span>
              </span>
            </div>
            <div className="flex items-start gap-2 text-gray-800 min-w-0">
              <FiLayers className="shrink-0 mt-0.5" />
              <span className="truncate">
                <span className="font-medium">Slug:</span>{" "}
                <span className="break-words">{pretty(data.slug)}</span>
              </span>
            </div>
            <div className="flex items-start gap-2 text-gray-800 min-w-0">
              <FiBookOpen className="shrink-0 mt-0.5" />
              <span className="truncate">
                <span className="font-medium">Level:</span>{" "}
                <span className="break-words">
                  {pretty(levelLabel(data.level))}
                </span>
              </span>
            </div>
            <div className="flex items-start gap-2 text-gray-800">
              <FiCalendar className="shrink-0 mt-0.5" />
              <span className="truncate">
                <span className="font-medium">Created:</span> {createdAt}
              </span>
            </div>
            <div className="flex items-start gap-2 text-gray-800">
              <FiCalendar className="shrink-0 mt-0.5" />
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
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-wrap break-words overflow-hidden">
                {data.description}
              </div>
            </div>
          ) : null}
        </div>

        {/* Planning / Organization / Assets / Metadata */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4 overflow-hidden">
            <h3 className="font-semibold text-gray-900 mb-2">Planning</h3>
            <p className="text-sm text-gray-700 break-words">
              <span className="font-medium">Duration:</span>{" "}
              {data?.durationYears
                ? `${data.durationYears} year${
                    data.durationYears > 1 ? "s" : ""
                  }`
                : "—"}
            </p>
            <p className="text-sm text-gray-700 break-words">
              <span className="font-medium">Total Semesters:</span>{" "}
              {data?.totalSemesters ?? "—"}
            </p>

            {/* Semester chips (wrap safely) */}
            <div className="text-sm text-gray-700 mt-2">
              <span className="font-medium">Semesters:</span>{" "}
              {semesters.loading ? (
                <span>Loading…</span>
              ) : semesters.err ? (
                <span className="text-red-600">{semesters.err}</span>
              ) : semesters.list.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {semesters.list.map((s) => {
                    const sid = s._id || s.id;
                    const name =
                      s.name ||
                      s.title ||
                      (s.semNumber ? `Sem ${s.semNumber}` : "Semester");
                    const short = sid ? sid.slice(-8) : "—";
                    return (
                      <span
                        key={sid || name}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 border px-2 py-1 max-w-full"
                        title={sid ? `Full ID: ${sid}` : undefined}
                      >
                        <span className="truncate max-w-[10rem]">{name}</span>
                        <code className="text-xs bg-white border px-1 py-0.5 rounded break-all">
                          {short}
                        </code>
                        {sid && (
                          <button
                            className="text-xs text-indigo-600 hover:underline shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              copy(sid);
                            }}
                            title="Copy Semester ID"
                          >
                            <FiCopy className="inline-block" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                "—"
              )}
            </div>

            {/* Course chips (wrap safely) */}
            <div className="text-sm text-gray-700 mt-3">
              <span className="font-medium">Courses:</span>{" "}
              {courses.loading ? (
                <span>Loading…</span>
              ) : courses.err ? (
                <span className="text-red-600">{courses.err}</span>
              ) : courses.list.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {courses.list.map((c) => {
                    const cid = c._id || c.id;
                    const name = c.title || c.name || "Untitled Course";
                    const short = cid ? cid.slice(-8) : "—";
                    const link =
                      cid &&
                      `/single-course/${encodeURIComponent(
                        c.slug || name || "course"
                      )}/${cid}`;
                    return (
                      <span
                        key={cid || name}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 border px-2 py-1 max-w-full"
                        title={cid ? `Full ID: ${cid}` : undefined}
                      >
                        <span className="truncate max-w-[12rem]">{name}</span>
                        <code className="text-xs bg-white border px-1 py-0.5 rounded break-all">
                          {short}
                        </code>
                        {cid && (
                          <>
                            <button
                              className="text-xs text-indigo-600 hover:underline shrink-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                copy(cid);
                              }}
                              title="Copy Course ID"
                            >
                              <FiCopy className="inline-block" />
                            </button>
                            {link && (
                              <Link
                                to={link}
                                className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 shrink-0"
                                title="Open course"
                              >
                                <FiExternalLink />
                              </Link>
                            )}
                          </>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4 overflow-hidden">
            <h3 className="font-semibold text-gray-900 mb-2">Organization</h3>
            <p className="text-sm text-gray-700 break-words">
              <span className="font-medium">Department:</span>{" "}
              {pretty(data.department)}
            </p>
            <p className="text-sm text-gray-700 break-words">
              <span className="font-medium">Awarding Body:</span>{" "}
              {pretty(data.awardingBody)}
            </p>
            <div className="text-sm text-gray-700 mt-2 break-words">
              <span className="font-medium">Accreditation:</span>{" "}
              {accreditation.length ? accreditation.join(", ") : "—"}
            </div>
          </div>

          <div className="rounded-lg border p-4 md:col-span-2 overflow-hidden">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FiUsers /> Coordinators
            </h3>
            {Array.isArray(data.coordinators) &&
            data.coordinators.length > 0 ? (
              <ul className="list-disc pl-6 text-sm text-gray-800 break-words">
                {data.coordinators.map((c, i) => (
                  <li key={i} className="break-words">
                    {String(c)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">—</p>
            )}
          </div>

          <div className="rounded-lg border p-4 md:col-span-2 overflow-hidden">
            <h3 className="font-semibold text-gray-900 mb-2">Assets</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="break-words">
                <span className="font-medium">Logo URL:</span>{" "}
                {data?.assets?.logoUrl ? (
                  <a
                    href={data.assets.logoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 break-all"
                  >
                    {data.assets.logoUrl} <FiExternalLink />
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div className="break-words">
                <span className="font-medium">Brochure URL:</span>{" "}
                {data?.assets?.brochureUrl ? (
                  <a
                    href={data.assets.brochureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 break-all"
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
            <div className="rounded-lg border p-4 md:col-span-2 overflow-hidden">
              <h3 className="font-semibold text-gray-900 mb-2">Metadata</h3>
              <div className="max-h-64 overflow-auto rounded-lg">
                <pre className="text-xs bg-gray-50 p-3 rounded-lg break-all">
                  {JSON.stringify(data.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {/* --- Related: Semesters --- */}
        <div className="mt-8 rounded-lg border p-4 overflow-hidden">
          <h3 className="font-semibold text-gray-900 mb-2">
            Semesters (linked to this Degree)
          </h3>
          {semesters.loading && (
            <p className="text-sm text-gray-600">Loading semesters…</p>
          )}
          {semesters.err && (
            <p className="text-sm text-red-600 break-words">{semesters.err}</p>
          )}
          {!semesters.loading &&
            !semesters.err &&
            (semesters.list.length ? (
              <ul className="divide-y">
                {semesters.list.map((s) => (
                  <li
                    key={s._id || s.id}
                    className="py-2 text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 break-words"
                  >
                    <span>
                      <span className="font-medium">Name:</span>{" "}
                      {pretty(s.name || s.title)}
                    </span>
                    <span>
                      <span className="font-medium">No:</span>{" "}
                      {pretty(s.number || s.semNumber)}
                    </span>
                    <span>
                      <span className="font-medium">Active:</span>{" "}
                      {s.isActive ? "Yes" : "No"}
                    </span>
                    {(s._id || s.id) && (
                      <span className="font-mono text-gray-600 break-all">
                        ID: {(s._id || s.id).slice(-8)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">No semesters found.</p>
            ))}
        </div>

        {/* --- Related: Courses --- */}
        <div className="mt-8 rounded-lg border p-4 overflow-hidden">
          <h3 className="font-semibold text-gray-900 mb-2">
            Courses (linked to this Degree)
          </h3>
          {courses.loading && (
            <p className="text-sm text-gray-600">Loading courses…</p>
          )}
          {courses.err && (
            <p className="text-sm text-red-600 break-words">{courses.err}</p>
          )}
          {!courses.loading &&
            !courses.err &&
            (courses.list.length ? (
              <ul className="divide-y">
                {courses.list.map((c) => {
                  const cid = c._id || c.id;
                  const link =
                    cid &&
                    `/single-course/${encodeURIComponent(
                      c.slug || c.title || "course"
                    )}/${cid}`;
                  return (
                    <li
                      key={cid || Math.random()}
                      className="py-2 text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 break-words"
                    >
                      <span className="font-medium">
                        {c.title || c.name || "Untitled Course"}
                      </span>
                      <span>Code: {pretty(c.code)}</span>
                      <span>Level: {pretty(c.level)}</span>
                      <span>Status: {c.isActive ? "Active" : "Inactive"}</span>
                      <span className="flex items-center gap-2">
                        {cid ? (
                          <span className="font-mono text-gray-600 break-all">
                            ID: {cid.slice(-8)}
                          </span>
                        ) : null}
                        {link ? (
                          <Link
                            className="text-indigo-600 hover:underline inline-flex items-center gap-1 shrink-0"
                            to={link}
                            title="Open course"
                          >
                            Open <FiExternalLink />
                          </Link>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">No courses found.</p>
            ))}
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-degrees"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Degrees
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

export default SingleDegree;
