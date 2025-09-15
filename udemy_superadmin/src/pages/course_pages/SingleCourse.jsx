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
  FiBookOpen,
  FiUsers,
  FiExternalLink,
  FiEdit,
  FiStar,
  FiFlag,
} from "react-icons/fi";

const API = globalBackendRoute;

const NA = "Information not available at this time.";
const pretty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0)
    ? NA
    : String(v);

const SingleCourse = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [toggling, setToggling] = useState(false);

  // lookups
  const [degreeMap, setDegreeMap] = useState({});
  const [semMap, setSemMap] = useState({});
  const [catMap, setCatMap] = useState({});
  const [subMap, setSubMap] = useState({});
  const [instMap, setInstMap] = useState({});

  useEffect(() => {
    let active = true;

    const loadCourse = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API}/api/get-course-by-id/${id}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch course.");
        if (!active) return;
        setData(json);
      } catch (e) {
        if (active) setErr(e.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    };

    const loadLookups = async () => {
      try {
        const [deg, sem, cat, sub, inst] = await Promise.allSettled([
          fetch(`${API}/api/list-degrees?page=1&limit=500`).then((r) =>
            r.json()
          ),
          fetch(`${API}/api/semesters?page=1&limit=2000`).then((r) => r.json()),
          fetch(`${API}/api/all-categories`).then((r) => r.json()),
          fetch(`${API}/api/all-subcategories`).then((r) => r.json()),
          fetch(`${API}/api/get-instructors`).then((r) => r.json()),
        ]);

        if (!active) return;

        if (deg.status === "fulfilled") {
          const list = deg.value?.data || deg.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((d) => {
            map[d._id || d.id] = d.name || d.title || "Untitled Degree";
          });
          setDegreeMap(map);
        }

        if (sem.status === "fulfilled") {
          const list = sem.value?.data || sem.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((s) => {
            const label =
              s.title ||
              s.semester_name ||
              (s.semNumber ? `Semister ${s.semNumber}` : s.slug) ||
              "Semister";
            map[s._id || s.id] = label;
          });
          setSemMap(map);
        }

        if (cat.status === "fulfilled") {
          const list = cat.value?.data || cat.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((c) => {
            map[c._id || c.id] = c.category_name || c.name || "Uncategorized";
          });
          setCatMap(map);
        }

        if (sub.status === "fulfilled") {
          const list = sub.value?.data || sub.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((s) => {
            map[s._id || s.id] = s.subcategory_name || s.name || "—";
          });
          setSubMap(map);
        }

        if (inst.status === "fulfilled") {
          const list =
            inst.value?.data?.data || inst.value?.data || inst.value || [];
          const map = {};
          (Array.isArray(list) ? list : []).forEach((u) => {
            map[u._id || u.id] =
              u.name || u.fullName || u.email || "Instructor";
          });
          setInstMap(map);
        }
      } catch {
        /* ignore */
      }
    };

    loadCourse();
    loadLookups();

    return () => {
      active = false;
    };
  }, [API, id]);

  const createdAt = useMemo(
    () => (data?.createdAt ? new Date(data.createdAt).toLocaleString() : NA),
    [data]
  );
  const updatedAt = useMemo(
    () => (data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : NA),
    [data]
  );

  // IDs (raw)
  const degreeId =
    typeof data?.degree === "object" ? data?.degree?._id : data?.degree;
  const semId =
    typeof data?.semester === "object" ? data?.semester?._id : data?.semester;
  const catId =
    typeof data?.category === "object" ? data?.category?._id : data?.category;
  const subId =
    typeof data?.subCategory === "object"
      ? data?.subCategory?._id
      : data?.subCategory;
  const instId =
    typeof data?.instructor === "object"
      ? data?.instructor?._id
      : data?.instructor;

  // Names (via populate/maps or raw fallbacks)
  const degreeName =
    (typeof data?.degree === "object" &&
      (data?.degree?.name || data?.degree?.title)) ||
    degreeMap[degreeId] ||
    pretty(degreeId);
  const semName =
    (typeof data?.semester === "object" &&
      (data?.semester?.title || data?.semester?.semester_name)) ||
    semMap[semId] ||
    pretty(semId);
  const catName =
    (typeof data?.category === "object" &&
      (data?.category?.category_name || data?.category?.name)) ||
    catMap[catId] ||
    pretty(catId);
  const subName =
    (typeof data?.subCategory === "object" &&
      (data?.subCategory?.subcategory_name || data?.subCategory?.name)) ||
    subMap[subId] ||
    pretty(subId);
  const instName =
    (typeof data?.instructor === "object" &&
      (data?.instructor?.name ||
        data?.instructor?.fullName ||
        data?.instructor?.email)) ||
    instMap[instId] ||
    pretty(instId);

  const toggle = async (kind) => {
    if (!data?._id) return;
    const label =
      kind === "published"
        ? "Published"
        : kind === "archived"
        ? "Archived"
        : "Featured";
    const ok = window.confirm(`Toggle ${label} for "${data.title}"?`);
    if (!ok) return;

    try {
      setToggling(true);
      setMsg({ type: "", text: "" });
      const url =
        kind === "published"
          ? `${API}/api/courses/${data._id}/toggle-published`
          : kind === "archived"
          ? `${API}/api/courses/${data._id}/toggle-archived`
          : `${API}/api/courses/${data._id}/toggle-featured`;
      const res = await fetch(url, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to toggle.");

      setData((prev) =>
        prev
          ? {
              ...prev,
              published:
                kind === "published" ? !prev.published : prev.published,
              isArchived:
                kind === "archived" ? !prev.isArchived : prev.isArchived,
              isFeatured:
                kind === "featured" ? !prev.isFeatured : prev.isFeatured,
            }
          : prev
      );
      setMsg({ type: "success", text: `${label} toggled.` });
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

  if (!data) return null;

  const slug = data.slug || "course";

  const fmtDate = (d) => (d ? new Date(d).toLocaleString() : NA);

  const maxStudentsText =
    data?.maxStudents == null
      ? NA
      : Number(data.maxStudents) === 0
      ? "Unlimited"
      : String(data.maxStudents);

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
        {/* Title & actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Course Details
            </h1>
            <p className="text-gray-600 mt-1">
              View course information, relations, and toggle visibility.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {data.published ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold">
                <FiCheckCircle /> Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiSlash /> Draft
              </span>
            )}
            {data.isFeatured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-xs font-semibold">
                <FiStar /> Featured
              </span>
            ) : null}
            {data.isArchived ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
                <FiFlag /> Archived
              </span>
            ) : null}

            <button
              onClick={() => toggle("published")}
              disabled={toggling}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                toggling ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
              }`}
              title="Toggle Published"
            >
              <FiRefreshCcw className="h-4 w-4" />
              Publish
            </button>
            <button
              onClick={() => toggle("featured")}
              disabled={toggling}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                toggling ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-500"
              }`}
              title="Toggle Featured"
            >
              <FiStar className="h-4 w-4" />
              Feature
            </button>
            <button
              onClick={() => toggle("archived")}
              disabled={toggling}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm font-semibold ${
                toggling ? "bg-gray-400" : "bg-gray-700 hover:bg-gray-600"
              }`}
              title="Toggle Archived"
            >
              <FiFlag className="h-4 w-4" />
              Archive
            </button>

            <Link
              to={`/update-course/${encodeURIComponent(slug)}/${data._id}`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold bg-indigo-600 hover:bg-indigo-500"
              title="Update Course"
            >
              <FiEdit className="h-4 w-4" />
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
            {/* ID */}
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {data._id || data.id}
                </code>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Title:</span> {pretty(data.title)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Slug:</span> {pretty(data.slug)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-800">
              <FiBookOpen className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Level:</span> {pretty(data.level)}
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

        {/* Belongs To */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Program</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Degree:</span> {degreeName}{" "}
              <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                {degreeId || NA}
              </code>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Semister:</span> {semName}{" "}
              <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                {semId || NA}
              </code>
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Categorization</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Category:</span> {catName}{" "}
              <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                {catId || NA}
              </code>
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Subcategory:</span> {subName}{" "}
              <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                {subId || NA}
              </code>
            </p>
          </div>

          <div className="rounded-lg border p-4 md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FiUsers /> People
            </h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Instructor:</span> {instName}{" "}
              <code className="ml-2 bg-gray-100 border px-1 py-0.5 rounded">
                {instId || NA}
              </code>
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Authors:</span>{" "}
              {Array.isArray(data.authors) && data.authors.length > 0
                ? data.authors
                    .map((a) =>
                      typeof a === "object" && a !== null ? a._id || a.id : a
                    )
                    .join(", ")
                : NA}
            </p>
          </div>
        </div>

        {/* Pricing & Access */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Pricing & Access
            </h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Access:</span>{" "}
              {pretty(data.accessType)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Price:</span>{" "}
              {data.price === 0 ? "Free" : pretty(data.price)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Duration:</span>{" "}
              {data?.durationInHours ? `${data.durationInHours}h` : NA}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Max Students:</span>{" "}
              {maxStudentsText}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Enrollment Deadline:</span>{" "}
              {fmtDate(data.enrollmentDeadline)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Completion Criteria:</span>{" "}
              {pretty(data.completionCriteria)}
            </p>
          </div>

          {/* SEO */}
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">SEO</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Meta Title:</span>{" "}
              {pretty(data.metaTitle)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Meta Description:</span>{" "}
              {pretty(data.metaDescription)}
            </p>
            {Array.isArray(data.keywords) && data.keywords.length ? (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Keywords:</span>{" "}
                {data.keywords.join(", ")}
              </p>
            ) : (
              <p className="text-sm text-gray-700">{NA}</p>
            )}
          </div>
        </div>

        {/* Learning Resources */}
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Resources</h3>
          {data?.learningResources ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Videos</div>
                <ul className="list-disc pl-6 text-gray-800">
                  {(data.learningResources.videos || []).length
                    ? data.learningResources.videos.map((v, i) => (
                        <li key={i} className="break-all">
                          <a
                            href={v}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                          >
                            {v} <FiExternalLink />
                          </a>
                        </li>
                      ))
                    : [<li key="nv">{NA}</li>]}
                </ul>
              </div>
              <div>
                <div className="font-medium">PDFs</div>
                <ul className="list-disc pl-6 text-gray-800">
                  {(data.learningResources.pdfs || []).length
                    ? data.learningResources.pdfs.map((v, i) => (
                        <li key={i} className="break-all">
                          <a
                            href={v}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                          >
                            {v} <FiExternalLink />
                          </a>
                        </li>
                      ))
                    : [<li key="np">{NA}</li>]}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">{NA}</p>
          )}
        </div>

        {/* Content Overview */}
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Content Overview</h3>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Total Modules:</span>{" "}
            {data?.totalModules != null ? data.totalModules : NA}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Total Topics:</span>{" "}
            {data?.totalTopics != null ? data.totalTopics : NA}
          </p>
          {Array.isArray(data?.modules) && data.modules.length ? (
            <div className="mt-3 space-y-2">
              {data.modules.map((m, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="font-medium">
                    {m?.title || `Module ${i + 1}`}{" "}
                    <span className="text-gray-500 ml-2">
                      {Array.isArray(m?.topics) ? m.topics.length : 0} topics
                    </span>
                  </div>
                  {Array.isArray(m?.topics) && m.topics.length ? (
                    <ul className="list-disc pl-6 text-sm text-gray-700 mt-1">
                      {m.topics.map((t, j) => (
                        <li key={j}>{t?.title || `Topic ${j + 1}`}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-600">{NA}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700">{NA}</p>
          )}
        </div>

        {/* Enrollment & Ratings */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Enrollment</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Enrolled Students:</span>{" "}
              {Array.isArray(data?.enrolledStudents)
                ? data.enrolledStudents.length
                : 0}
            </p>
            {Array.isArray(data?.enrolledStudents) &&
            data.enrolledStudents.length ? (
              <ul className="mt-2 list-disc pl-6 text-sm text-gray-700">
                {data.enrolledStudents.slice(0, 5).map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">StudentId:</span>{" "}
                    <code className="bg-gray-100 border px-1 py-0.5 rounded">
                      {s?.studentId || NA}
                    </code>{" "}
                    • <span className="font-medium">Progress:</span>{" "}
                    {s?.progress ?? 0}% •{" "}
                    <span className="font-medium">Completed:</span>{" "}
                    {s?.completed ? "Yes" : "No"}
                  </li>
                ))}
                {data.enrolledStudents.length > 5 ? (
                  <li className="text-gray-500">…and more</li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">{NA}</p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Ratings</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Average Rating:</span>{" "}
              {data?.averageRating != null ? data.averageRating : NA}
            </p>
            {Array.isArray(data?.ratings) && data.ratings.length ? (
              <ul className="mt-2 list-disc pl-6 text-sm text-gray-700">
                {data.ratings.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">StudentId:</span>{" "}
                    <code className="bg-gray-100 border px-1 py-0.5 rounded">
                      {r?.studentId || NA}
                    </code>{" "}
                    • <span className="font-medium">Rating:</span>{" "}
                    {r?.rating ?? NA}
                    {r?.review ? (
                      <>
                        {" "}
                        • <span className="font-medium">Review:</span>{" "}
                        {r.review}
                      </>
                    ) : null}
                  </li>
                ))}
                {data.ratings.length > 5 ? (
                  <li className="text-gray-500">…and more</li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">{NA}</p>
            )}
          </div>
        </div>

        {/* Technical / Flags */}
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Technical</h3>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Language:</span>{" "}
            {pretty(data.language)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Order:</span>{" "}
            {data?.order != null ? data.order : NA}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Version:</span> {pretty(data.version)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Tags:</span>{" "}
            {Array.isArray(data.tags) && data.tags.length
              ? data.tags.join(", ")
              : NA}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Published:</span>{" "}
            {data?.published ? "Yes" : "No"}
            {" • "}
            <span className="font-medium">Featured:</span>{" "}
            {data?.isFeatured ? "Yes" : "No"}
            {" • "}
            <span className="font-medium">Archived:</span>{" "}
            {data?.isArchived ? "Yes" : "No"}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-courses"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All Courses
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

export default SingleCourse;
