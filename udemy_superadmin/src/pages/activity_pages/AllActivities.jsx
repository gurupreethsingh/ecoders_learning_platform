// // src/pages/activities/AllActivities.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import {
//   FaThList,
//   FaThLarge,
//   FaTh,
//   FaSearch,
//   FaTrashAlt,
//   FaCalendar,
//   FaUser,
//   FaTags,
//   FaUniversity,
//   FaClipboardList,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaBolt,
//   FaFilter,
//   FaRedoAlt,
// } from "react-icons/fa";
// import { motion } from "framer-motion";
// import axios from "axios";
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

// /** Enums (match your model) */
// const AUDIENCE_TYPES = [
//   { value: "", label: "All Types" },
//   { value: "all", label: "All Users" },
//   { value: "roles", label: "Roles" },
//   { value: "users", label: "Specific Users" },
//   { value: "contextual", label: "Contextual" },
// ];

// const STATUSES = [
//   { value: "", label: "All Statuses" },
//   { value: "draft", label: "Draft" },
//   { value: "published", label: "Published" },
//   { value: "archived", label: "Archived" },
// ];

// /** Helpers */
// const toTags = (arr) =>
//   !arr
//     ? []
//     : Array.isArray(arr)
//     ? arr
//     : String(arr)
//         .split(",")
//         .map((t) => t.trim())
//         .filter(Boolean);

// const shortId = (val) =>
//   typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

// const fmtDate = (v) =>
//   v
//     ? new Date(v).toLocaleString("en-US", {
//         year: "numeric",
//         month: "short",
//         day: "2-digit",
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "—";

// const slugify = (s) =>
//   String(s || "activity")
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "-")
//     .replace(/(^-|-$)/g, "")
//     .slice(0, 120);

// /** ---- Flexible Date Parsing ---- */
// const MONTHS = {
//   jan: 1,
//   january: 1,
//   feb: 2,
//   february: 2,
//   mar: 3,
//   march: 3,
//   apr: 4,
//   april: 4,
//   may: 5,
//   jun: 6,
//   june: 6,
//   jul: 7,
//   july: 7,
//   aug: 8,
//   august: 8,
//   sep: 9,
//   sept: 9,
//   september: 9,
//   oct: 10,
//   october: 10,
//   nov: 11,
//   november: 11,
//   dec: 12,
//   december: 12,
// };

// const stripOrdinals = (s) => s.replace(/\b(\d+)(st|nd|rd|th)\b/gi, "$1");

// const lastDayOfMonth = (y, m) => new Date(y, m, 0).getDate();

// const parseFlexibleDate = (raw, { endOfRange = false } = {}) => {
//   if (!raw) return "";
//   let s = String(raw).trim().toLowerCase();
//   if (!s) return "";

//   s = stripOrdinals(s).replace(/[,]/g, " ").replace(/\s+/g, " ").trim();

//   // Cases like "september 2025"
//   const mYear = s.match(
//     /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{4})\b/
//   );
//   if (mYear) {
//     const m = MONTHS[mYear[1].slice(0, 3)];
//     const y = parseInt(mYear[5], 10);
//     const d = endOfRange ? lastDayOfMonth(y, m) : 1;
//     return new Date(
//       Date.UTC(y, m - 1, d, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
//     ).toISOString();
//   }

//   // Month Day Year  e.g. "sep 9 2025"
//   const mdy = s.match(
//     /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{1,2})\s+(\d{4})\b/
//   );
//   if (mdy) {
//     const m = MONTHS[mdy[1].slice(0, 3)];
//     const d = parseInt(mdy[11], 10);
//     const y = parseInt(mdy[12], 10);
//     return new Date(
//       Date.UTC(y, m - 1, d, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
//     ).toISOString();
//     // groups shift depending on engine; safe fallback below if needed
//   }

//   // Day Month Year  e.g. "9 sep 2025"
//   const dmy = s.match(
//     /\b(\d{1,2})\s+(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{4})\b/
//   );
//   if (dmy) {
//     const d = parseInt(dmy[1], 10);
//     const m = MONTHS[dmy[2].slice(0, 3)];
//     const y = parseInt(dmy[12], 10);
//     return new Date(
//       Date.UTC(y, m - 1, d, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
//     ).toISOString();
//   }

//   // Numeric with separators: try yyyy-mm-dd, dd-mm-yyyy, mm-dd-yyyy (also with "/" or ".")
//   const parts = s.split(/[-/.\s]/).filter(Boolean);
//   if (parts.length >= 3) {
//     const [a, b, c] = parts.map((x) => parseInt(x, 10));
//     // yyyy-mm-dd
//     if (a > 1900 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
//       return new Date(
//         Date.UTC(a, b - 1, c, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
//       ).toISOString();
//     }
//     // dd-mm-yyyy  (unambiguous if first > 12)
//     if (
//       a >= 1 &&
//       a <= 31 &&
//       b >= 1 &&
//       b <= 12 &&
//       c > 1900 &&
//       (a > 12 || b <= 12)
//     ) {
//       return new Date(
//         Date.UTC(c, b - 1, a, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
//       ).toISOString();
//     }
//     // mm-dd-yyyy
//     if (a >= 1 && a <= 12 && b >= 1 && b <= 31 && c > 1900) {
//       return new Date(
//         Date.UTC(c, a - 1, b, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
//       ).toISOString();
//     }
//   }

//   // Plain Date.parse fallback
//   const d = new Date(s);
//   if (!isNaN(d.getTime())) {
//     return new Date(
//       Date.UTC(
//         d.getFullYear(),
//         d.getMonth(),
//         d.getDate(),
//         endOfRange ? 23 : 0,
//         endOfRange ? 59 : 0
//       )
//     ).toISOString();
//   }

//   return ""; // unparseable
// };

// /** Robust ID extraction: strings, objects, arrays */
// const normArr = (x) => (Array.isArray(x) ? x : x != null ? [x] : []);
// const extractIds = (value) =>
//   normArr(value)
//     .map((v) => {
//       if (v == null) return null;
//       if (typeof v === "string" || typeof v === "number") return String(v);
//       if (typeof v === "object")
//         return String(v._id || v.id || v.value || v.key || "");
//       return null;
//     })
//     .filter(Boolean);

// /** Normalize any context shape into arrays of STRING ids */
// const normalizeContextIds = (a) => {
//   const c = a?.context || {};
//   const degreeIds = [
//     ...extractIds(c.degrees),
//     ...extractIds(c.degreeIds),
//     ...extractIds(c.degree),
//     ...extractIds(a?.degreeId),
//     ...extractIds(a?.degree),
//   ];
//   const semesterIds = [
//     ...extractIds(c.semesters),
//     ...extractIds(c.semesterIds),
//     ...extractIds(c.semester),
//     ...extractIds(c.semester),
//     ...extractIds(a?.semesterId),
//     ...extractIds(a?.semesterId),
//   ];
//   const courseIds = [
//     ...extractIds(c.courses),
//     ...extractIds(c.courseIds),
//     ...extractIds(c.course),
//     ...extractIds(a?.courseId),
//   ];
//   return { degreeIds, semesterIds, courseIds };
// };

// export default function AllActivities() {
//   // view + search
//   const [view, setView] = useState("grid");
//   const [searchTerm, setSearchTerm] = useState("");

//   // pagination (default 6/page)
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(6);

//   // rows + meta
//   const [rows, setRows] = useState([]);
//   const [meta, setMeta] = useState({
//     page: 1,
//     limit: 6,
//     total: 0,
//     totalPages: 1,
//   });
//   const [loading, setLoading] = useState(true);
//   const [fetchError, setFetchError] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   // cascading lists
//   const [degreeList, setDegreeList] = useState([]);
//   const [semesterList, setSemisterList] = useState([]);
//   const [courseList, setCourseList] = useState([]);

//   // lookup maps
//   const [degreeMap, setDegreeMap] = useState({});
//   const [semesterMap, setSemisterMap] = useState({});
//   const [courseMap, setCourseMap] = useState({});

//   // roles (for audienceType=roles)
//   const [roleOptions, setRoleOptions] = useState([]);

//   // filters (match backend)
//   const [filters, setFilters] = useState({
//     audienceType: "",
//     roles: [], // new
//     status: "",
//     tag: "",
//     degreeId: "",
//     semesterId: "",
//     courseId: "",
//     since: "",
//     until: "",
//   });

//   // Reset pagination when inputs change
//   useEffect(() => setPage(1), [searchTerm, pageSize, filters]);

