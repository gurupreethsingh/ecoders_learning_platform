// // src/pages/semister_pages/CreateSemister.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import globalBackendRoute from "../../config/Config";
// import {
//   FiSave,
//   FiX,
//   FiAlertTriangle,
//   FiCheckCircle,
//   FiCalendar,
//   FiHash,
//   FiLayers,
//   FiBookOpen,
//   FiChevronDown,
//   FiInfo,
// } from "react-icons/fi";

// const API = globalBackendRoute;

// const slugify = (s = "") =>
//   s
//     .toLowerCase()
//     .trim()
//     .replace(/\s+/g, "-")
//     .replace(/[^a-z0-9-]/g, "")
//     .replace(/-+/g, "-");

// export default function CreateSemister() {
//   const navigate = useNavigate();

//   // degrees + counts
//   const [degLoading, setDegLoading] = useState(true);
//   const [degError, setDegError] = useState("");
//   const [degrees, setDegrees] = useState([]); // will hold merged { ...degree, currentSemCount }

//   // ui messages
//   const [msg, setMsg] = useState({ type: "", text: "" });

//   // form state
//   const [saving, setSaving] = useState(false);
//   const [slugTouched, setSlugTouched] = useState(false);
//   const [form, setForm] = useState({
//     degreeId: "",
//     semNumber: "",
//     semister_name: "",
//     semister_code: "",
//     slug: "",
//     description: "",
//     academicYear: "",
//     startDate: "",
//     endDate: "",
//     totalCredits: "",
//     totalCoursesPlanned: "",
//     isActive: true,
//     metadataText: "",
//   });

//   // fetch degrees + semister counts together
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         setDegLoading(true);
//         setDegError("");

//         const qs = new URLSearchParams({
//           page: "1",
//           limit: "200",
//           sortBy: "name",
//           sortDir: "asc",
//           active: "true",
//         });

//         const [degRes, countRes] = await Promise.all([
//           fetch(`${API}/api/list-degrees?${qs.toString()}`),
//           fetch(`${API}/api/semisters/counts/by-degree`),
//         ]);

//         const degJson = await degRes.json();
//         if (!degRes.ok)
//           throw new Error(degJson?.message || "Failed to load degrees");

//         const countJson = await countRes.json();
//         if (!countRes.ok)
//           throw new Error(
//             countJson?.message || "Failed to load semister counts"
//           );

//         if (!alive) return;

//         const rows = Array.isArray(degJson?.data) ? degJson.data : [];
//         const countsArr = Array.isArray(countJson) ? countJson : []; // [{ _id: degreeId, count: N }]

//         const countIndex = countsArr.reduce((acc, row) => {
//           if (row && row._id) acc[String(row._id)] = Number(row.count || 0);
//           return acc;
//         }, {});

//         const merged = rows.map((d) => ({
//           ...d,
//           currentSemCount: countIndex[String(d._id)] || 0,
//         }));

//         setDegrees(merged);

//         if (!merged.length) {
//           setDegError(
//             "No degrees found. Please create a Degree before adding a semister."
//           );
//         }
//       } catch (e) {
//         setDegError(e.message || "Failed to load degrees / counts.");
//       } finally {
//         if (alive) setDegLoading(false);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, []);

//   // auto-suggest slug from semister_name until user edits slug
//   useEffect(() => {
//     if (!slugTouched) {
//       setForm((prev) => ({ ...prev, slug: slugify(prev.semister_name) }));
//     }
//   }, [form.semister_name, slugTouched]);

//   const onChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setMsg({ type: "", text: "" });
//     setForm((prev) => ({
//       ...prev,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const onSlugChange = (e) => {
//     setSlugTouched(true);
//     onChange(e);
//   };

//   // when degree changes, auto-suggest next sem number (if blank or different degree)
//   const onDegreeChange = (e) => {
//     const nextDegreeId = e.target.value;
//     const selected = degrees.find(
//       (d) => String(d._id) === String(nextDegreeId)
//     );
//     const suggested = selected ? (selected.currentSemCount || 0) + 1 : "";

