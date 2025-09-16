// // src/pages/activities/CreateActivity.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import {
//   FiChevronDown,
//   FiChevronUp,
//   FiPlus,
//   FiSave,
//   FiUsers,
//   FiCalendar,
// } from "react-icons/fi";
// import globalBackendRoute from "../../config/Config.js";

// const API = globalBackendRoute;

// /** axios instance with auth + token-expiry handling */
// const api = axios.create({ baseURL: API });
// api.interceptors.request.use((config) => {
//   const t = localStorage.getItem("token");
//   if (t) config.headers.Authorization = `Bearer ${t}`;
//   return config;
// });
// api.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     const status = err?.response?.status;
//     const msg = err?.response?.data?.message || "";
//     if (status === 401 && /token expired|jwt expired/i.test(msg)) {
//       localStorage.removeItem("token");
//       window.location.assign("/login");
//     }
//     return Promise.reject(err);
//   }
// );

// /** small collapsible section */
// const Section = ({ title, children, defaultOpen = false }) => {
//   const [open, setOpen] = useState(defaultOpen);
//   return (
//     <div className="rounded-lg border">
//       <button
//         type="button"
//         onClick={() => setOpen((s) => !s)}
//         className="w-full flex items-center justify-between px-4 py-3"
//         title={open ? "Collapse" : "Expand"}
//       >
//         <span className="font-semibold text-gray-900">{title}</span>
//         {open ? <FiChevronUp /> : <FiChevronDown />}
//       </button>
//       {open ? <div className="px-4 pb-4">{children}</div> : null}
//     </div>
//   );
// };

// /** enums */
// const AUDIENCE_TYPES = ["all", "roles", "users", "contextual"];
// const ROLES = [
//   "superadmin",
//   "admin",
//   "instructor",
//   "teacher",
//   "student",
//   "author",
// ];

// function toISO(value) {
//   const v = String(value || "").trim();
//   if (!v) return undefined;
//   const d = new Date(v);
//   return isNaN(d.getTime()) ? undefined : d.toISOString();
// }

// /** --------- ID helpers for tolerant client-side filtering ---------- */
// const idOf = (val) => {
//   if (!val) return "";
//   if (typeof val === "string") return val;
//   if (typeof val === "object") return String(val._id || val.id || "");
//   return String(val);
// };

// const getCourseDegreeId = (c) =>
//   idOf(c.degree) ||
//   idOf(c.degreeId) ||
//   idOf(c.degree_id) ||
//   idOf(c.degreeRef) ||
//   "";

// const getCourseSemesterId = (c) =>
//   idOf(c.semester) ||
//   idOf(c.semesterId) ||
//   idOf(c.semester) ||
//   idOf(c.semesterId) ||
//   idOf(c.semester_ref) ||
//   "";

// /** ------------------------------------------------------------------ */

// export default function CreateActivity() {
//   const navigate = useNavigate();
//   const [msg, setMsg] = useState({ type: "", text: "" });
//   const setAlert = (type, text) => setMsg({ type, text });

//   const [saving, setSaving] = useState(false);

//   // lists
//   const [degrees, setDegrees] = useState([]);
//   const [semesters, setSemesters] = useState([]);
//   const [courses, setCourses] = useState([]);

//   // selections (arrays; all optional)
//   const [selDegreeIds, setSelDegreeIds] = useState([]);
//   const [selSemesterIds, setSelSemesterIds] = useState([]);
//   const [selCourseIds, setSelCourseIds] = useState([]);

//   // form
//   const [form, setForm] = useState({
//     title: "",
//     instructions: "",
//     audienceType: "all",
//     roles: [],
//     usersCSV: "",
//     startAt: "",
//     endAt: "",
//     allowLate: false,
//     maxMarks: 100,
//   });