//   /** Load Degrees once */
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const r = await api.get("/api/list-degrees", {
//           params: { page: 1, limit: 1000 },
//         });
//         if (!alive) return;
//         const list = r?.data?.data || r?.data || [];
//         const arr = Array.isArray(list) ? list : [];
//         setDegreeList(arr);
//         const map = {};
//         arr.forEach((d) => {
//           const key = String(d._id || d.id);
//           map[key] = d.name || d.title || "Degree";
//         });
//         setDegreeMap(map);
//       } catch {
//         /* silent */
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, []);

//   /** Load roles for audienceType=roles */
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         const r = await api.get("/api/getUserCountsByRole");
//         // expect { data: { admin: N, student: M, ... } } or just an object
//         const obj = r?.data?.data || r?.data || {};
//         const roles = Object.keys(obj).filter(Boolean);
//         if (alive)
//           setRoleOptions(
//             roles.length
//               ? roles
//               : ["student", "instructor", "author", "admin", "superadmin"]
//           );
//       } catch {
//         if (alive)
//           setRoleOptions([
//             "student",
//             "instructor",
//             "author",
//             "admin",
//             "superadmin",
//           ]);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, []);

//   /** Degree -> Semisters */
//   useEffect(() => {
//     let alive = true;

//     // Clear downstream selections
//     setSemisterList([]);
//     setCourseList([]);
//     setFilters((f) => ({ ...f, semesterId: "", courseId: "" }));

//     if (!filters.degreeId) {
//       setSemisterMap({});
//       return;
//     }

//     (async () => {
//       try {
//         const res = await api.get("/api/semesters", {
//           params: {
//             page: 1,
//             limit: 1000,
//             degreeId: filters.degreeId,
//             degree: filters.degreeId,
//           },
//         });
//         if (!alive) return;
//         const list = res?.data?.data || res?.data || [];
//         const sl = Array.isArray(list) ? list : [];
//         setSemisterList(sl);

//         const map = {};
//         sl.forEach((s) => {
//           const key = String(s._id || s.id);
//           const label =
//             s.title ||
//             s.semester_name ||
//             (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
//             "Semester";
//           map[key] = label;
//         });
//         setSemisterMap(map);
//       } catch {
//         /* keep empty */
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filters.degreeId]);

//   /** Semister -> Courses (by Degree + Semister) */
//   useEffect(() => {
//     let alive = true;

//     setCourseList([]);
//     setFilters((f) => ({ ...f, courseId: "" }));

//     if (!filters.degreeId || !filters.semesterId) {
//       setCourseMap({});
//       return;
//     }

//     (async () => {
//       try {
//         const res = await api.get("/api/list-courses", {
//           params: {
//             page: 1,
//             limit: 1000,
//             degreeId: filters.degreeId,
//             semesterId: filters.semesterId,
//           },
//         });
//         if (!alive) return;
//         const list = res?.data?.data || res?.data || [];
//         const cl = Array.isArray(list) ? list : [];
//         setCourseList(cl);
//         const map = {};
//         cl.forEach((c) => {
//           const key = String(c._id || c.id);
//           map[key] = c.title || c.name || "Course";
//         });
//         setCourseMap(map);
//       } catch {
//         /* keep empty */
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filters.semesterId]);

//   /** Fetch Activities with active filters */
//   useEffect(() => {
//     let alive = true;
//     const ctrl = new AbortController();

//     (async () => {
//       setLoading(true);
//       setFetchError("");
//       try {
//         // parse dates just-in-time
//         const parsedSince = parseFlexibleDate(filters.since || "");
//         const parsedUntil = parseFlexibleDate(filters.until || "", {
//           endOfRange: true,
//         });

//         const params = {
//           page,
//           limit: pageSize,
//           sort: "-createdAt",
//         };

//         // text search (send to server too if supported)
//         if (searchTerm.trim()) params.q = searchTerm.trim();

//         // simple filters
//         if (filters.audienceType) params.audienceType = filters.audienceType;
//         if (filters.status) params.status = filters.status;
//         if (filters.tag) params.tag = filters.tag;

//         // roles (when audienceType=roles)
//         if (filters.audienceType === "roles" && filters.roles?.length) {
//           params.roles = filters.roles.join(",");
//         }

//         // send many common variants (backend differences)
//         if (filters.degreeId) {
//           params.degreeId = filters.degreeId;
//           params.degree = filters.degreeId;
//           params.context_degree = filters.degreeId;
//         }
//         if (filters.semesterId) {
//           params.semesterId = filters.semesterId;
//           params.semesterId = filters.semesterId;
//           params.context_semester = filters.semesterId;
//         }
//         if (filters.courseId) {
//           params.courseId = filters.courseId;
//           params.context_course = filters.courseId;
//         }

//         // date range
//         if (parsedSince) params.since = parsedSince;
//         if (parsedUntil) params.until = parsedUntil;

//         const res = await api.get("/api/list-activities", {
//           params,
//           signal: ctrl.signal,
//         });

//         let data = Array.isArray(res.data?.data) ? res.data.data : [];
//         const m = res.data?.meta || {};
//         if (!alive) return;

//         // -------- Client-side robust filtering --------
//         // 1) Context filters: only ENFORCE when the activity actually has those IDs.
//         const dId = String(filters.degreeId || "");
//         const sId = String(filters.semesterId || "");
//         const cId = String(filters.courseId || "");

//         if (
//           dId ||
//           sId ||
//           cId ||
//           (filters.audienceType === "roles" && filters.roles?.length)
//         ) {
//           data = data.filter((a) => {
//             const { degreeIds, semesterIds, courseIds } =
//               normalizeContextIds(a);

//             // Degree
//             if (dId && degreeIds.length && !degreeIds.includes(dId))
//               return false;
//             // Semester
//             if (sId && semesterIds.length && !semesterIds.includes(sId))
//               return false;
//             // Course
//             if (cId && courseIds.length && !courseIds.includes(cId))
//               return false;

//             // Roles (only if activity is a role-targeted one AND filter has roles)
//             if (
//               filters.audienceType === "roles" &&
//               filters.roles?.length &&
//               (a?.audienceType === "roles" || a?.roles?.length)
//             ) {
//               const actRoles = (a?.roles || []).map((r) =>
//                 String(r).toLowerCase()
//               );
//               const need = filters.roles.map((r) => String(r).toLowerCase());
//               if (!need.some((r) => actRoles.includes(r))) return false;
//             }
//             return true;
//           });
//         }

//         // 2) Smarter search (tokenized fuzzy includes) over many fields
//         if (searchTerm.trim()) {
//           const tokens = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

//           data = data.filter((a) => {
//             const id = String(a?._id || a?.id || "");
//             const title = String(a?.title || "").toLowerCase();
//             const instr = String(a?.instructions || "").toLowerCase();
//             const tags = toTags(a?.tags).join(" ").toLowerCase();
//             const status = String(a?.status || "").toLowerCase();
//             const author =
//               typeof a?.createdBy === "object"
//                 ? (a.createdBy?.name ||
//                     a.createdBy?.fullName ||
//                     a.createdBy?.email ||
//                     "") + ""
//                 : String(a?.createdBy || "");

//             const { degreeIds, semesterIds, courseIds } =
//               normalizeContextIds(a);
//             const degNames = degreeIds
//               .map((d) => degreeMap[d] || d)
//               .join(" ")
//               .toLowerCase();
//             const semNames = semesterIds
//               .map((s) => semesterMap[s] || s)
//               .join(" ")
//               .toLowerCase();
//             const crsNames = courseIds
//               .map((c) => courseMap[c] || c)
//               .join(" ")
//               .toLowerCase();
//             const dates = [fmtDate(a?.startAt), fmtDate(a?.endAt)]
//               .join(" ")
//               .toLowerCase();

//             const hay = [
//               id,
//               title,
//               instr,
//               tags,
//               status,
//               String(author).toLowerCase(),
//               degNames,
//               semNames,
//               crsNames,
//               dates,
//             ].join(" ");

//             return tokens.every((t) => hay.includes(t));
//           });
//         }
//         // ---------------------------------------------

//         // meta
//         const total = data.length;
//         const limit = Number(m.limit || pageSize);
//         const totalPages =
//           m.pages || m.totalPages || Math.max(1, Math.ceil(total / limit));

//         setRows(data);
//         setMeta({
//           page: Number(m.page || page),
//           limit,
//           total: Number(m.total || total),
//           totalPages: Number(totalPages),
//         });
//       } catch (err) {
//         if (!alive) return;
//         console.error("Error fetching activities:", err);
//         setFetchError(
//           "Activities not yet created or unavailable. Please add some activities."
//         );
//       } finally {
//         if (!alive) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       alive = false;
//       ctrl.abort();
//     };
//   }, [
//     page,
//     pageSize,
//     searchTerm,
//     filters,
//     refreshKey,
//     degreeMap,
//     semesterMap,
//     courseMap,
//   ]);

//   const iconStyle = {
//     list: view === "list" ? "text-blue-500" : "text-gray-500",
//     grid: view === "grid" ? "text-green-500" : "text-gray-500",
//     card: view === "card" ? "text-purple-500" : "text-gray-500",
//   };