//     setMsg({ type: "", text: "" });
//     setForm((prev) => ({
//       ...prev,
//       degreeId: nextDegreeId,
//       semNumber: prev.semNumber ? prev.semNumber : suggested,
//     }));
//   };

//   // validation helpers
//   const intOrEmpty = (v) => {
//     if (v === "" || v == null) return null;
//     const n = Number(v);
//     return Number.isInteger(n) && n >= 1 ? n : "invalid";
//   };

//   const floatOrEmpty = (v) => {
//     if (v === "" || v == null) return null;
//     const n = Number(v);
//     return Number.isNaN(n) ? "invalid" : n;
//   };

//   const datesOk = useMemo(() => {
//     if (!form.startDate || !form.endDate) return true;
//     try {
//       const s = new Date(form.startDate);
//       const e = new Date(form.endDate);
//       return e >= s;
//     } catch {
//       return true;
//     }
//   }, [form.startDate, form.endDate]);

//   const canSave = useMemo(() => {
//     if (!form.degreeId) return false;
//     if (intOrEmpty(form.semNumber) === "invalid") return false;
//     if (!form.semNumber) return false;
//     if (!datesOk) return false;
//     if (saving) return false;
//     return true;
//   }, [form, datesOk, saving]);

//   const selectedDegree = useMemo(
//     () => degrees.find((d) => String(d._id) === String(form.degreeId)),
//     [degrees, form.degreeId]
//   );

//   const remainingInfo = useMemo(() => {
//     if (!selectedDegree) return null;
//     const created = Number(selectedDegree.currentSemCount || 0);
//     const planned = Number(selectedDegree.totalSemesters || 0);
//     const remaining = planned > 0 ? Math.max(0, planned - created) : null;
//     return { created, planned, remaining };
//   }, [selectedDegree]);

//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setMsg({ type: "", text: "" });

//     if (!form.degreeId) {
//       setMsg({ type: "error", text: "Please select a Degree." });
//       return;
//     }
//     const semNum = intOrEmpty(form.semNumber);
//     if (semNum === "invalid" || semNum == null) {
//       setMsg({
//         type: "error",
//         text: "Semester number must be an integer ≥ 1.",
//       });
//       return;
//     }
//     if (!datesOk) {
//       setMsg({
//         type: "error",
//         text: "End date must be on/after the Start date.",
//       });
//       return;
//     }

//     // validate metadata JSON if provided
//     let metadataParsed = undefined;
//     if (form.metadataText && form.metadataText.trim()) {
//       try {
//         metadataParsed = JSON.parse(form.metadataText);
//       } catch {
//         setMsg({ type: "error", text: "Metadata must be valid JSON." });
//         return;
//       }
//     }

//     // build payload
//     const payload = {
//       degree: form.degreeId,
//       semNumber: Number(form.semNumber),
//       isActive: form.isActive,
//     };

//     if (form.semister_name.trim())
//       payload.semister_name = form.semister_name.trim();
//     if (form.semister_code.trim())
//       payload.semister_code = form.semister_code.trim();
//     if (form.slug.trim()) payload.slug = form.slug.trim();
//     if (form.description.trim()) payload.description = form.description;
//     if (form.academicYear.trim()) payload.academicYear = form.academicYear;

//     if (form.startDate) payload.startDate = form.startDate;
//     if (form.endDate) payload.endDate = form.endDate;

//     const credits = floatOrEmpty(form.totalCredits);
//     if (credits !== null && credits !== "invalid")
//       payload.totalCredits = credits;

//     const courses = intOrEmpty(form.totalCoursesPlanned);
//     if (courses !== null && courses !== "invalid")
//       payload.totalCoursesPlanned = courses;

//     if (metadataParsed !== undefined) payload.metadata = metadataParsed;

//     try {
//       setSaving(true);
//       const res = await fetch(`${API}/api/semisters`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const json = await res.json();
//       if (!res.ok) {
//         throw new Error(
//           json?.message ||
//             "Failed to create semister. Check the fields and try again."
//         );
//       }

//       setMsg({
//         type: "success",
//         text: "Semister created successfully.",
//       });

//       // After create: update local counts so labels/next suggestion stay accurate
//       setDegrees((prev) =>
//         prev.map((d) =>
//           String(d._id) === String(form.degreeId)
//             ? { ...d, currentSemCount: (d.currentSemCount || 0) + 1 }
//             : d
//         )
//       );