//   /** load degrees once */
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const r = await api.get("/api/list-degrees", {
//           params: { page: 1, limit: 1000 },
//         });
//         if (!alive) return;
//         const list = r?.data?.data || r?.data || [];
//         setDegrees(Array.isArray(list) ? list : []);
//       } catch (e) {
//         setAlert("error", "Failed to load degrees.");
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, []);

//   /** when degrees change, load semesters for those degrees only (scoped) */
//   useEffect(() => {
//     let alive = true;
//     if (!selDegreeIds.length) {
//       setSemesters([]);
//       setSelSemesterIds([]);
//       setCourses([]);
//       setSelCourseIds([]);
//       return;
//     }
//     (async () => {
//       try {
//         const all = [];
//         for (const degId of selDegreeIds) {
//           const r = await api.get("/api/semesters", {
//             params: { page: 1, limit: 1000, degreeId: degId, degree: degId },
//           });
//           const list = r?.data?.data || r?.data || [];
//           all.push(...(Array.isArray(list) ? list : []));
//         }
//         if (!alive) return;
//         // de-dup by string _id
//         const seen = new Set();
//         const merged = all.filter((s) => {
//           const id = String(s._id || s.id || "");
//           if (!id || seen.has(id)) return false;
//           seen.add(id);
//           return true;
//         });
//         setSemesters(merged);
//         // keep only still-visible selections
//         setSelSemesterIds((prev) => prev.filter((id) => seen.has(String(id))));
//       } catch (e) {
//         if (alive) setSemesters([]);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [selDegreeIds]);

//   /** when semesters change, load courses for selected degree+semester pairs
//    * We filter client-side to guarantee correctness even if backend ignores filters.
//    */
//   useEffect(() => {
//     let alive = true;
//     if (!selDegreeIds.length || !selSemesterIds.length) {
//       setCourses([]);
//       setSelCourseIds([]);
//       return;
//     }
//     (async () => {
//       try {
//         // Try to fetch with server filters (if supported)
//         const fetched = [];
//         for (const degId of selDegreeIds) {
//           for (const semId of selSemesterIds) {
//             const r = await api.get("/api/list-courses", {
//               params: {
//                 page: 1,
//                 limit: 2000,
//                 degreeId: degId,
//                 semesterId: semId,
//               },
//             });
//             const list = r?.data?.data || r?.data || [];
//             fetched.push(...(Array.isArray(list) ? list : []));
//           }
//         }

//         // If server didn't filter, we may have duplicates + unrelated entries.
//         // Apply strict client-side filter + de-dup.
//         const allowedDegrees = new Set(selDegreeIds.map(String));
//         const allowedSemesters = new Set(selSemesterIds.map(String));

//         const seen = new Set();
//         const filtered = [];
//         for (const c of fetched) {
//           const cid = String(c._id || c.id || "");
//           if (!cid || seen.has(cid)) continue;

//           const degId = String(getCourseDegreeId(c));
//           const semId = String(getCourseSemesterId(c));

//           // Keep only courses that match BOTH a selected degree and semester
//           if (allowedDegrees.has(degId) && allowedSemesters.has(semId)) {
//             seen.add(cid);
//             filtered.push(c);
//           }
//         }

//         // Fallback: if server returned empty or nothing matched (maybe API ignores params);
//         // fetch all courses once and filter locally.
//         let finalList = filtered;
//         if (!filtered.length) {
//           const rAll = await api.get("/api/list-courses", {
//             params: { page: 1, limit: 10000 },
//           });
//           const all = (rAll?.data?.data || rAll?.data || []).filter(Boolean);
//           const seen2 = new Set();
//           finalList = all.filter((c) => {
//             const cid = String(c._id || c.id || "");
//             if (!cid || seen2.has(cid)) return false;
//             const degId = String(getCourseDegreeId(c));
//             const semId = String(getCourseSemesterId(c));
//             const ok =
//               allowedDegrees.has(degId) && allowedSemesters.has(semId);
//             if (ok) seen2.add(cid);
//             return ok;
//           });
//         }

//         if (!alive) return;
//         setCourses(finalList);
//         // keep only still-visible selections
//         const available = new Set(finalList.map((c) => String(c._id || c.id)));
//         setSelCourseIds((prev) => prev.filter((id) => available.has(String(id))));
//       } catch (e) {
//         if (alive) setCourses([]);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, [selDegreeIds, selSemesterIds]);

//   const audienceHelp = useMemo(() => {
//     switch (form.audienceType) {
//       case "all":
//         return "All users will receive this activity.";
//       case "roles":
//         return "Only the selected roles will receive this activity.";
//       case "users":
//         return "Only the specific users (comma-separated ObjectIds) will receive this.";
//       case "contextual":
//         return "Target users linked to the optional context below (degrees/semesters/courses).";
//       default:
//         return "";
//     }
//   }, [form.audienceType]);

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
//   };

//   const handleMultiSelect = (setter) => (e) => {
//     const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
//     setter(opts);
//   };

//   const toggleRole = (role) => {
//     setForm((f) => {
//       const set = new Set(f.roles || []);
//       if (set.has(role)) set.delete(role);
//       else set.add(role);
//       return { ...f, roles: Array.from(set) };
//     });
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     if (saving) return;
//     try {
//       setSaving(true);
//       setAlert("", "");

//       // Backend expects ObjectIds in `users`.
//       const users = String(form.usersCSV || "")
//         .split(",")
//         .map((t) => t.trim())
//         .filter((v) => /^[0-9a-fA-F]{24}$/.test(v));

//       const payload = {
//         title: form.title,
//         instructions: form.instructions || "",

//         audienceType: form.audienceType,
//         ...(form.audienceType === "roles" ? { roles: form.roles || [] } : {}),
//         ...(form.audienceType === "users" ? { users } : {}),

//         // Always include context so it's persisted on the Activity
//         context: {
//           degrees: selDegreeIds,
//           semesters: selSemesterIds,
//           courses: selCourseIds,
//         },

//         startAt: toISO(form.startAt),
//         endAt: toISO(form.endAt),
//         allowLate: !!form.allowLate,
//         maxMarks:
//           typeof form.maxMarks === "number"
//             ? form.maxMarks
//             : Number(form.maxMarks) || 100,

//         status: "draft",
//       };

//       await api.post("/api/create-activity", payload);
//       setAlert("success", "Activity created.");
//       navigate("/all-activities");
//     } catch (e2) {
//       setAlert(
//         "error",
//         e2?.response?.data?.error ||
//           e2?.response?.data?.message ||
//           "Failed to create activity."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6">
//       <form onSubmit={submit} className="bg-white p-4 md:p-6 rounded-lg border">
//         <div className="mb-4">
//           <h1 className="text-xl md:text-2xl font-bold text-gray-900">
//             Create Activity
//           </h1>
//           <p className="text-sm text-gray-600 mt-1">
//             Nothing here is mandatory except the title — context is optional.
//           </p>
//         </div>

//         {msg.text ? (
//           <div
//             className={`mb-4 rounded-lg px-4 py-3 text-sm ${
//               msg.type === "success"
//                 ? "bg-green-50 text-green-800 border border-green-200"
//                 : msg.type === "error"
//                 ? "bg-red-50 text-red-800 border border-red-200"
//                 : "bg-yellow-50 text-yellow-800 border border-yellow-200"
//             }`}
//           >
//             {msg.text}
//           </div>
//         ) : null}

//         {/* Basic */}
//         <Section title="Basic" defaultOpen>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <label className="text-sm text-gray-700">
//               <div className="mb-1 flex items-center gap-2">
//                 <FiPlus /> Title
//               </div>
//               <input
//                 className="w-full border rounded px-3 py-2"
//                 name="title"
//                 value={form.title}
//                 onChange={handleChange}
//                 placeholder="e.g., Term Project Proposal"
//                 required
//               />
//             </label>

//             <label className="text-sm text-gray-700 md:col-span-2">
//               <div className="mb-1">Instructions</div>
//               <textarea
//                 className="w-full border rounded px-3 py-2 h-36"
//                 name="instructions"
//                 value={form.instructions}
//                 onChange={handleChange}
//                 placeholder="Describe the activity, requirements, submission format, etc."
//               />
//             </label>
//           </div>
//         </Section>

//         {/* Audience */}
//         <Section title="Audience" defaultOpen>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <label className="text-sm text-gray-700">
//               <div className="mb-1 flex items-center gap-2">
//                 <FiUsers /> Audience Type
//               </div>
//               <select
//                 className="w-full border rounded px-3 py-2"
//                 name="audienceType"
//                 value={form.audienceType}
//                 onChange={handleChange}
//               >
//                 {AUDIENCE_TYPES.map((a) => (
//                   <option key={a} value={a}>
//                     {a}
//                   </option>
//                 ))}
//               </select>
//               <div className="text-xs text-gray-500 mt-1">{audienceHelp}</div>
//             </label>

//             {form.audienceType === "users" && (
//               <label className="text-sm text-gray-700">
//                 <div className="mb-1">Users (ObjectIds, comma-separated)</div>
//                 <input
//                   className="w-full border rounded px-3 py-2"
//                   name="usersCSV"
//                   value={form.usersCSV}
//                   onChange={handleChange}
//                   placeholder="e.g., 65ab...f1, 64cd...9a"
//                 />
//               </label>
//             )}

//             {form.audienceType === "roles" && (
//               <div className="text-sm text-gray-700 md:col-span-2">
//                 <div className="mb-1">Roles</div>
//                 <div className="flex flex-wrap gap-3">
//                   {ROLES.map((r) => (
//                     <label key={r} className="inline-flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         checked={(form.roles || []).includes(r)}
//                         onChange={() => toggleRole(r)}
//                       />
//                       <span>{r}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </Section>

//         {/* Context (OPTIONAL) */}
//         <Section title="Context (optional)">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <label className="text-sm text-gray-700">
//               <div className="mb-1">Degrees (multi-select)</div>
//               <select
//                 multiple
//                 className="w-full border rounded px-3 py-2 h-40"
//                 value={selDegreeIds}
//                 onChange={handleMultiSelect(setSelDegreeIds)}
//               >
//                 {degrees.map((d) => (
//                   <option key={d._id || d.id} value={d._id || d.id}>
//                     {d.name || d.title || "Degree"}
//                   </option>
//                 ))}
//               </select>
//               <div className="text-xs text-gray-500 mt-1">
//                 Leave empty if you don’t want to scope by degree.
//               </div>
//             </label>

//             <label className="text-sm text-gray-700">
//               <div className="mb-1">Semesters (multi-select)</div>
//               <select
//                 multiple
//                 className="w-full border rounded px-3 py-2 h-40"
//                 value={selSemesterIds}
//                 onChange={handleMultiSelect(setSelSemesterIds)}
//                 disabled={!selDegreeIds.length}
//                 title={!selDegreeIds.length ? "Select degree(s) first" : ""}
//               >
//                 {semesters.map((s) => {
//                   const label =
//                     s.title ||
//                     s.semester_name ||
//                     (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
//                     "Semester";
//                   return (
//                     <option key={s._id || s.id} value={s._id || s.id}>
//                       {label}
//                     </option>
//                   );
//                 })}
//               </select>
//               <div className="text-xs text-gray-500 mt-1">
//                 Optional. Shown after you pick at least one degree.
//               </div>
//             </label>

//             <label className="text-sm text-gray-700 md:col-span-2">
//               <div className="mb-1">Courses (multi-select)</div>
//               <select
//                 multiple
//                 className="w-full border rounded px-3 py-2 h-40"
//                 value={selCourseIds}
//                 onChange={handleMultiSelect(setSelCourseIds)}
//                 disabled={!selDegreeIds.length || !selSemesterIds.length}
//                 title={
//                   !selDegreeIds.length || !selSemesterIds.length
//                     ? "Pick degree(s) and semester(s) first"
//                     : ""
//                 }
//               >
//                 {courses.map((c) => (
//                   <option key={c._id || c.id} value={c._id || c.id}>
//                     {c.title || c.name || "Course"}
//                   </option>
//                 ))}
//               </select>
//               <div className="text-xs text-gray-500 mt-1">
//                 Optional. Requires degree(s) and semester(s).
//               </div>
//             </label>
//           </div>

//           <div className="text-xs text-gray-600 mt-2">
//             These are optional. If you set{" "}
//             <span className="font-medium">Audience Type</span> to{" "}
//             <span className="font-medium">contextual</span>, only users matching
//             the selected degree/semester/course will be targeted.
//           </div>
//         </Section>

//         {/* Timing & grading */}
//         <Section title="Timing & Grading" defaultOpen>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <label className="text-sm text-gray-700">
//               <div className="mb-1 flex items-center gap-2">
//                 <FiCalendar /> Start At
//               </div>
//               <input
//                 type="datetime-local"
//                 className="w-full border rounded px-3 py-2"
//                 name="startAt"
//                 value={form.startAt}
//                 onChange={handleChange}
//               />
//             </label>

//             <label className="text-sm text-gray-700">
//               <div className="mb-1 flex items-center gap-2">
//                 <FiCalendar /> End At (deadline)
//               </div>
//               <input
//                 type="datetime-local"
//                 className="w-full border rounded px-3 py-2"
//                 name="endAt"
//                 value={form.endAt}
//                 onChange={handleChange}
//               />
//             </label>

//             <label className="text-sm text-gray-700 flex items-center gap-2 mt-7">
//               <input
//                 type="checkbox"
//                 name="allowLate"
//                 checked={form.allowLate}
//                 onChange={handleChange}
//               />
//               <span>Allow late submissions</span>
//             </label>

//             <label className="text-sm text-gray-700">
//               <div className="mb-1">Max Marks</div>
//               <input
//                 type="number"
//                 min="0"
//                 className="w-full border rounded px-3 py-2"
//                 name="maxMarks"
//                 value={form.maxMarks}
//                 onChange={handleChange}
//               />
//             </label>
//           </div>
//         </Section>

//         {/* Footer */}
//         <div className="mt-6">
//           <button
//             type="submit"
//             disabled={saving}
//             className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
//               saving ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
//             }`}
//             title="Create activity"
//           >
//             <FiSave />
//             {saving ? "Saving…" : "Create Activity"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

// till here original. 

// 

// src/pages/activities/CreateActivity.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiSave,
  FiUsers,
  FiCalendar,
} from "react-icons/fi";
import globalBackendRoute from "../../config/Config.js";