//   const pageCountText = useMemo(() => {
//     const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
//     const end = Math.min(meta.total, meta.page * meta.limit);
//     return { start, end };
//   }, [meta]);

//   const goTo = (p) =>
//     setPage(Math.min(Math.max(1, Number(p) || 1), meta.totalPages));

//   const buildPages = () => {
//     const totalPages = meta.totalPages;
//     const currentPage = meta.page;
//     const maxBtns = 7;
//     if (totalPages <= maxBtns)
//       return Array.from({ length: totalPages }, (_, i) => i + 1);
//     const pages = [1];
//     if (currentPage > 4) pages.push("…");
//     const s = Math.max(2, currentPage - 1);
//     const e = Math.min(totalPages - 1, currentPage + 1);
//     for (let i = s; i <= e; i++) pages.push(i);
//     if (currentPage < totalPages - 3) pages.push("…");
//     pages.push(totalPages);
//     return pages;
//   };

//   /** Actions */
//   const remove = async (e, id) => {
//     e.preventDefault();
//     e.stopPropagation();
//     const ok = window.confirm(
//       `Delete this activity?\nThis will remove the activity and related assignments/submissions.`
//     );
//     if (!ok) return;
//     try {
//       const res = await api.delete(`/api/delete-activity/${id}`);
//       if (res.status >= 200 && res.status < 300) {
//         if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
//         setRefreshKey((k) => k + 1);
//         alert("Activity deleted.");
//       } else {
//         throw new Error("Failed to delete activity.");
//       }
//     } catch (err) {
//       console.error("Delete failed:", err);
//       alert(
//         err?.response?.data?.message ||
//           err?.message ||
//           "Failed to delete activity."
//       );
//     }
//   };

//   const publish = async (e, id) => {
//     e.preventDefault();
//     e.stopPropagation();
//     try {
//       const res = await api.post(`/api/publish-activity/${id}`);
//       if (res.status >= 200 && res.status < 300) {
//         setRefreshKey((k) => k + 1);
//         alert("Activity published.");
//       } else {
//         throw new Error("Publish failed");
//       }
//     } catch (err) {
//       console.error("Publish failed:", err);
//       alert(err?.response?.data?.message || err?.message || "Action failed.");
//     }
//   };

//   const archive = async (e, id) => {
//     e.preventDefault();
//     e.stopPropagation();
//     try {
//       const res = await api.post(`/api/archive-activity/${id}`);
//       if (res.status >= 200 && res.status < 300) {
//         setRefreshKey((k) => k + 1);
//         alert("Activity archived.");
//       } else {
//         throw new Error("Archive failed");
//       }
//     } catch (err) {
//       console.error("Archive failed:", err);
//       alert(err?.response?.data?.message || err?.message || "Action failed.");
//     }
//   };

//   /** Small reusable select */
//   const FilterSelect = ({
//     label,
//     value,
//     onChange,
//     options,
//     getOption,
//     disabled = false,
//     nameKeyPrefix,
//   }) => (
//     <label className="flex flex-col text-sm text-gray-700">
//       <span className="mb-1">{label}</span>
//       <select
//         className="border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         disabled={disabled}
//       >
//         <option key={`${nameKeyPrefix}-any`} value="">
//           {disabled ? "Select parent first" : "All"}
//         </option>
//         {options.map((o, idx) => {
//           const { id, name } = getOption(o);
//           const key = `${nameKeyPrefix}-${idx}-${String(id || "unknown")}`;
//           return (
//             <option key={key} value={id}>
//               {name} {id ? `(${shortId(String(id))})` : ""}
//             </option>
//           );
//         })}
//       </select>
//     </label>
//   );

//   const resetFilters = () =>
//     setFilters({
//       audienceType: "",
//       roles: [],
//       status: "",
//       tag: "",
//       degreeId: "",
//       semesterId: "",
//       courseId: "",
//       since: "",
//       until: "",
//     });

//   // roles multiselect UI
//   const toggleRole = (r) =>
//     setFilters((f) => {
//       const has = f.roles.includes(r);
//       return {
//         ...f,
//         roles: has ? f.roles.filter((x) => x !== r) : [...f.roles, r],
//       };
//     });

//   return (
//     <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
//         <div className="block-heading">
//           <h2 className="font-bold text-xl">All Activities</h2>
//         </div>

//         {/* Search */}
//         <div className="relative w-full sm:w-1/2">
//           <input
//             type="text"
//             placeholder="Search title, tags, degree/semester/course, author…"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//           />
//           <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
//         </div>

//         {/* Count + Views + page size */}
//         <div className="flex items-center space-x-4">
//           <p className="text-sm text-gray-600">
//             Showing {rows.length} of {meta.total} activities
//           </p>
//           <FaThList
//             className={`cursor-pointer ${iconStyle.list}`}
//             onClick={() => setView("list")}
//             title="List view"
//           />
//           <FaTh
//             className={`cursor-pointer ${iconStyle.card}`}
//             onClick={() => setView("card")}
//             title="Card view"
//           />
//           <FaThLarge
//             className={`cursor-pointer ${iconStyle.grid}`}
//             onClick={() => setView("grid")}
//             title="Grid view"
//           />
//           <select
//             className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
//             value={pageSize}
//             onChange={(e) => setPageSize(Number(e.target.value))}
//             title="Items per page"
//           >
//             {[3, 6, 12, 24, 48].map((n, i) => (
//               <option key={`pg-${i}-${n}`} value={n}>
//                 {n}/page
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="mb-4 p-3 rounded-lg border bg-white shadow-sm">
//         <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
//           <FaFilter />
//           Filters (cascading)
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
//           {/* Audience Type */}
//           <label className="flex flex-col text-sm text-gray-700">
//             <span className="mb-1">Audience Type</span>
//             <select
//               className="border border-gray-300 rounded px-2 py-1"
//               value={filters.audienceType}
//               onChange={(e) =>
//                 setFilters((f) => ({ ...f, audienceType: e.target.value }))
//               }
//             >
//               {AUDIENCE_TYPES.map((a, idx) => (
//                 <option
//                   key={`aud-${idx}-${a.value || "any"}-${a.label}`}
//                   value={a.value}
//                 >
//                   {a.label}
//                 </option>
//               ))}
//             </select>

//             {/* Roles selector appears when 'roles' */}
//             {filters.audienceType === "roles" && (
//               <div className="mt-2 flex flex-wrap gap-2">
//                 {roleOptions.map((r) => {
//                   const checked = filters.roles.includes(r);
//                   return (
//                     <label
//                       key={`role-${r}`}
//                       className={`px-2 py-1 rounded border cursor-pointer ${
//                         checked
//                           ? "bg-indigo-50 border-indigo-300"
//                           : "bg-white border-gray-300"
//                       }`}
//                     >
//                       <input
//                         type="checkbox"
//                         className="mr-1 align-middle"
//                         checked={checked}
//                         onChange={() => toggleRole(r)}
//                       />
//                       {r}
//                     </label>
//                   );
//                 })}
//               </div>
//             )}
//           </label>

//           {/* Status */}
//           <label className="flex flex-col text-sm text-gray-700">
//             <span className="mb-1">Status</span>
//             <select
//               className="border border-gray-300 rounded px-2 py-1"
//               value={filters.status}
//               onChange={(e) =>
//                 setFilters((f) => ({ ...f, status: e.target.value }))
//               }
//             >
//               {STATUSES.map((s, idx) => (
//                 <option
//                   key={`st-${idx}-${s.value || "any"}-${s.label}`}
//                   value={s.value}
//                 >
//                   {s.label}
//                 </option>
//               ))}
//             </select>
//           </label>

//           {/* Single Tag (text) */}
//           <label className="flex flex-col text-sm text-gray-700">
//             <span className="mb-1">Tag</span>
//             <input
//               className="border border-gray-300 rounded px-2 py-1"
//               placeholder="e.g., project"
//               value={filters.tag}
//               onChange={(e) =>
//                 setFilters((f) => ({ ...f, tag: e.target.value }))
//               }
//             />
//           </label>

//           {/* Degree */}
//           <FilterSelect
//             label="Degree"
//             value={filters.degreeId}
//             onChange={(v) => setFilters((f) => ({ ...f, degreeId: String(v) }))}
//             options={degreeList}
//             nameKeyPrefix="deg"
//             getOption={(d) => ({
//               id: String(d._id || d.id),
//               name: d.name || d.title || "Degree",
//             })}
//           />