//       // Reset form but keep degree & suggest next number
//       const newSelected = degrees.find(
//         (d) => String(d._id) === String(form.degreeId)
//       );
//       const nextSem = newSelected ? (newSelected.currentSemCount || 0) + 1 : "";

//       setForm((prev) => ({
//         ...prev,
//         semNumber: nextSem,
//         semister_name: "",
//         semister_code: "",
//         slug: "",
//         description: "",
//         academicYear: "",
//         startDate: "",
//         endDate: "",
//         totalCredits: "",
//         totalCoursesPlanned: "",
//         isActive: true,
//         metadataText: "",
//       }));
//       setSlugTouched(false);
//     } catch (e2) {
//       setMsg({ type: "error", text: e2.message || "Something went wrong." });
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="max-w-7xl mx-auto w-full px-5 md:px-8 py-8">
//       <div className="max-w-4xl mx-auto bg-white p-6 md:p-8">
//         {/* Header */}
//         <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
//           <div>
//             <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
//               Create Semister
//             </h1>
//             <p className="text-gray-600 mt-1">
//               Add a new semister and link it to an existing degree.
//             </p>
//           </div>
//           <div className="flex gap-2">
//             <Link
//               to="/all-semisters"
//               className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
//             >
//               View All
//             </Link>
//           </div>
//         </div>

//         {/* Degree loader / errors */}
//         {degLoading ? (
//           <div className="mt-4 text-sm text-gray-700">Loading degrees…</div>
//         ) : degError ? (
//           <div className="mt-4 rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
//             {degError}{" "}
//             <Link className="underline ml-1" to="/all-degrees">
//               Manage Degrees
//             </Link>
//           </div>
//         ) : null}

//         {/* Alerts */}
//         {msg.text ? (
//           <div
//             className={`mt-4 rounded-lg px-4 py-3 text-sm ${
//               msg.type === "success"
//                 ? "bg-green-50 text-green-800 border border-green-200"
//                 : "bg-red-50 text-red-800 border border-red-200"
//             }`}
//           >
//             {msg.type === "success" ? (
//               <FiCheckCircle className="inline mr-2" />
//             ) : (
//               <FiAlertTriangle className="inline mr-2" />
//             )}
//             {msg.text}
//           </div>
//         ) : null}

//         {/* Form */}
//         <form onSubmit={onSubmit} className="mt-6 space-y-6">
//           {/* Degree + sem number */}
//           <div className="rounded-lg border p-4">
//             <h2 className="font-semibold text-gray-900 mb-3">Association</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-800">
//                   Degree *
//                 </label>
//                 <div className="relative mt-2">
//                   <select
//                     name="degreeId"
//                     value={form.degreeId}
//                     onChange={onDegreeChange}
//                     required
//                     disabled={degLoading || !!degError}
//                     className="w-full appearance-none rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 bg-white"
//                   >
//                     <option value="">Select a degree…</option>
//                     {degrees.map((d) => {
//                       const created = d.currentSemCount || 0;
//                       const planned = d.totalSemesters || 0;
//                       return (
//                         <option key={d._id} value={d._id}>
//                           {d.name} {d.code ? `(${d.code})` : ""}{" "}
//                           {d.level ? `– ${d.level}` : ""} • {created} /{" "}
//                           {planned} semesters
//                         </option>
//                       );
//                     })}
//                   </select>
//                   <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                 </div>
//                 <p className="text-xs text-gray-500 mt-1">
//                   A semister must belong to a degree.
//                 </p>