const API = globalBackendRoute;

/** axios instance with auth + token-expiry handling */
const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || "";
    if (status === 401 && /token expired|jwt expired/i.test(msg)) {
      localStorage.removeItem("token");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

/** small collapsible section */
const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-3"
        title={open ? "Collapse" : "Expand"}
      >
        <span className="font-semibold text-gray-900">{title}</span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
};

/** enums */
const AUDIENCE_TYPES = ["contextual", "all", "roles", "users"]; // default first
const ROLES = [
  "superadmin",
  "admin",
  "instructor",
  "teacher",
  "student",
  "author",
];

function toISO(value) {
  const v = String(value || "").trim();
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** --------- ID helpers for tolerant client-side filtering ---------- */
const idOf = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return String(val._id || val.id || "");
  return String(val);
};

const getCourseDegreeId = (c) =>
  idOf(c.degree) || idOf(c.degreeId) || idOf(c.degree_id) || idOf(c.degreeRef) || "";

const getCourseSemesterId = (c) =>
  idOf(c.semester) ||
  idOf(c.semesterId) ||
  idOf(c.semester_ref) ||
  "";

/** ------------------------------------------------------------------ */

export default function CreateActivity() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState({ type: "", text: "" });
  const setAlert = (type, text) => setMsg({ type, text });

  const [saving, setSaving] = useState(false);

  // lists
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);

  // selections (arrays)
  const [selDegreeIds, setSelDegreeIds] = useState([]);
  const [selSemesterIds, setSelSemesterIds] = useState([]);
  const [selCourseIds, setSelCourseIds] = useState([]);

  // form
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    audienceType: "contextual", // 🔑 default to contextual for Degree+Semester scoping
    roles: [],
    usersCSV: "",
    startAt: "",
    endAt: "",
    allowLate: false,
    maxMarks: 100,
    publishNow: true, // 🔑 publish immediately so assignments are created on save
  });

  /** load degrees once */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/list-degrees", {
          params: { page: 1, limit: 1000 },
        });
        if (!alive) return;
        const list = r?.data?.data || r?.data || [];
        setDegrees(Array.isArray(list) ? list : []);
      } catch (e) {
        setAlert("error", "Failed to load degrees.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** when degrees change, load semesters for those degrees only (scoped) */
  useEffect(() => {
    let alive = true;
    if (!selDegreeIds.length) {
      setSemesters([]);
      setSelSemesterIds([]);
      setCourses([]);
      setSelCourseIds([]);
      return;
    }
    (async () => {
      try {
        const all = [];
        for (const degId of selDegreeIds) {
          const r = await api.get("/api/semesters", {
            params: { page: 1, limit: 1000, degreeId: degId, degree: degId },
          });
          const list = r?.data?.data || r?.data || [];
          all.push(...(Array.isArray(list) ? list : []));
        }
        if (!alive) return;
        // de-dup by string _id
        const seen = new Set();
        const merged = all.filter((s) => {
          const id = String(s._id || s.id || "");
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        setSemesters(merged);
        // keep only still-visible selections
        setSelSemesterIds((prev) => prev.filter((id) => seen.has(String(id))));
      } catch (e) {
        if (alive) setSemesters([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selDegreeIds]);

  /** when semesters change, load courses for selected degree+semester pairs */
  useEffect(() => {
    let alive = true;
    if (!selDegreeIds.length || !selSemesterIds.length) {
      setCourses([]);
      setSelCourseIds([]);
      return;
    }
    (async () => {
      try {
        // Try to fetch with filters
        const fetched = [];
        for (const degId of selDegreeIds) {
          for (const semId of selSemesterIds) {
            const r = await api.get("/api/list-courses", {
              params: {
                page: 1,
                limit: 2000,
                degreeId: degId,
                semesterId: semId,
              },
            });
            const list = r?.data?.data || r?.data || [];
            fetched.push(...(Array.isArray(list) ? list : []));
          }
        }

        // De-dup + strict filter
        const allowedDegrees = new Set(selDegreeIds.map(String));
        const allowedSemesters = new Set(selSemesterIds.map(String));

        const seen = new Set();
        const filtered = [];
        for (const c of fetched) {
          const cid = String(c._id || c.id || "");
          if (!cid || seen.has(cid)) continue;

          const degId = String(getCourseDegreeId(c));
          const semId = String(getCourseSemesterId(c));

          if (allowedDegrees.has(degId) && allowedSemesters.has(semId)) {
            seen.add(cid);
            filtered.push(c);
          }
        }

        // Fallback to all
        let finalList = filtered;
        if (!filtered.length) {
          const rAll = await api.get("/api/list-courses", {
            params: { page: 1, limit: 10000 },
          });
          const all = (rAll?.data?.data || rAll?.data || []).filter(Boolean);
          const seen2 = new Set();
          finalList = all.filter((c) => {
            const cid = String(c._id || c.id || "");
            if (!cid || seen2.has(cid)) return false;
            const degId = String(getCourseDegreeId(c));
            const semId = String(getCourseSemesterId(c));
            const ok =
              allowedDegrees.has(degId) && allowedSemesters.has(semId);
            if (ok) seen2.add(cid);
            return ok;
          });
        }

        if (!alive) return;
        setCourses(finalList);
        const available = new Set(finalList.map((c) => String(c._id || c.id)));
        setSelCourseIds((prev) => prev.filter((id) => available.has(String(id))));
      } catch (e) {
        if (alive) setCourses([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selDegreeIds, selSemesterIds]);

  const audienceHelp = useMemo(() => {
    switch (form.audienceType) {
      case "contextual":
        return "Target users linked to the context below (degrees/semesters/courses).";
      case "all":
        return "All users will receive this activity.";
      case "roles":
        return "Only the selected roles will receive this activity.";
      case "users":
        return "Only the specific users (comma-separated ObjectIds) will receive this.";
      default:
        return "";
    }
  }, [form.audienceType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleMultiSelect = (setter) => (e) => {
    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
    setter(opts);
  };

  const toggleRole = (role) => {
    setForm((f) => {
      const set = new Set(f.roles || []);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      return { ...f, roles: Array.from(set) };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // 🔒 Enforce Degree + Semester when contextual
    if (form.audienceType === "contextual") {
      if (!selDegreeIds.length) {
        setAlert("error", "Select at least one Degree.");
        return;
      }
      if (!selSemesterIds.length) {
        setAlert("error", "Select at least one Semester.");
        return;
      }
    }

    try {
      setSaving(true);
      setAlert("", "");

      // Backend expects ObjectIds in `users`.
      const users = String(form.usersCSV || "")
        .split(",")
        .map((t) => t.trim())
        .filter((v) => /^[0-9a-fA-F]{24}$/.test(v));

      const payload = {
        title: form.title,
        instructions: form.instructions || "",

        audienceType: form.audienceType,
        ...(form.audienceType === "roles" ? { roles: form.roles || [] } : {}),
        ...(form.audienceType === "users" ? { users } : {}),

        // 🔑 Always include context so it persists on Activity
        context: {
          degrees: selDegreeIds,
          semesters: selSemesterIds,
          courses: selCourseIds,
        },

        startAt: toISO(form.startAt),
        endAt: toISO(form.endAt),
        allowLate: !!form.allowLate,
        maxMarks:
          typeof form.maxMarks === "number"
            ? form.maxMarks
            : Number(form.maxMarks) || 100,

        // 🔑 Signal server to publish & fan-out assignments on create
        publishNow: !!form.publishNow,
      };

      await api.post("/api/create-activity", payload);
      setAlert("success", "Activity created.");
      navigate("/all-activities");
    } catch (e2) {
      setAlert(
        "error",
        e2?.response?.data?.error ||
          e2?.response?.data?.message ||
          "Failed to create activity."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6">
      <form onSubmit={submit} className="bg-white p-4 md:p-6 rounded-lg border">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Create Activity
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Link activities to existing Degree & Semester so students see them in the right term.
          </p>
        </div>

        {msg.text ? (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              msg.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : msg.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        {/* Basic */}
        <Section title="Basic" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiPlus /> Title
              </div>
              <input
                className="w-full border rounded px-3 py-2"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., Phase 1 Project Review"
                required
              />
            </label>

            <label className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">Instructions</div>
              <textarea
                className="w-full border rounded px-3 py-2 h-36"
                name="instructions"
                value={form.instructions}
                onChange={handleChange}
                placeholder="Describe requirements, submission format, etc."
              />
            </label>
          </div>
        </Section>

        {/* Audience */}
        <Section title="Audience" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiUsers /> Audience Type
              </div>
              <select
                className="w-full border rounded px-3 py-2"
                name="audienceType"
                value={form.audienceType}
                onChange={handleChange}
              >
                {AUDIENCE_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">{audienceHelp}</div>
            </label>

            {form.audienceType === "users" && (
              <label className="text-sm text-gray-700">
                <div className="mb-1">Users (ObjectIds, comma-separated)</div>
                <input
                  className="w-full border rounded px-3 py-2"
                  name="usersCSV"
                  value={form.usersCSV}
                  onChange={handleChange}
                  placeholder="e.g., 65ab...f1, 64cd...9a"
                />
              </label>
            )}

            {form.audienceType === "roles" && (
              <div className="text-sm text-gray-700 md:col-span-2">
                <div className="mb-1">Roles</div>
                <div className="flex flex-wrap gap-3">
                  {ROLES.map((r) => (
                    <label key={r} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(form.roles || []).includes(r)}
                        onChange={() => toggleRole(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Context (REQUIRED when contextual) */}
        <Section title="Context (Degree & Semester)" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1">
                Degrees (multi-select) {form.audienceType === "contextual" && <span className="text-rose-600">*</span>}
              </div>
              <select
                multiple
                className="w-full border rounded px-3 py-2 h-40"
                value={selDegreeIds}
                onChange={handleMultiSelect(setSelDegreeIds)}
                required={form.audienceType === "contextual"}
              >
                {degrees.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name || d.title || "Degree"}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Select at least one Degree when using “contextual”.
              </div>
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">
                Semesters (multi-select) {form.audienceType === "contextual" && <span className="text-rose-600">*</span>}
              </div>
              <select
                multiple
                className="w-full border rounded px-3 py-2 h-40"
                value={selSemesterIds}
                onChange={handleMultiSelect(setSelSemesterIds)}
                disabled={!selDegreeIds.length}
                title={!selDegreeIds.length ? "Select degree(s) first" : ""}
                required={form.audienceType === "contextual"}
              >
                {semesters.map((s) => {
                  const label =
                    s.title ||
                    s.name ||
                    s.semester_name ||
                    (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                    "Semester";
                  return (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Select at least one Semester when using “contextual”.
              </div>
            </label>

            <label className="text-sm text-gray-700 md:col-span-2">
              <div className="mb-1">Courses (optional, multi-select)</div>
              <select
                multiple
                className="w-full border rounded px-3 py-2 h-40"
                value={selCourseIds}
                onChange={handleMultiSelect(setSelCourseIds)}
                disabled={!selDegreeIds.length || !selSemesterIds.length}
                title={
                  !selDegreeIds.length || !selSemesterIds.length
                    ? "Pick degree(s) and semester(s) first"
                    : ""
                }
              >
                {courses.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || "Course"}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Optional. Activities are shown by Degree & Semester regardless of course.
              </div>
            </label>
          </div>
        </Section>

        {/* Timing & grading */}
        <Section title="Timing & Grading" defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiCalendar /> Start At
              </div>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                name="startAt"
                value={form.startAt}
                onChange={handleChange}
              />
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1 flex items-center gap-2">
                <FiCalendar /> End At (deadline)
              </div>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                name="endAt"
                value={form.endAt}
                onChange={handleChange}
              />
            </label>

            <label className="text-sm text-gray-700 flex items-center gap-2 mt-7">
              <input
                type="checkbox"
                name="allowLate"
                checked={form.allowLate}
                onChange={handleChange}
              />
              <span>Allow late submissions</span>
            </label>

            <label className="text-sm text-gray-700">
              <div className="mb-1">Max Marks</div>
              <input
                type="number"
                min="0"
                className="w-full border rounded px-3 py-2"
                name="maxMarks"
                value={form.maxMarks}
                onChange={handleChange}
              />
            </label>

            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input
                type="checkbox"
                name="publishNow"
                checked={form.publishNow}
                onChange={handleChange}
              />
              <span>Publish now (create assignments)</span>
            </label>
          </div>
        </Section>

        {/* Footer */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
              saving ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"
            }`}
            title="Create activity"
          >
            <FiSave />
            {saving ? "Saving…" : "Create Activity"}
          </button>
        </div>
      </form>
    </div>
  );
}