//           {/* Semester */}
//           <FilterSelect
//             label="Semester"
//             value={filters.semesterId}
//             onChange={(v) =>
//               setFilters((f) => ({ ...f, semesterId: String(v) }))
//             }
//             options={semesterList}
//             disabled={!filters.degreeId}
//             nameKeyPrefix="sem"
//             getOption={(s) => ({
//               id: String(s._id || s.id),
//               name:
//                 s.title ||
//                 s.semester_name ||
//                 (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
//                 "Semester",
//             })}
//           />

//           {/* Course */}
//           <FilterSelect
//             label="Course"
//             value={filters.courseId}
//             onChange={(v) => setFilters((f) => ({ ...f, courseId: String(v) }))}
//             options={courseList}
//             disabled={!filters.degreeId || !filters.semesterId}
//             nameKeyPrefix="course"
//             getOption={(c) => ({
//               id: String(c._id || c.id),
//               name: c.title || c.name || "Course",
//             })}
//           />

//           {/* Date Range */}
//           <label className="flex flex-col text-sm text-gray-700">
//             <span className="mb-1">Since (any format)</span>
//             <input
//               className="border border-gray-300 rounded px-2 py-1"
//               placeholder="e.g., Sep 9th 2025 / 2025-09-09 / September 2025"
//               value={filters.since}
//               onChange={(e) =>
//                 setFilters((f) => ({ ...f, since: e.target.value }))
//               }
//               onBlur={(e) => {
//                 const parsed = parseFlexibleDate(e.target.value);
//                 if (parsed) setFilters((f) => ({ ...f, since: parsed }));
//               }}
//             />
//           </label>
//           <label className="flex flex-col text-sm text-gray-700">
//             <span className="mb-1">Until (any format)</span>
//             <input
//               className="border border-gray-300 rounded px-2 py-1"
//               placeholder="e.g., 09-12-2025 / 12-09-2025 / September 2025"
//               value={filters.until}
//               onChange={(e) =>
//                 setFilters((f) => ({ ...f, until: e.target.value }))
//               }
//               onBlur={(e) => {
//                 const parsed = parseFlexibleDate(e.target.value, {
//                   endOfRange: true,
//                 });
//                 if (parsed) setFilters((f) => ({ ...f, until: parsed }));
//               }}
//             />
//           </label>
//         </div>

//         <div className="mt-3 flex gap-2">
//           <button
//             className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-gray-50"
//             onClick={resetFilters}
//             title="Reset all filters"
//           >
//             <FaRedoAlt />
//             Reset Filters
//           </button>
//         </div>
//       </div>

//       {/* Loading / Error */}
//       {loading && (
//         <p className="text-center text-gray-600 mt-6">Loading activities…</p>
//       )}
//       {fetchError && !loading && (
//         <p className="text-center text-gray-600 mt-6">{fetchError}</p>
//       )}

//       {/* Grid/List */}
//       {!loading && !fetchError && (
//         <>
//           <motion.div
//             className={`grid gap-6 ${
//               view === "list"
//                 ? "grid-cols-1"
//                 : view === "grid"
//                 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
//                 : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
//             }`}
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ duration: 0.4 }}
//           >
//             {rows.map((a) => {
//               const id = String(a?._id || a?.id);
//               const createdAt = fmtDate(a?.createdAt);
//               const startAt = fmtDate(a?.startAt);
//               const endAt = fmtDate(a?.endAt);
//               const listLayout = view === "list";

//               const { degreeIds, semesterIds, courseIds } =
//                 normalizeContextIds(a);

//               const degreeNames = degreeIds.map(
//                 (d) =>
//                   degreeMap[d] ||
//                   (typeof d === "string" ? shortId(d) : "Degree")
//               );
//               const semesterNames = semesterIds.map(
//                 (s) =>
//                   semesterMap[s] ||
//                   (typeof s === "string" ? shortId(s) : "Semester")
//               );
//               const courseNames = courseIds.map(
//                 (c) =>
//                   courseMap[c] ||
//                   (typeof c === "string" ? shortId(c) : "Course")
//               );

//               const status = a?.status || "draft";
//               const allowLate = !!a?.allowLate;
//               const maxMarks =
//                 typeof a?.maxMarks === "number" ? a.maxMarks : "—";
//               const audience = a?.audienceType || "all";

//               // /single-activity/:slug/:id
//               const slug = a?.slug || slugify(a?.title);
//               const detailsPath = `/single-activity/${slug}/${id}`;

//               return (
//                 <div key={id} className="relative">
//                   {/* Row actions */}
//                   <div className="absolute -top-2 -right-2 z-10 flex gap-2">
//                     <button
//                       title="Publish"
//                       className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
//                       onClick={(e) => {
//                         e.preventDefault();
//                         e.stopPropagation();
//                         publish(e, id);
//                       }}
//                     >
//                       P
//                     </button>
//                     <button
//                       title="Archive"
//                       className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-amber-50 text-amber-600"
//                       onClick={(e) => {
//                         e.preventDefault();
//                         e.stopPropagation();
//                         archive(e, id);
//                       }}
//                     >
//                       A
//                     </button>
//                     <button
//                       title="Delete activity"
//                       className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
//                       onClick={(e) => remove(e, id)}
//                     >
//                       <FaTrashAlt className="h-4 w-4" />
//                     </button>
//                   </div>

//                   <Link to={detailsPath}>
//                     <motion.div
//                       whileHover={{ scale: 1.02 }}
//                       whileTap={{ scale: 0.98 }}
//                       className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden h-full flex ${
//                         listLayout ? "flex-row p-4 items-center" : "flex-col"
//                       }`}
//                     >
//                       <div
//                         className={`${
//                           listLayout
//                             ? "w-16 h-16 flex-shrink-0 mr-4"
//                             : "w-full h-16"
//                         } flex items-center justify-center`}
//                       >
//                         <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-700">
//                           <FaClipboardList />
//                         </div>
//                       </div>

//                       <div
//                         className={`${
//                           listLayout
//                             ? "flex-1 flex flex-col"
//                             : "p-4 flex flex-col flex-grow"
//                         }`}
//                       >
//                         <div className="text-left space-y-1 flex-shrink-0">
//                           {/* Title */}
//                           <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
//                             {a?.title || "Untitled Activity"}
//                           </h3>

//                           {/* ID */}
//                           <p className="text-xs text-gray-600">
//                             <span className="font-medium">ID:</span>{" "}
//                             <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
//                               {id}
//                             </code>
//                           </p>

//                           {/* Created */}
//                           {a?.createdAt && (
//                             <p className="text-sm text-gray-600 flex items-center">
//                               <FaCalendar className="mr-1 text-yellow-500" />
//                               {createdAt}
//                             </p>
//                           )}

//                           {/* Author */}
//                           <p className="text-sm text-gray-600 flex items-center">
//                             <FaUser className="mr-1 text-red-500" />
//                             <span className="truncate">
//                               <span className="font-medium">Author:</span>{" "}
//                               {typeof a?.createdBy === "object"
//                                 ? a.createdBy?.name ||
//                                   a.createdBy?.fullName ||
//                                   a.createdBy?.email ||
//                                   "User"
//                                 : a?.createdBy
//                                 ? shortId(String(a.createdBy))
//                                 : "—"}
//                               <span className="ml-2 font-medium">
//                                 Audience:
//                               </span>{" "}
//                               {audience}
//                             </span>
//                           </p>

//                           {/* Context */}
//                           {(degreeNames.length ||
//                             semesterNames.length ||
//                             courseNames.length) && (
//                             <p className="text-sm text-gray-600 flex items-center">
//                               <FaUniversity className="mr-1 text-indigo-500" />
//                               <span className="truncate">
//                                 {degreeNames.length ? (
//                                   <>
//                                     <span className="font-medium">
//                                       Degrees:
//                                     </span>{" "}
//                                     {degreeNames.join(", ")}
//                                   </>
//                                 ) : null}
//                                 {semesterNames.length ? (
//                                   <>
//                                     <span className="ml-2 font-medium">
//                                       Semesters:
//                                     </span>{" "}
//                                     {semesterNames.join(", ")}
//                                   </>
//                                 ) : null}
//                                 {courseNames.length ? (
//                                   <>
//                                     <span className="ml-2 font-medium">
//                                       Courses:
//                                     </span>{" "}
//                                     {courseNames.join(", ")}
//                                   </>
//                                 ) : null}
//                               </span>
//                             </p>
//                           )}

//                           {/* Timing */}
//                           <p className="text-sm text-gray-700 flex flex-wrap gap-x-4">
//                             <span>
//                               <span className="font-medium">Start:</span>{" "}
//                               {startAt}
//                             </span>
//                             <span>
//                               <span className="font-medium">End:</span> {endAt}
//                             </span>
//                             <span>
//                               <span className="font-medium">Late:</span>{" "}
//                               {allowLate ? "Allowed" : "Not allowed"}
//                             </span>
//                             <span>
//                               <span className="font-medium">Max Marks:</span>{" "}
//                               {maxMarks}
//                             </span>
//                           </p>

