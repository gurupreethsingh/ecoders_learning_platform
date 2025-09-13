
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
  FiEdit3,
  FiGrid,
} from "react-icons/fi";

const API = globalBackendRoute;

const pretty = (v) => (v == null || v === "" ? "—" : String(v));
const getId = (val) => {
  if (!val) return null;
  if (typeof val === "object") return val._id || val.id || null;
  return val;
};
const getAny = (obj, keys = []) => {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
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

const Singlesemester = () => {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [toggling, setToggling] = useState(false);

  // lookups + associations
  const [degree, setDegree] = useState(null);
  const [categories, setCategories] = useState([]); // {id,name}
  const [subcategories, setSubcategories] = useState([]); // {id,name}
  const [courses, setCourses] = useState([]); // {id,title,slug}
  const [exams, setExams] = useState([]); // {id,examName,examCode}

  const [assocLoading, setAssocLoading] = useState(true);

  // ---------------- Fetch semester ----------------
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
        const res = await fetch(`${API}/api/semesters/${id}`);
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.message || "Failed to fetch semester.");
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

  // ---------------- Fetch Associations ----------------
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!data) return;
      setAssocLoading(true);

      try {
        const semId = data?._id || data?.id || id;
        const degId = getId(data?.degree);
        const semNumber = data?.semNumber;

        // 1) Degree (best-effort: try id route, else list & pick)
        const degreeFetch = (async () => {
          try {
            if (degId) {
              // Your DegreeRoutes shows this oddly named route:
              // /get-degree-by-id/slug/:id
              const r1 = await fetch(
                `${API}/api/get-degree-by-id/slug/${encodeURIComponent(degId)}`
              );
              if (r1.ok) {
                const j1 = await r1.json();
                return j1?.data || j1;
              }
            }
          } catch {}
          try {
            // fallback: list & find
            const r2 = await fetch(`${API}/api/list-degrees?page=1&limit=5000`);
            const j2 = await r2.json();
            const arr = extractArray(j2);
            if (degId) {
              return arr.find((d) => (d._id || d.id) === degId) || null;
            }
            return null;
          } catch {
            return null;
          }
        })();

        // 2) Lookups for categories & subcategories (for name resolution)
        const catFetch = fetch(`${API}/api/all-categories`).then((r) =>
          r.json().catch(() => [])
        );
        const subcatFetch = fetch(`${API}/api/all-subcategories`).then((r) =>
          r.json().catch(() => [])
        );

        // 3) Courses (pull many then filter by semester)
        const coursesFetch = (async () => {
          try {
            const r = await fetch(
              `${API}/api/list-courses?page=1&limit=5000&sortBy=createdAt&order=desc`
            );
            const j = await r.json();
            const all = extractArray(j);
            // Match by multiple possible shapes
            const belongsToSem = (c) => {
              const cid = getId(c?.semester) || getId(c?.semester);
              if (cid && cid === semId) return true;
              // sometimes array of semester ids
              if (Array.isArray(c?.semesters) && c.semesters.length) {
                if (c.semesters.some((s) => getId(s) === semId)) return true;
              }
              // sometimes only semNumber
              if (semNumber != null && c?.semNumber != null) {
                if (Number(c.semNumber) === Number(semNumber)) return true;
              }
              // sometimes they nest semesterId
              if (c?.semesterId && getId(c.semesterId) === semId) return true;
              if (c?.semesterId && getId(c.semesterId) === semId) return true;
              return false;
            };
            const filtered = all.filter(belongsToSem);
            return filtered;
          } catch {
            return [];
          }
        })();

        // 4) Exams (pull many then filter by degree/semester)
        const examsFetch = (async () => {
          try {
            const r = await fetch(`${API}/api/list-exams?page=1&limit=5000`);
            const j = await r.json();
            const all = extractArray(j);
            const belongsTo = (e) => {
              const eSem =
                getId(e?.semester) ||
                getId(e?.semester) ||
                getId(e?.semesterId) ||
                getId(e?.semesterId);
              const eDeg =
                getId(e?.degree) ||
                getId(e?.degreeId) ||
                getId(e?.program) ||
                null;
              if (eSem && eSem === (data?._id || data?.id)) return true;
              // if only semNumber is encoded on exam
              if (
                e?.semNumber != null &&
                data?.semNumber != null &&
                Number(e.semNumber) === Number(data.semNumber)
              )
                return true;
              // fall back: if degree matches, still show (so users see nearby)
              if (degId && eDeg && eDeg === degId) return true;
              return false;
            };
            return all.filter(belongsTo);
          } catch {
            return [];
          }
        })();

        const [deg, catsRaw, subcatsRaw, courseRaw, examRaw] =
          await Promise.all([
            degreeFetch,
            catFetch,
            subcatFetch,
            coursesFetch,
            examsFetch,
          ]);

        if (!alive) return;

        setDegree(deg || null);

        // Build category & subcategory maps
        const catsArr = extractArray(catsRaw);
        const subcatsArr = extractArray(subcatsRaw);
        const catMap = {};
        catsArr.forEach((c) => {
          const id = c?._id || c?.id;
          const name = c?.name || c?.category_name || c?.title;
          if (id && name) catMap[id] = name;
        });
        const subcatMap = {};
        subcatsArr.forEach((s) => {
          const id = s?._id || s?.id;
          const name = s?.name || s?.subCategory_name || s?.title;
          if (id && name) subcatMap[id] = name;
        });

        // Normalize courses -> collect categories & subcategories
        const normCourses = (courseRaw || []).map((c) => ({
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

        const catSet = new Map(); // id -> name
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

        // Normalize exams
        const normExams = (examRaw || []).map((e) => ({
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

        setCourses(normCourses);
        setCategories(
          Array.from(catSet.entries()).map(([id, name]) => ({ id, name }))
        );
        setSubcategories(
          Array.from(subcatSet.entries()).map(([id, name]) => ({ id, name }))
        );
        setExams(normExams);
      } catch (e) {
        // swallow association errors; page still renders main data
        // but we could show a small note if needed
        console.error("Association load error:", e);
      } finally {
        if (alive) setAssocLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API, data, id]);

  // ---------------- Derived ----------------
  const createdAt = useMemo(
    () => (data?.createdAt ? new Date(data.createdAt).toLocaleString() : "—"),
    [data]
  );
  const updatedAt = useMemo(
    () => (data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"),
    [data]
  );
  const semId = data?._id || data?.id || id;

  const toggleActive = async () => {
    if (!data?._id) return;
    const nextState = !data.isActive;
    const ok = window.confirm(
      `Are you sure you want to ${nextState ? "activate" : "deactivate"} "${
        data.semester_name || `Semester ${data.semNumber || ""}`
      }"?`
    );
    if (!ok) return;

    try {
      setToggling(true);
      setMsg({ type: "", text: "" });

      const res = await fetch(
        `${API}/api/semesters/${data._id}/toggle-active`,
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
        text: `semester is now ${json.isActive ? "Active" : "Inactive"}.`,
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

  if (!data) return null;

  const updateHref = `/update-semester/${encodeURIComponent(
    data.slug || `semester-${data.semNumber || "1"}`
  )}/${data._id}`;

  return (
    <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
      <div className="max-w-7xl mx-auto bg-white p-6 md:p-8">
        {/* Title */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              semester Details
            </h1>
            <p className="text-gray-600 mt-1">
              View semester information, relations, and associations.
            </p>

            {/* ✅ semester ID under the header */}
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
              <FiHash className="text-purple-600" />
              <code className="bg-gray-100 border px-2 py-0.5 rounded">
                {semId}
              </code>
            </div>
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
              title="Update this semester"
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
            {/* ✅ semester ID inside Basic too */}
            <div className="flex items-center gap-2 text-gray-800">
              <FiHash className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">semester ID:</span>{" "}
                <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                  {semId}
                </code>
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-800">
              <FiTag className="shrink-0" />
              <span className="truncate">
                <span className="font-medium">Name:</span>{" "}
                <span className="semester_name font-bold">
                  {pretty(data.semester_name)}
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
                {pretty(data.semester_code)}
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

        {/* Planning & Relations */}
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
            {/* Degree name + id */}
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <span className="font-medium">Degree:</span>
              <span className="truncate">
                {getAny(degree, ["name", "title", "degree_name"]) || "—"}
              </span>
              <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                {getId(degree) || getId(data?.degree) || "—"}
              </code>
            </p>
          </div>

          {/* Metadata (if present) */}
          {data?.metadata ? (
            <div className="rounded-lg border p-4 md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-2">Metadata</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto">
                {JSON.stringify(data.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>

        {/* Associations */}
        <div className="mt-6 rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FiGrid /> Associations
          </h3>

          {assocLoading ? (
            <div className="text-sm text-gray-600">Loading associations…</div>
          ) : (
            <>
              {/* Categories */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Categories ({categories.length})
                </div>
                {categories.length === 0 ? (
                  <div className="text-sm text-gray-600">—</div>
                ) : (
                  <ul className="text-sm text-gray-800 space-y-1">
                    {categories.map((c) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <span className="truncate">{c.name || "Category"}</span>
                        <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                          {c.id}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Subcategories */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Subcategories ({subcategories.length})
                </div>
                {subcategories.length === 0 ? (
                  <div className="text-sm text-gray-600">—</div>
                ) : (
                  <ul className="text-sm text-gray-800 space-y-1">
                    {subcategories.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <span className="truncate">
                          {s.name || "SubCategory"}
                        </span>
                        <code className="bg-gray-100 border px-1.5 py-0.5 rounded text-xs">
                          {s.id}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Courses */}
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Courses ({courses.length})
                </div>
                {courses.length === 0 ? (
                  <div className="text-sm text-gray-600">—</div>
                ) : (
                  <ul className="text-sm text-gray-800 space-y-1">
                    {courses.map((c) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <span className="truncate">
                          {c.title}{" "}
                          <span className="text-gray-500">
                            {c.slug ? `(${c.slug})` : ""}
                          </span>
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
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Exams ({exams.length})
                </div>
                {exams.length === 0 ? (
                  <div className="text-sm text-gray-600">—</div>
                ) : (
                  <ul className="text-sm text-gray-800 space-y-1">
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
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/all-semesters"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
          >
            Back to All semesters
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

export default Singlesemester;