//                 {/* dynamic info for selected degree */}
//                 {selectedDegree ? (
//                   <div className="mt-3 text-sm text-gray-800 flex items-start gap-2">
//                     <FiInfo className="mt-0.5 text-gray-500" />
//                     <div>
//                       <div>
//                         <span className="font-medium">Created:</span>{" "}
//                         {remainingInfo?.created ?? 0}
//                       </div>
//                       <div>
//                         <span className="font-medium">Planned total:</span>{" "}
//                         {remainingInfo?.planned ?? "—"}
//                       </div>
//                       <div>
//                         <span className="font-medium">Remaining:</span>{" "}
//                         {remainingInfo?.remaining ?? "—"}
//                       </div>
//                     </div>
//                   </div>
//                 ) : null}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-800">
//                   Semester Number *
//                 </label>
//                 <div className="mt-2 flex items-center gap-2">
//                   <input
//                     name="semNumber"
//                     type="number"
//                     min="1"
//                     step="1"
//                     value={form.semNumber}
//                     onChange={onChange}
//                     required
//                     className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     placeholder="e.g., 1"
//                   />
//                   <FiLayers className="text-gray-400" />
//                 </div>
//                 {selectedDegree && (
//                   <p className="text-xs text-gray-500 mt-1">
//                     Suggested next: {(selectedDegree.currentSemCount || 0) + 1}
//                     {selectedDegree.totalSemesters
//                       ? ` (of ${selectedDegree.totalSemesters})`
//                       : ""}
//                   </p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Basic */}
//           <div className="rounded-lg border p-4">
//             <h2 className="font-semibold text-gray-900 mb-3">Basic</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-800">
//                   Semister Name
//                 </label>
//                 <div className="mt-2 flex items-center gap-2">
//                   <input
//                     name="semister_name"
//                     type="text"
//                     value={form.semister_name}
//                     onChange={onChange}
//                     className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     placeholder="e.g., Semester 1 or Fall 2025"
//                   />
//                   <FiBookOpen className="text-gray-400" />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-800">
//                   Semister Code
//                 </label>
//                 <div className="mt-2 flex items-center gap-2">
//                   <input
//                     name="semister_code"
//                     type="text"
//                     value={form.semister_code}
//                     onChange={onChange}
//                     className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     placeholder="Optional short code"
//                   />
//                   <FiHash className="text-gray-400" />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-800">
//                   Slug
//                 </label>
//                 <div className="mt-2 flex items-center gap-2">
//                   <input
//                     name="slug"
//                     type="text"
//                     value={form.slug}
//                     onChange={onSlugChange}
//                     className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     placeholder="auto from name (editable)"
//                   />
//                   <FiLayers className="text-gray-400" />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-800">
//                   Academic Year
//                 </label>
//                 <input
//                   name="academicYear"
//                   type="text"
//                   value={form.academicYear}
//                   onChange={onChange}
//                   className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                   placeholder="e.g., 2025-2026"
//                 />
//               </div>
//             </div>

//             <div className="mt-4">
//               <label className="block text-sm font-medium text-gray-800">
//                 Description
//               </label>
//               <textarea
//                 name="description"
//                 rows={4}
//                 value={form.description}
//                 onChange={onChange}
//                 className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                 placeholder="Short overview of this semister…"
//               />
//             </div>
//           </div>

//           {/* Dates & Planning */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="rounded-lg border p-4">
//               <h3 className="font-semibold text-gray-900 mb-2">Dates</h3>
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-800">
//                     Start Date
//                   </label>
//                   <div className="mt-2 flex items-center gap-2">
//                     <input
//                       name="startDate"
//                       type="date"
//                       value={form.startDate}
//                       onChange={onChange}
//                       className="w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     />
//                     <FiCalendar className="text-gray-400" />
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-800">
//                     End Date
//                   </label>
//                   <div className="mt-2 flex items-center gap-2">
//                     <input
//                       name="endDate"
//                       type="date"
//                       value={form.endDate}
//                       onChange={onChange}
//                       className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 focus:ring-0 ${
//                         datesOk
//                           ? "border-gray-300 focus:border-gray-400"
//                           : "border-red-300 focus:border-red-400"
//                       }`}
//                     />
//                     <FiCalendar className="text-gray-400" />
//                   </div>
//                   {!datesOk && (
//                     <p className="text-xs text-red-600 mt-1">
//                       End date must be on/after the start date.
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="rounded-lg border p-4">
//               <h3 className="font-semibold text-gray-900 mb-2">Planning</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-800">
//                     Total Credits
//                   </label>
//                   <input
//                     name="totalCredits"
//                     type="number"
//                     step="0.5"
//                     value={form.totalCredits}
//                     onChange={onChange}
//                     className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     placeholder="e.g., 20"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-800">
//                     Planned Courses
//                   </label>
//                   <input
//                     name="totalCoursesPlanned"
//                     type="number"
//                     step="1"
//                     value={form.totalCoursesPlanned}
//                     onChange={onChange}
//                     className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
//                     placeholder="e.g., 6"
//                   />
//                 </div>
//               </div>