//                           {/* Tags */}
//                           {toTags(a?.tags).length > 0 && (
//                             <p className="text-sm text-gray-600 flex items-center">
//                               <FaTags className="mr-1 text-green-500" />
//                               {toTags(a?.tags).join(", ")}
//                             </p>
//                           )}

//                           {/* Status badges */}
//                           <div className="flex flex-wrap gap-2 mt-2">
//                             <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
//                               <FaBolt className="mr-1" />
//                               {status}
//                             </span>
//                             <span
//                               className={`inline-flex items-center text-xs px-2 py-1 rounded ${
//                                 allowLate
//                                   ? "bg-amber-100 text-amber-700"
//                                   : "bg-gray-100 text-gray-600"
//                               }`}
//                               title={allowLate ? "Late allowed" : "No late"}
//                             >
//                               {allowLate ? (
//                                 <FaCheckCircle className="mr-1" />
//                               ) : (
//                                 <FaTimesCircle className="mr-1" />
//                               )}
//                               {allowLate ? "Late allowed" : "Late not allowed"}
//                             </span>
//                           </div>
//                         </div>

//                         {/* Instructions (preview) */}
//                         {view !== "list" && a?.instructions && (
//                           <p className="text-gray-700 mt-2 line-clamp-2">
//                             {a.instructions}
//                           </p>
//                         )}

//                         <div className="flex-grow" />
//                       </div>
//                     </motion.div>
//                   </Link>
//                 </div>
//               );
//             })}
//           </motion.div>

//           {meta.total === 0 && (
//             <p className="text-center text-gray-600 mt-6">
//               No activities found. Adjust filters or create a new activity.
//             </p>
//           )}

//           {/* Pagination */}
//           {meta.totalPages > 1 && (
//             <div className="mt-8 flex items-center justify-center gap-2">
//               <button
//                 onClick={() => goTo(1)}
//                 disabled={meta.page === 1}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   meta.page === 1
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-purple-600 border-purple-200 hover:bg-purple-50"
//                 }`}
//               >
//                 « First
//               </button>
//               <button
//                 onClick={() => goTo(meta.page - 1)}
//                 disabled={meta.page === 1}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   meta.page === 1
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-purple-600 border-purple-200 hover:bg-purple-50"
//                 }`}
//               >
//                 ‹ Prev
//               </button>

//               {buildPages().map((p, idx) =>
//                 p === "…" ? (
//                   <span
//                     key={`dots-${idx}`}
//                     className="px-2 text-gray-400 select-none"
//                   >
//                     …
//                   </span>
//                 ) : (
//                   <button
//                     key={`p-${p}`}
//                     onClick={() => goTo(p)}
//                     className={`min-w-[36px] px-3 py-1 rounded-full border text-sm transition ${
//                       p === meta.page
//                         ? "bg-purple-600 text-white border-purple-600 shadow"
//                         : "text-purple-600 border-purple-200 hover:bg-purple-50"
//                     }`}
//                   >
//                     {p}
//                   </button>
//                 )
//               )}

//               <button
//                 onClick={() => goTo(meta.page + 1)}
//                 disabled={meta.page === meta.totalPages}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   meta.page === meta.totalPages
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-purple-600 border-purple-200 hover:bg-purple-50"
//                 }`}
//               >
//                 Next ›
//               </button>
//               <button
//                 onClick={() => goTo(meta.totalPages)}
//                 disabled={meta.page === meta.totalPages}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   meta.page === meta.totalPages
//                     ? "text-gray-400 border-gray-200 cursor-not-allowed"
//                     : "text-purple-600 border-purple-200 hover:bg-purple-50"
//                 }`}
//               >
//                 Last »
//               </button>
//             </div>
//           )}

//           <div className="mt-3 text-center text-sm text-gray-600">
//             Page {meta.page} of {meta.totalPages} • Showing{" "}
//             <span className="font-medium">
//               {pageCountText.start}-{pageCountText.end}
//             </span>{" "}
//             of <span className="font-medium">{meta.total}</span> results
//           </div>
//         </>
//       )}
//     </div>
//   );
// }


//

// src/pages/activities/AllActivities.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThList,
  FaThLarge,
  FaTh,
  FaSearch,
  FaTrashAlt,
  FaCalendar,
  FaUser,
  FaTags,
  FaUniversity,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaBolt,
  FaFilter,
  FaRedoAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
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

/** Enums (match your model) */
const AUDIENCE_TYPES = [
  { value: "", label: "All Types" },
  { value: "all", label: "All Users" },
  { value: "roles", label: "Roles" },
  { value: "users", label: "Specific Users" },
  { value: "contextual", label: "Contextual" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

/** Helpers */
const toTags = (arr) =>
  !arr
    ? []
    : Array.isArray(arr)
    ? arr
    : String(arr)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

const shortId = (val) =>
  typeof val === "string" ? `${val.slice(0, 6)}…${val.slice(-4)}` : "";

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const slugify = (s) =>
  String(s || "activity")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

/** ---- Flexible Date Parsing ---- */
const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const stripOrdinals = (s) => s.replace(/\b(\d+)(st|nd|rd|th)\b/gi, "$1");

const lastDayOfMonth = (y, m) => new Date(y, m, 0).getDate();

const parseFlexibleDate = (raw, { endOfRange = false } = {}) => {
  if (!raw) return "";
  let s = String(raw).trim().toLowerCase();
  if (!s) return "";

  s = stripOrdinals(s).replace(/[,]/g, " ").replace(/\s+/g, " ").trim();

  // Cases like "september 2025"
  const mYear = s.match(
    /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{4})\b/
  );
  if (mYear) {
    const m = MONTHS[mYear[1].slice(0, 3)];
    const y = parseInt(mYear[5], 10);
    const d = endOfRange ? lastDayOfMonth(y, m) : 1;
    return new Date(
      Date.UTC(y, m - 1, d, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
    ).toISOString();
  }

  // Month Day Year  e.g. "sep 9 2025"
  const mdy = s.match(
    /\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{1,2})\s+(\d{4})\b/
  );
  if (mdy) {
    const m = MONTHS[mdy[1].slice(0, 3)];
    const d = parseInt(mdy[11], 10);
    const y = parseInt(mdy[12], 10);
    return new Date(
      Date.UTC(y, m - 1, d, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
    ).toISOString();
  }

  // Day Month Year  e.g. "9 sep 2025"
  const dmy = s.match(
    /\b(\d{1,2})\s+(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(\d{4})\b/
  );
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = MONTHS[dmy[2].slice(0, 3)];
    const y = parseInt(dmy[12], 10);
    return new Date(
      Date.UTC(y, m - 1, d, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
    ).toISOString();
  }

  // Numeric with separators: try yyyy-mm-dd, dd-mm-yyyy, mm-dd-yyyy (also with "/" or ".")
  const parts = s.split(/[-/.\s]/).filter(Boolean);
  if (parts.length >= 3) {
    const [a, b, c] = parts.map((x) => parseInt(x, 10));
    // yyyy-mm-dd
    if (a > 1900 && b >= 1 && b <= 12 && c >= 1 && c <= 31) {
      return new Date(
        Date.UTC(a, b - 1, c, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
      ).toISOString();
    }
    // dd-mm-yyyy
    if (
      a >= 1 &&
      a <= 31 &&
      b >= 1 &&
      b <= 12 &&
      c > 1900 &&
      (a > 12 || b <= 12)
    ) {
      return new Date(
        Date.UTC(c, b - 1, a, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
      ).toISOString();
    }
    // mm-dd-yyyy
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31 && c > 1900) {
      return new Date(
        Date.UTC(c, a - 1, b, endOfRange ? 23 : 0, endOfRange ? 59 : 0)
      ).toISOString();
    }
  }

  // Plain Date.parse fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Date(
      Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        endOfRange ? 23 : 0,
        endOfRange ? 59 : 0
      )
    ).toISOString();
  }

  return ""; // unparseable
};

/** Robust ID extraction: strings, objects, arrays */
const normArr = (x) => (Array.isArray(x) ? x : x != null ? [x] : []);
const extractIds = (value) =>
  normArr(value)
    .map((v) => {
      if (v == null) return null;
      if (typeof v === "string" || typeof v === "number") return String(v);
      if (typeof v === "object")
        return String(v._id || v.id || v.value || v.key || "");
      return null;
    })
    .filter(Boolean);

/** Normalize any activity.context shape into arrays of STRING ids */
const normalizeContextIds = (a) => {
  const c = a?.context || {};
  const degreeIds = [
    ...extractIds(c.degrees),
    ...extractIds(c.degreeIds),
    ...extractIds(c.degree),
    ...extractIds(a?.degreeId),
    ...extractIds(a?.degree),
  ];
  const semesterIds = [
    ...extractIds(c.semesters),
    ...extractIds(c.semesterIds),
    ...extractIds(c.semester),
    ...extractIds(c.semester),
    ...extractIds(a?.semesterId),
    ...extractIds(a?.semesterId),
  ];
  const courseIds = [
    ...extractIds(c.courses),
    ...extractIds(c.courseIds),
    ...extractIds(c.course),
    ...extractIds(a?.courseId),
  ];
  return { degreeIds, semesterIds, courseIds };
};

/** --- Course relation helpers (for robust client-side filtering) --- */
const idOf = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return String(val._id || val.id || "");
  return String(val);
};
const getCourseDegreeId = (c) =>
  idOf(c.degree) || idOf(c.degreeId) || idOf(c.degree_id) || "";