//               <div className="mt-4 flex items-center gap-2">
//                 <input
//                   id="isActive"
//                   name="isActive"
//                   type="checkbox"
//                   checked={form.isActive}
//                   onChange={onChange}
//                   className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
//                 />
//                 <label htmlFor="isActive" className="text-sm text-gray-800">
//                   Active
//                 </label>
//               </div>
//             </div>
//           </div>

//           {/* Metadata */}
//           <div className="rounded-lg border p-4">
//             <h3 className="font-semibold text-gray-900 mb-2">Metadata</h3>
//             <textarea
//               name="metadataText"
//               rows={6}
//               value={form.metadataText}
//               onChange={onChange}
//               className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900 font-mono text-xs"
//               placeholder='Optional JSON, e.g. { "note": "special batch" }'
//             />
//             <p className="text-xs text-gray-500 mt-1">
//               Leave empty if not needed.
//             </p>
//           </div>

//           {/* Actions */}
//           <div className="flex flex-wrap gap-3">
//             <button
//               type="submit"
//               disabled={!canSave}
//               className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-white text-sm font-semibold ${
//                 canSave
//                   ? "bg-gray-900 hover:bg-gray-800"
//                   : "bg-gray-400 cursor-not-allowed"
//               }`}
//             >
//               <FiSave className="h-4 w-4" />
//               {saving ? "Saving…" : "Create Semister"}
//             </button>

//             <button
//               type="button"
//               onClick={() => {
//                 setMsg({ type: "", text: "" });
//                 setForm({
//                   degreeId: "",
//                   semNumber: "",
//                   semister_name: "",
//                   semister_code: "",
//                   slug: "",
//                   description: "",
//                   academicYear: "",
//                   startDate: "",
//                   endDate: "",
//                   totalCredits: "",
//                   totalCoursesPlanned: "",
//                   isActive: true,
//                   metadataText: "",
//                 });
//                 setSlugTouched(false);
//               }}
//               className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
//             >
//               <FiX className="h-4 w-4" /> Reset
//             </button>

//             <Link
//               to="/all-semisters"
//               className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-gray-900 text-sm font-semibold border hover:bg-gray-50"
//             >
//               View All
//             </Link>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

//

// src/pages/semister_pages/CreateSemister.jsx
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
import globalBackendRoute from "../../config/Config";

const API = globalBackendRoute;

const numberOrEmpty = (v) => (v === "" || v === null ? "" : Number(v));
const isValidInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 1;

export default function CreateSemister() {
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
    semister_name: "",
    semister_code: "",
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
          fetch(`${API}/api/semisters/counts/by-degree`),
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
          throw new Error(errText || "Failed to load semister counts");
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
      semister_name: form.semister_name,
      semister_code: form.semister_code,
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
      const res = await fetch(`${API}/api/semisters`, {
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
              : "Failed to create semister.")
        );
      }

      // success
      setMsg({ type: "success", text: "Semister created successfully." });

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
        semister_name: "",
        semister_code: "",
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
              Create Semister
            </h1>
            <p className="text-gray-600 mt-1">
              Add a new semister under a degree. Subtle design, fully
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
                  Semister Number *
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
                  Semister Name
                </label>
                <input
                  name="semister_name"
                  type="text"
                  value={form.semister_name}
                  onChange={onChange}
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-gray-400 focus:ring-0 px-4 py-2.5 text-gray-900"
                  placeholder="e.g., Semester 1, Fall 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800">
                  Semister Code
                </label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="semister_code"
                    type="text"
                    value={form.semister_code}
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
                placeholder="Short overview of the semister…"
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
              title="Create Semister"
            >
              <FiPlusCircle className="h-4 w-4" />
              {saving ? "Creating…" : "Create Semister"}
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