const getCourseSemesterId = (c) =>
  idOf(c.semester) ||
  idOf(c.semesterId) ||
  idOf(c.semester) ||
  idOf(c.semesterId) ||
  "";

export default function AllActivities() {
  // view + search
  const [view, setView] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination (default 6/page)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // rows + meta
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // cascading lists
  const [degreeList, setDegreeList] = useState([]);
  const [semesterList, setSemisterList] = useState([]);
  const [courseList, setCourseList] = useState([]);

  // lookup maps
  const [degreeMap, setDegreeMap] = useState({});
  const [semesterMap, setSemisterMap] = useState({});
  const [courseMap, setCourseMap] = useState({});

  // roles (for audienceType=roles)
  const [roleOptions, setRoleOptions] = useState([]);

  // filters (match backend)
  const [filters, setFilters] = useState({
    audienceType: "",
    roles: [],
    status: "",
    tag: "",
    degreeId: "",
    semesterId: "",
    courseId: "",
    since: "",
    until: "",
  });

  // Reset pagination when inputs change
  useEffect(() => setPage(1), [searchTerm, pageSize, filters]);

  /** Load Degrees once */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/list-degrees", {
          params: { page: 1, limit: 1000 },
        });
        if (!alive) return;
        const list = r?.data?.data || r?.data || [];
        const arr = Array.isArray(list) ? list : [];
        setDegreeList(arr);
        const map = {};
        arr.forEach((d) => {
          const key = String(d._id || d.id);
          map[key] = d.name || d.title || "Degree";
        });
        setDegreeMap(map);
      } catch {
        /* silent */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Load roles for audienceType=roles */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/api/getUserCountsByRole");
        const obj = r?.data?.data || r?.data || {};
        const roles = Object.keys(obj).filter(Boolean);
        if (alive)
          setRoleOptions(
            roles.length
              ? roles
              : ["student", "instructor", "author", "admin", "superadmin"]
          );
      } catch {
        if (alive)
          setRoleOptions([
            "student",
            "instructor",
            "author",
            "admin",
            "superadmin",
          ]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Degree -> Semisters */
  useEffect(() => {
    let alive = true;

    // Clear downstream selections
    setSemisterList([]);
    setCourseList([]);
    setFilters((f) => ({ ...f, semesterId: "", courseId: "" }));

    if (!filters.degreeId) {
      setSemisterMap({});
      return;
    }

    (async () => {
      try {
        const res = await api.get("/api/semesters", {
          params: {
            page: 1,
            limit: 1000,
            degreeId: filters.degreeId,
            degree: filters.degreeId,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || res?.data || [];
        const sl = Array.isArray(list) ? list : [];
        setSemisterList(sl);

        const map = {};
        sl.forEach((s) => {
          const key = String(s._id || s.id);
          const label =
            s.title ||
            s.semester_name ||
            (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
            "Semester";
          map[key] = label;
        });
        setSemisterMap(map);
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.degreeId]);

  /** Semister -> Courses (by Degree + Semister) — with robust client-side filtering */
  useEffect(() => {
    let alive = true;

    setCourseList([]);
    setFilters((f) => ({ ...f, courseId: "" }));

    if (!filters.degreeId || !filters.semesterId) {
      setCourseMap({});
      return;
    }

    (async () => {
      try {
        // 1) Try server-side filtered fetch
        const res = await api.get("/api/list-courses", {
          params: {
            page: 1,
            limit: 2000,
            degreeId: filters.degreeId,
            semesterId: filters.semesterId,
          },
        });
        if (!alive) return;
        const list = res?.data?.data || res?.data || [];
        const raw = Array.isArray(list) ? list : [];

        // 2) Apply strict client-side filter (in case backend ignores params)
        const wantDeg = String(filters.degreeId);
        const wantSem = String(filters.semesterId);

        const seen = new Set();
        const filtered = [];
        for (const c of raw) {
          const cid = String(c._id || c.id || "");
          if (!cid || seen.has(cid)) continue;
          const degId = String(getCourseDegreeId(c));
          const semId = String(getCourseSemesterId(c));
          if (degId === wantDeg && semId === wantSem) {
            seen.add(cid);
            filtered.push(c);
          }
        }

        // 3) Fallback: if server returned unrelated data and nothing matched,
        //    fetch all and filter locally
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
            const ok = degId === wantDeg && semId === wantSem;
            if (ok) seen2.add(cid);
            return ok;
          });
        }

        // 4) Set list + map from finalList only
        setCourseList(finalList);
        const cmap = {};
        finalList.forEach((c) => {
          const key = String(c._id || c.id);
          cmap[key] = c.title || c.name || "Course";
        });
        setCourseMap(cmap);

        // 5) Ensure selected course (if any) is still valid
        setFilters((f) => {
          if (!f.courseId) return f;
          return finalList.some((c) => String(c._id || c.id) === f.courseId)
            ? f
            : { ...f, courseId: "" };
        });
      } catch {
        if (alive) {
          setCourseList([]);
          setCourseMap({});
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.semesterId]);

  /** Fetch Activities with active filters */
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setFetchError("");
      try {
        // parse dates just-in-time
        const parsedSince = parseFlexibleDate(filters.since || "");
        const parsedUntil = parseFlexibleDate(filters.until || "", {
          endOfRange: true,
        });

        const params = {
          page,
          limit: pageSize,
          sort: "-createdAt",
        };

        // text search (send to server too if supported)
        if (searchTerm.trim()) params.q = searchTerm.trim();

        // simple filters
        if (filters.audienceType) params.audienceType = filters.audienceType;
        if (filters.status) params.status = filters.status;
        if (filters.tag) params.tag = filters.tag;

        // roles (when audienceType=roles)
        if (filters.audienceType === "roles" && filters.roles?.length) {
          params.roles = filters.roles.join(",");
        }

        // send many common variants (backend differences)
        if (filters.degreeId) {
          params.degreeId = filters.degreeId;
          params.degree = filters.degreeId;
          params.context_degree = filters.degreeId;
        }
        if (filters.semesterId) {
          params.semesterId = filters.semesterId;
          params.semesterId = filters.semesterId;
          params.context_semester = filters.semesterId;
        }
        if (filters.courseId) {
          params.courseId = filters.courseId;
          params.context_course = filters.courseId;
        }

        // date range
        if (parsedSince) params.since = parsedSince;
        if (parsedUntil) params.until = parsedUntil;

        const res = await api.get("/api/list-activities", {
          params,
          signal: ctrl.signal,
        });

        let data = Array.isArray(res.data?.data) ? res.data.data : [];
        const m = res.data?.meta || {};
        if (!alive) return;

        // -------- Client-side robust filtering --------
        const dId = String(filters.degreeId || "");
        const sId = String(filters.semesterId || "");
        const cId = String(filters.courseId || "");

        if (
          dId ||
          sId ||
          cId ||
          (filters.audienceType === "roles" && filters.roles?.length)
        ) {
          data = data.filter((a) => {
            const { degreeIds, semesterIds, courseIds } =
              normalizeContextIds(a);

            // Degree
            if (dId && degreeIds.length && !degreeIds.includes(dId))
              return false;
            // Semester
            if (sId && semesterIds.length && !semesterIds.includes(sId))
              return false;
            // Course
            if (cId && courseIds.length && !courseIds.includes(cId))
              return false;

            // Roles (only if activity is role-targeted AND filter has roles)
            if (
              filters.audienceType === "roles" &&
              filters.roles?.length &&
              (a?.audienceType === "roles" || a?.roles?.length)
            ) {
              const actRoles = (a?.roles || []).map((r) =>
                String(r).toLowerCase()
              );
              const need = filters.roles.map((r) => String(r).toLowerCase());
              if (!need.some((r) => actRoles.includes(r))) return false;
            }
            return true;
          });
        }

        // 2) Smarter search (tokenized fuzzy includes) over many fields
        if (searchTerm.trim()) {
          const tokens = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

          data = data.filter((a) => {
            const id = String(a?._id || a?.id || "");
            const title = String(a?.title || "").toLowerCase();
            const instr = String(a?.instructions || "").toLowerCase();
            const tags = toTags(a?.tags).join(" ").toLowerCase();
            const status = String(a?.status || "").toLowerCase();
            const author =
              typeof a?.createdBy === "object"
                ? (a.createdBy?.name ||
                    a.createdBy?.fullName ||
                    a.createdBy?.email ||
                    "") + ""
                : String(a?.createdBy || "");

            const { degreeIds, semesterIds, courseIds } =
              normalizeContextIds(a);
            const degNames = degreeIds
              .map((d) => degreeMap[d] || d)
              .join(" ")
              .toLowerCase();
            const semNames = semesterIds
              .map((s) => semesterMap[s] || s)
              .join(" ")
              .toLowerCase();
            const crsNames = courseIds
              .map((c) => courseMap[c] || c)
              .join(" ")
              .toLowerCase();
            const dates = [fmtDate(a?.startAt), fmtDate(a?.endAt)]
              .join(" ")
              .toLowerCase();

            const hay = [
              id,
              title,
              instr,
              tags,
              status,
              String(author).toLowerCase(),
              degNames,
              semNames,
              crsNames,
              dates,
            ].join(" ");

            return tokens.every((t) => hay.includes(t));
          });
        }
        // ---------------------------------------------

        // meta
        const total = data.length;
        const limit = Number(m.limit || pageSize);
        const totalPages =
          m.pages || m.totalPages || Math.max(1, Math.ceil(total / limit));

        setRows(data);
        setMeta({
          page: Number(m.page || page),
          limit,
          total: Number(m.total || total),
          totalPages: Number(totalPages),
        });
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching activities:", err);
        setFetchError(
          "Activities not yet created or unavailable. Please add some activities."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [
    page,
    pageSize,
    searchTerm,
    filters,
    refreshKey,
    degreeMap,
    semesterMap,
    courseMap,
  ]);

  const iconStyle = {
    list: view === "list" ? "text-blue-500" : "text-gray-500",
    grid: view === "grid" ? "text-green-500" : "text-gray-500",
    card: view === "card" ? "text-purple-500" : "text-gray-500",
  };

  const pageCountText = useMemo(() => {
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.total, meta.page * meta.limit);
    return { start, end };
  }, [meta]);

  const goTo = (p) =>
    setPage(Math.min(Math.max(1, Number(p) || 1), meta.totalPages));

  const buildPages = () => {
    const totalPages = meta.totalPages;
    const currentPage = meta.page;
    const maxBtns = 7;
    if (totalPages <= maxBtns)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (currentPage > 4) pages.push("…");
    const s = Math.max(2, currentPage - 1);
    const e = Math.min(totalPages - 1, currentPage + 1);
    for (let i = s; i <= e; i++) pages.push(i);
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  };

  /** Actions */
  const remove = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(
      `Delete this activity?\nThis will remove the activity and related assignments/submissions.`
    );
    if (!ok) return;
    try {
      const res = await api.delete(`/api/delete-activity/${id}`);
      if (res.status >= 200 && res.status < 300) {
        if (rows.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
        setRefreshKey((k) => k + 1);
        alert("Activity deleted.");
      } else {
        throw new Error("Failed to delete activity.");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete activity."
      );
    }
  };

  const publish = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/api/publish-activity/${id}`);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Activity published.");
      } else {
        throw new Error("Publish failed");
      }
    } catch (err) {
      console.error("Publish failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  const archive = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/api/archive-activity/${id}`);
      if (res.status >= 200 && res.status < 300) {
        setRefreshKey((k) => k + 1);
        alert("Activity archived.");
      } else {
        throw new Error("Archive failed");
      }
    } catch (err) {
      console.error("Archive failed:", err);
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    }
  };

  /** Small reusable select */
  const FilterSelect = ({
    label,
    value,
    onChange,
    options,
    getOption,
    disabled = false,
    nameKeyPrefix,
  }) => (
    <label className="flex flex-col text-sm text-gray-700">
      <span className="mb-1">{label}</span>
      <select
        className="border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option key={`${nameKeyPrefix}-any`} value="">
          {disabled ? "Select parent first" : "All"}
        </option>
        {options.map((o, idx) => {
          const { id, name } = getOption(o);
          const key = `${nameKeyPrefix}-${idx}-${String(id || "unknown")}`;
          return (
            <option key={key} value={id}>
              {name} {id ? `(${shortId(String(id))})` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );

  const resetFilters = () =>
    setFilters({
      audienceType: "",
      roles: [],
      status: "",
      tag: "",
      degreeId: "",
      semesterId: "",
      courseId: "",
      since: "",
      until: "",
    });

  // roles multiselect UI
  const toggleRole = (r) =>
    setFilters((f) => {
      const has = f.roles.includes(r);
      return {
        ...f,
        roles: has ? f.roles.filter((x) => x !== r) : [...f.roles, r],
      };
    });

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 border-b">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="block-heading">
          <h2 className="font-bold text-xl">All Activities</h2>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Search title, tags, degree/semester/course, author…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 pr-10 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <FaSearch className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Count + Views + page size */}
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {meta.total} activities
          </p>
          <FaThList
            className={`cursor-pointer ${iconStyle.list}`}
            onClick={() => setView("list")}
            title="List view"
          />
          <FaTh
            className={`cursor-pointer ${iconStyle.card}`}
            onClick={() => setView("card")}
            title="Card view"
          />
          <FaThLarge
            className={`cursor-pointer ${iconStyle.grid}`}
            onClick={() => setView("grid")}
            title="Grid view"
          />
          <select
            className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Items per page"
          >
            {[3, 6, 12, 24, 48].map((n, i) => (
              <option key={`pg-${i}-${n}`} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-3 rounded-lg border bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
          <FaFilter />
          Filters (cascading)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Audience Type */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Audience Type</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.audienceType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, audienceType: e.target.value }))
              }
            >
              {AUDIENCE_TYPES.map((a, idx) => (
                <option
                  key={`aud-${idx}-${a.value || "any"}-${a.label}`}
                  value={a.value}
                >
                  {a.label}
                </option>
              ))}
            </select>

            {/* Roles selector appears when 'roles' */}
            {filters.audienceType === "roles" && (
              <div className="mt-2 flex flex-wrap gap-2">
                {roleOptions.map((r) => {
                  const checked = filters.roles.includes(r);
                  return (
                    <label
                      key={`role-${r}`}
                      className={`px-2 py-1 rounded border cursor-pointer ${
                        checked
                          ? "bg-indigo-50 border-indigo-300"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-1 align-middle"
                        checked={checked}
                        onChange={() => toggleRole(r)}
                      />
                      {r}
                    </label>
                  );
                })}
              </div>
            )}
          </label>

          {/* Status */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Status</span>
            <select
              className="border border-gray-300 rounded px-2 py-1"
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              {STATUSES.map((s, idx) => (
                <option
                  key={`st-${idx}-${s.value || "any"}-${s.label}`}
                  value={s.value}
                >
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {/* Single Tag (text) */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Tag</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              placeholder="e.g., project"
              value={filters.tag}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tag: e.target.value }))
              }
            />
          </label>

          {/* Degree */}
          <FilterSelect
            label="Degree"
            value={filters.degreeId}
            onChange={(v) => setFilters((f) => ({ ...f, degreeId: String(v) }))}
            options={degreeList}
            nameKeyPrefix="deg"
            getOption={(d) => ({
              id: String(d._id || d.id),
              name: d.name || d.title || "Degree",
            })}
          />

          {/* Semester */}
          <FilterSelect
            label="Semester"
            value={filters.semesterId}
            onChange={(v) =>
              setFilters((f) => ({ ...f, semesterId: String(v) }))
            }
            options={semesterList}
            disabled={!filters.degreeId}
            nameKeyPrefix="sem"
            getOption={(s) => ({
              id: String(s._id || s.id),
              name:
                s.title ||
                s.semester_name ||
                (s.semNumber ? `Semester ${s.semNumber}` : s.slug) ||
                "Semester",
            })}
          />

          {/* Course */}
          <FilterSelect
            label="Course"
            value={filters.courseId}
            onChange={(v) => setFilters((f) => ({ ...f, courseId: String(v) }))}
            options={courseList}
            disabled={!filters.degreeId || !filters.semesterId}
            nameKeyPrefix="course"
            getOption={(c) => ({
              id: String(c._id || c.id),
              name: c.title || c.name || "Course",
            })}
          />

          {/* Date Range */}
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Since (any format)</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              placeholder="e.g., Sep 9th 2025 / 2025-09-09 / September 2025"
              value={filters.since}
              onChange={(e) =>
                setFilters((f) => ({ ...f, since: e.target.value }))
              }
              onBlur={(e) => {
                const parsed = parseFlexibleDate(e.target.value);
                if (parsed) setFilters((f) => ({ ...f, since: parsed }));
              }}
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            <span className="mb-1">Until (any format)</span>
            <input
              className="border border-gray-300 rounded px-2 py-1"
              placeholder="e.g., 09-12-2025 / 12-09-2025 / September 2025"
              value={filters.until}
              onChange={(e) =>
                setFilters((f) => ({ ...f, until: e.target.value }))
              }
              onBlur={(e) => {
                const parsed = parseFlexibleDate(e.target.value, {
                  endOfRange: true,
                });
                if (parsed) setFilters((f) => ({ ...f, until: parsed }));
              }}
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-gray-50"
            onClick={resetFilters}
            title="Reset all filters"
          >
            <FaRedoAlt />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="text-center text-gray-600 mt-6">Loading activities…</p>
      )}
      {fetchError && !loading && (
        <p className="text-center text-gray-600 mt-6">{fetchError}</p>
      )}

      {/* Grid/List */}
      {!loading && !fetchError && (
        <>
          <motion.div
            className={`grid gap-6 ${
              view === "list"
                ? "grid-cols-1"
                : view === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {rows.map((a) => {
              const id = String(a?._id || a?.id);
              const createdAt = fmtDate(a?.createdAt);
              const startAt = fmtDate(a?.startAt);
              const endAt = fmtDate(a?.endAt);
              const listLayout = view === "list";

              const { degreeIds, semesterIds, courseIds } =
                normalizeContextIds(a);

              const degreeNames = degreeIds.map(
                (d) =>
                  degreeMap[d] ||
                  (typeof d === "string" ? shortId(d) : "Degree")
              );
              const semesterNames = semesterIds.map(
                (s) =>
                  semesterMap[s] ||
                  (typeof s === "string" ? shortId(s) : "Semester")
              );
              const courseNames = courseIds.map(
                (c) =>
                  courseMap[c] ||
                  (typeof c === "string" ? shortId(c) : "Course")
              );

              const status = a?.status || "draft";
              const allowLate = !!a?.allowLate;
              const maxMarks =
                typeof a?.maxMarks === "number" ? a.maxMarks : "—";
              const audience = a?.audienceType || "all";

              const slug = a?.slug || slugify(a?.title);
              const detailsPath = `/single-activity/${slug}/${id}`;

              return (
                <div key={id} className="relative">
                  {/* Row actions */}
                  <div className="absolute -top-2 -right-2 z-10 flex gap-2">
                    <button
                      title="Publish"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-green-50 text-green-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        publish(e, id);
                      }}
                    >
                      P
                    </button>
                    <button
                      title="Archive"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-amber-50 text-amber-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        archive(e, id);
                      }}
                    >
                      A
                    </button>
                    <button
                      title="Delete activity"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border shadow hover:bg-red-50 text-red-600"
                      onClick={(e) => remove(e, id)}
                    >
                      <FaTrashAlt className="h-4 w-4" />
                    </button>
                  </div>

                  <Link to={detailsPath}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden h-full flex ${
                        listLayout ? "flex-row p-4 items-center" : "flex-col"
                      }`}
                    >
                      <div
                        className={`${
                          listLayout
                            ? "w-16 h-16 flex-shrink-0 mr-4"
                            : "w-full h-16"
                        } flex items-center justify-center`}
                      >
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-700">
                          <FaClipboardList />
                        </div>
                      </div>

                      <div
                        className={`${
                          listLayout
                            ? "flex-1 flex flex-col"
                            : "p-4 flex flex-col flex-grow"
                        }`}
                      >
                        <div className="text-left space-y-1 flex-shrink-0">
                          {/* Title */}
                          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                            {a?.title || "Untitled Activity"}
                          </h3>

                          {/* ID */}
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">ID:</span>{" "}
                            <code className="bg-gray-100 border px-1.5 py-0.5 rounded">
                              {id}
                            </code>
                          </p>

                          {/* Created */}
                          {a?.createdAt && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendar className="mr-1 text-yellow-500" />
                              {createdAt}
                            </p>
                          )}

                          {/* Author */}
                          <p className="text-sm text-gray-600 flex items-center">
                            <FaUser className="mr-1 text-red-500" />
                            <span className="truncate">
                              <span className="font-medium">Author:</span>{" "}
                              {typeof a?.createdBy === "object"
                                ? a.createdBy?.name ||
                                  a.createdBy?.fullName ||
                                  a.createdBy?.email ||
                                  "User"
                                : a?.createdBy
                                ? shortId(String(a.createdBy))
                                : "—"}
                              <span className="ml-2 font-medium">
                                Audience:
                              </span>{" "}
                              {audience}
                            </span>
                          </p>

                          {/* Context */}
                          {(degreeNames.length ||
                            semesterNames.length ||
                            courseNames.length) && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaUniversity className="mr-1 text-indigo-500" />
                              <span className="truncate">
                                {degreeNames.length ? (
                                  <>
                                    <span className="font-medium">
                                      Degrees:
                                    </span>{" "}
                                    {degreeNames.join(", ")}
                                  </>
                                ) : null}
                                {semesterNames.length ? (
                                  <>
                                    <span className="ml-2 font-medium">
                                      Semesters:
                                    </span>{" "}
                                    {semesterNames.join(", ")}
                                  </>
                                ) : null}
                                {courseNames.length ? (
                                  <>
                                    <span className="ml-2 font-medium">
                                      Courses:
                                    </span>{" "}
                                    {courseNames.join(", ")}
                                  </>
                                ) : null}
                              </span>
                            </p>
                          )}

                          {/* Timing */}
                          <p className="text-sm text-gray-700 flex flex-wrap gap-x-4">
                            <span>
                              <span className="font-medium">Start:</span>{" "}
                              {startAt}
                            </span>
                            <span>
                              <span className="font-medium">End:</span> {endAt}
                            </span>
                            <span>
                              <span className="font-medium">Late:</span>{" "}
                              {allowLate ? "Allowed" : "Not allowed"}
                            </span>
                            <span>
                              <span className="font-medium">Max Marks:</span>{" "}
                              {maxMarks}
                            </span>
                          </p>

                          {/* Tags */}
                          {toTags(a?.tags).length > 0 && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaTags className="mr-1 text-green-500" />
                              {toTags(a?.tags).join(", ")}
                            </p>
                          )}

                          {/* Status badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                              <FaBolt className="mr-1" />
                              {status}
                            </span>
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded ${
                                allowLate
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                              title={allowLate ? "Late allowed" : "No late"}
                            >
                              {allowLate ? (
                                <FaCheckCircle className="mr-1" />
                              ) : (
                                <FaTimesCircle className="mr-1" />
                              )}
                              {allowLate ? "Late allowed" : "Late not allowed"}
                            </span>
                          </div>
                        </div>

                        {/* Instructions (preview) */}
                        {view !== "list" && a?.instructions && (
                          <p className="text-gray-700 mt-2 line-clamp-2">
                            {a.instructions}
                          </p>
                        )}

                        <div className="flex-grow" />
                      </div>
                    </motion.div>
                  </Link>
                </div>
              );
            })}
          </motion.div>

          {meta.total === 0 && (
            <p className="text-center text-gray-600 mt-6">
              No activities found. Adjust filters or create a new activity.
            </p>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => goTo(1)}
                disabled={meta.page === 1}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === 1
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                « First
              </button>
              <button
                onClick={() => goTo(meta.page - 1)}
                disabled={meta.page === 1}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === 1
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                ‹ Prev
              </button>

              {buildPages().map((p, idx) =>
                p === "…" ? (
                  <span
                    key={`dots-${idx}`}
                    className="px-2 text-gray-400 select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={`p-${p}`}
                    onClick={() => goTo(p)}
                    className={`min-w-[36px] px-3 py-1 rounded-full border text-sm transition ${
                      p === meta.page
                        ? "bg-purple-600 text-white border-purple-600 shadow"
                        : "text-purple-600 border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goTo(meta.page + 1)}
                disabled={meta.page === meta.totalPages}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === meta.totalPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                Next ›
              </button>
              <button
                onClick={() => goTo(meta.totalPages)}
                disabled={meta.page === meta.totalPages}
                className={`px-3 py-1 rounded-full border text-sm ${
                  meta.page === meta.totalPages
                    ? "text-gray-400 border-gray-200 cursor-not-allowed"
                    : "text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                Last »
              </button>
            </div>
          )}

          <div className="mt-3 text-center text-sm text-gray-600">
            Page {meta.page} of {meta.totalPages} • Showing{" "}
            <span className="font-medium">
              {pageCountText.start}-{pageCountText.end}
            </span>{" "}
            of <span className="font-medium">{meta.total}</span> results
          </div>
        </>
      )}
    </div>
  );
}
