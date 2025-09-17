// // controllers/CourseController.js
// const mongoose = require("mongoose");
// const Course = require("../models/CourseModel");

// const { Types } = mongoose;

// /* ----------------------------- helpers ------------------------------ */

// const toObjectId = (v) => {
//   try {
//     if (!v) return null;
//     return new Types.ObjectId(v);
//   } catch {
//     return null;
//   }
// };

// const isValidObjectId = (v) => Types.ObjectId.isValid(String(v || ""));

// const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// const boolFrom = (v) =>
//   typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);

// const toArray = (v) => {
//   if (Array.isArray(v)) return v;
//   if (typeof v === "string") {
//     try {
//       const parsed = JSON.parse(v);
//       if (Array.isArray(parsed)) return parsed;
//     } catch {}
//     return v
//       .split(",")
//       .map((x) => String(x).trim())
//       .filter(Boolean);
//   }
//   return v ? [v] : [];
// };

// const parseJSON = (v) => {
//   if (v == null) return v;
//   if (typeof v === "object") return v;
//   try {
//     return JSON.parse(v);
//   } catch {
//     return undefined;
//   }
// };

// const toNumber = (v) => {
//   if (v === "" || v == null) return undefined;
//   const n = Number(v);
//   return Number.isNaN(n) ? undefined : n;
// };

// const toDate = (v) => {
//   if (v === "" || v == null) return undefined;
//   const d = new Date(v);
//   return isNaN(d) ? undefined : d;
// };

// const normalizeString = (v) => (v == null ? undefined : String(v).trim());

// const normalizeStringArray = (v) => {
//   const arr = toArray(v);
//   return arr.map((s) => String(s).trim()).filter(Boolean);
// };

// const normalizeObjectId = (v) => {
//   const id = toObjectId(v);
//   return id || undefined;
// };

// // Deeply remove undefined / empty-string values from plain objects/arrays
// const stripEmptyDeep = (val) => {
//   if (Array.isArray(val)) {
//     const arr = val.map(stripEmptyDeep).filter((x) => x !== undefined);
//     return arr;
//   }
//   if (val && typeof val === "object") {
//     const out = {};
//     for (const [k, v] of Object.entries(val)) {
//       const nv = stripEmptyDeep(v);
//       if (nv !== undefined) out[k] = nv;
//     }
//     return out;
//   }
//   if (val === "") return undefined;
//   return val;
// };

// // Format mongoose errors into a consistent shape
// const getErrorPayload = (err) => {
//   if (!err) return { message: "Unknown error" };

//   if (err.name === "ValidationError") {
//     const details = {};
//     for (const [path, e] of Object.entries(err.errors || {})) {
//       details[path] = e.message;
//     }
//     return { message: "Validation failed", errors: details };
//   }

//   if (err.name === "CastError") {
//     return {
//       message: `Invalid value for "${err.path}"`,
//       path: err.path,
//       value: err.value,
//       kind: err.kind,
//     };
//   }

//   if (err.name === "StrictModeError") {
//     return { message: err.message };
//   }

//   if (err.code === 11000) {
//     const fields = Object.keys(err.keyPattern || {});
//     return { message: `Duplicate value for: ${fields.join(", ")}` };
//   }

//   return { message: err.message || "Server error" };
// };

// /* ---------- topic / module normalizers ---------- */

// const normTopic = (t = {}) => {
//   const o = {};
//   if (t.title !== undefined) o.title = normalizeString(t.title);

//   // learning content
//   if (t.explanation !== undefined)
//     o.explanation = normalizeString(t.explanation);
//   if (t.code !== undefined)
//     o.code = t.code == null ? undefined : String(t.code);
//   if (t.codeExplanation !== undefined)
//     o.codeExplanation = normalizeString(t.codeExplanation);
//   if (t.codeLanguage !== undefined)
//     o.codeLanguage = normalizeString(t.codeLanguage);

//   // media/metadata
//   if (t.videoUrl !== undefined) o.videoUrl = normalizeString(t.videoUrl);
//   if (t.pdfUrl !== undefined) o.pdfUrl = normalizeString(t.pdfUrl);
//   if (t.duration !== undefined) {
//     const n = toNumber(t.duration);
//     if (n !== undefined) o.duration = n;
//   }
//   if (t.isFreePreview !== undefined)
//     o.isFreePreview = boolFrom(t.isFreePreview);

//   return stripEmptyDeep(o);
// };

// const normalizeModules = (input) => {
//   let mods = input;
//   if (typeof input === "string") {
//     const parsed = parseJSON(input);
//     if (Array.isArray(parsed)) mods = parsed;
//   }
//   if (!Array.isArray(mods)) return undefined;

//   return mods.map((m) => {
//     const out = {};
//     if (m.title !== undefined) out.title = normalizeString(m.title);
//     if (m.description !== undefined)
//       out.description = normalizeString(m.description);

//     let topics = m.topics;
//     if (typeof topics === "string") {
//       const parsed = parseJSON(topics);
//       if (Array.isArray(parsed)) topics = parsed;
//     }
//     if (Array.isArray(topics)) out.topics = topics.map(normTopic);

//     return stripEmptyDeep(out);
//   });
// };

// const normalizeLearningResources = (v) => {
//   if (v === undefined) return undefined;

//   let obj = v;
//   if (typeof v === "string") {
//     const parsed = parseJSON(v);
//     if (parsed && typeof parsed === "object") obj = parsed;
//   }
//   if (!obj || typeof obj !== "object") return undefined;

//   const out = {};
//   if (obj.videos !== undefined) out.videos = normalizeStringArray(obj.videos);
//   if (obj.pdfs !== undefined) out.pdfs = normalizeStringArray(obj.pdfs);
//   if (obj.assignments !== undefined)
//     out.assignments = normalizeStringArray(obj.assignments);
//   if (obj.externalLinks !== undefined)
//     out.externalLinks = normalizeStringArray(obj.externalLinks);
//   return stripEmptyDeep(out);
// };

// const normalizeEnrolledStudents = (v) => {
//   if (v === undefined) return undefined;

//   let arr = v;
//   if (typeof v === "string") {
//     const parsed = parseJSON(v);
//     if (Array.isArray(parsed)) arr = parsed;
//   }
//   if (!Array.isArray(arr)) return undefined;

//   return arr.map((s) => {
//     const out = {};
//     if (s.studentId !== undefined)
//       out.studentId = normalizeObjectId(s.studentId);
//     if (s.enrolledAt !== undefined) {
//       const d = toDate(s.enrolledAt);
//       if (d !== undefined) out.enrolledAt = d;
//     }
//     if (s.completed !== undefined) out.completed = boolFrom(s.completed);
//     if (s.progress !== undefined) {
//       const n = toNumber(s.progress);
//       if (n !== undefined) out.progress = n;
//     }
//     if (s.completedTopics !== undefined)
//       out.completedTopics = normalizeStringArray(s.completedTopics);
//     if (s.certificateIssued !== undefined)
//       out.certificateIssued = boolFrom(s.certificateIssued);
//     return stripEmptyDeep(out);
//   });
// };

// const normalizeRatings = (v) => {
//   if (v === undefined) return undefined;

//   let arr = v;
//   if (typeof v === "string") {
//     const parsed = parseJSON(v);
//     if (Array.isArray(parsed)) arr = parsed;
//   }
//   if (!Array.isArray(arr)) return undefined;

//   return arr.map((r) => {
//     const out = {};
//     if (r.studentId !== undefined)
//       out.studentId = normalizeObjectId(r.studentId);
//     if (r.rating !== undefined) {
//       const n = toNumber(r.rating);
//       if (n !== undefined) out.rating = n;
//     }
//     if (r.review !== undefined) out.review = normalizeString(r.review);
//     if (r.createdAt !== undefined) {
//       const d = toDate(r.createdAt);
//       if (d !== undefined) out.createdAt = d;
//     }
//     return stripEmptyDeep(out);
//   });
// };

// const normalizeThreads = (v) => {
//   if (v === undefined) return undefined;

//   let arr = v;
//   if (typeof v === "string") {
//     const parsed = parseJSON(v);
//     if (Array.isArray(parsed)) arr = parsed;
//   }
//   if (!Array.isArray(arr)) return undefined;

//   return arr.map((th) => {
//     const out = {};
//     if (th.userId !== undefined) out.userId = normalizeObjectId(th.userId);
//     if (th.message !== undefined) out.message = normalizeString(th.message);
//     if (th.createdAt !== undefined) {
//       const d = toDate(th.createdAt);
//       if (d !== undefined) out.createdAt = d;
//     }
//     if (th.replies !== undefined) {
//       let reps = th.replies;
//       if (typeof reps === "string") {
//         const parsed = parseJSON(reps);
//         if (Array.isArray(parsed)) reps = parsed;
//       }
//       if (Array.isArray(reps)) {
//         out.replies = reps.map((rp) => {
//           const r = {};
//           if (rp.userId !== undefined) r.userId = normalizeObjectId(rp.userId);
//           if (rp.message !== undefined) r.message = normalizeString(rp.message);
//           if (rp.createdAt !== undefined) {
//             const d = toDate(rp.createdAt);
//             if (d !== undefined) r.createdAt = d;
//           }
//           return stripEmptyDeep(r);
//         });
//       }
//     }
//     return stripEmptyDeep(out);
//   });
// };

// const normalizeCourseInput = (payload = {}) => {
//   const out = {};

//   // Basic info
//   if (payload.title !== undefined) out.title = normalizeString(payload.title);
//   if (payload.slug !== undefined)
//     out.slug = normalizeString(payload.slug)?.toLowerCase();
//   if (payload.description !== undefined)
//     out.description = normalizeString(payload.description);
//   if (payload.language !== undefined)
//     out.language = normalizeString(payload.language);
//   if (payload.level !== undefined) out.level = normalizeString(payload.level);
//   if (payload.thumbnail !== undefined)
//     out.thumbnail = normalizeString(payload.thumbnail);
//   if (payload.promoVideoUrl !== undefined)
//     out.promoVideoUrl = normalizeString(payload.promoVideoUrl);

//   if (payload.durationInHours !== undefined) {
//     const n = toNumber(payload.durationInHours);
//     if (n !== undefined) out.durationInHours = n;
//   }

//   if (payload.price !== undefined) {
//     const n = toNumber(payload.price);
//     if (n !== undefined) out.price = n;
//   }

//   // Categorization
//   if (payload.category !== undefined)
//     out.category = normalizeObjectId(payload.category);
//   if (payload.subCategory !== undefined)
//     out.subCategory = normalizeObjectId(payload.subCategory);

//   // Degree / Semister (optional)
//   if (payload.degree !== undefined)
//     out.degree = normalizeObjectId(payload.degree);
//   if (payload.semester !== undefined)
//     out.semester = normalizeObjectId(payload.semester);

//   // Marketing
//   if (payload.requirements !== undefined)
//     out.requirements = normalizeStringArray(payload.requirements);
//   if (payload.learningOutcomes !== undefined)
//     out.learningOutcomes = normalizeStringArray(payload.learningOutcomes);
//   if (payload.tags !== undefined) out.tags = normalizeStringArray(payload.tags);
//   if (payload.metaTitle !== undefined)
//     out.metaTitle = normalizeString(payload.metaTitle);
//   if (payload.metaDescription !== undefined)
//     out.metaDescription = normalizeString(payload.metaDescription);
//   if (payload.keywords !== undefined)
//     out.keywords = normalizeStringArray(payload.keywords);

//   // People
//   if (payload.authors !== undefined) {
//     out.authors = toArray(payload.authors)
//       .map(normalizeObjectId)
//       .filter(Boolean);
//   }
//   if (payload.instructor !== undefined)
//     out.instructor = normalizeObjectId(payload.instructor);

//   // Content
//   if (payload.modules !== undefined)
//     out.modules = normalizeModules(payload.modules);

//   if (payload.totalModules !== undefined) {
//     const n = toNumber(payload.totalModules);
//     if (n !== undefined) out.totalModules = n;
//   }
//   if (payload.totalTopics !== undefined) {
//     const n = toNumber(payload.totalTopics);
//     if (n !== undefined) out.totalTopics = n;
//   }

//   // Learning resources
//   if (payload.learningResources !== undefined)
//     out.learningResources = normalizeLearningResources(
//       payload.learningResources
//     );

//   // Access
//   if (payload.accessType !== undefined)
//     out.accessType = normalizeString(payload.accessType);
//   if (payload.maxStudents !== undefined) {
//     const n = toNumber(payload.maxStudents);
//     if (n !== undefined) out.maxStudents = n;
//   }
//   if (payload.enrollmentDeadline !== undefined) {
//     // allow explicit null to clear, string/Date otherwise
//     if (payload.enrollmentDeadline === null) {
//       out.enrollmentDeadline = null;
//     } else {
//       const d = toDate(payload.enrollmentDeadline);
//       if (d !== undefined) out.enrollmentDeadline = d;
//     }
//   }
//   if (payload.completionCriteria !== undefined)
//     out.completionCriteria = normalizeString(payload.completionCriteria);

//   // Enrollment
//   if (payload.enrolledStudents !== undefined)
//     out.enrolledStudents = normalizeEnrolledStudents(payload.enrolledStudents);

//   // Certificate
//   if (payload.issueCertificate !== undefined)
//     out.issueCertificate = boolFrom(payload.issueCertificate);
//   if (payload.certificateTemplateUrl !== undefined)
//     out.certificateTemplateUrl = normalizeString(
//       payload.certificateTemplateUrl
//     );

//   // Ratings
//   if (payload.ratings !== undefined)
//     out.ratings = normalizeRatings(payload.ratings);
//   if (payload.averageRating !== undefined) {
//     const n = toNumber(payload.averageRating);
//     if (n !== undefined) out.averageRating = n;
//   }

//   // Q&A
//   if (payload.discussionThreads !== undefined)
//     out.discussionThreads = normalizeThreads(payload.discussionThreads);

//   // Flags
//   if (payload.published !== undefined)
//     out.published = boolFrom(payload.published);
//   if (payload.isArchived !== undefined)
//     out.isArchived = boolFrom(payload.isArchived);
//   if (payload.isFeatured !== undefined)
//     out.isFeatured = boolFrom(payload.isFeatured);
//   if (payload.order !== undefined) {
//     const n = toNumber(payload.order);
//     if (n !== undefined) out.order = n;
//   }

//   // Version
//   if (payload.version !== undefined)
//     out.version = normalizeString(payload.version);

//   return stripEmptyDeep(out);
// };

// /* ------------- only allow setting known schema paths ------------- */

// const pickSchemaPaths = (data) => {
//   const allowed = new Set(Object.keys(Course.schema.paths));
//   // allow nested arrays/objects by top-level keys (modules, learningResources, etc.)
//   const out = {};
//   for (const [k, v] of Object.entries(data)) {
//     if (allowed.has(k)) out[k] = v;
//   }
//   return out;
// };

// /* ----------------------------- CRUD ------------------------------ */

// exports.createCourse = async (req, res) => {
//   try {
//     const data = normalizeCourseInput(req.body);

//     const missing = [];
//     if (!data.title) missing.push("title");
//     if (!data.description) missing.push("description");
//     if (data.durationInHours == null) missing.push("durationInHours");
//     if (!data.category) missing.push("category");
//     if (!data.subCategory) missing.push("subCategory");
//     if (!data.instructor) missing.push("instructor");

//     if (missing.length) {
//       return res
//         .status(400)
//         .json({ message: `Missing required fields: ${missing.join(", ")}` });
//     }

//     const doc = new Course(data);
//     await doc.save();
//     res.status(201).json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError"
//         ? 400
//         : err?.code === 11000
//         ? 409
//         : 500;
//     if (status >= 500) console.error("createCourse error:", err);
//     res.status(status).json(payload);
//   }
// };

// exports.listCourses = async (req, res) => {
//   try {
//     const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
//     const limit = Math.max(
//       1,
//       Math.min(5000, parseInt(req.query.limit ?? "20", 10))
//     );
//     const sortBy = (req.query.sortBy || "createdAt").toString();
//     const order =
//       (req.query.order || "desc").toString().toLowerCase() === "asc" ? 1 : -1;
//     const search = (req.query.search || "").trim();

//     const q = {};
//     if (search) {
//       q.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//         { shortDescription: { $regex: search, $options: "i" } },
//         { slug: { $regex: search, $options: "i" } },
//       ];
//     }

//     const total = await Course.countDocuments(q);

//     const items = await Course.find(q)
//       .sort({ [sortBy]: order })
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .populate("category", "category_name name")
//       .lean();

//     res.json({
//       data: items,
//       meta: {
//         page,
//         limit,
//         total,
//         totalPages: Math.max(1, Math.ceil(total / limit)),
//         sortBy,
//         order: order === 1 ? "asc" : "desc",
//       },
//     });
//   } catch (err) {
//     console.error("listCourses error:", err);
//     res.status(500).json({ message: "Failed to list courses" });
//   }
// };

// exports.getCourseById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid course id" });
//     }
//     const doc = await Course.findById(id).lean();
//     if (!doc) return res.status(404).json({ message: "Course not found" });
//     res.json(doc);
//   } catch (err) {
//     console.error("getCourseById error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.getCourseBySlug = async (req, res) => {
//   try {
//     const doc = await Course.findOne({ slug: req.params.slug }).lean();
//     if (!doc) return res.status(404).json({ message: "Course not found" });
//     res.json(doc);
//   } catch (err) {
//     console.error("getCourseBySlug error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Use save() so pre-save recomputes totals/average
// const isHexId = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

// const normalizeId = (v) => {
//   if (v == null || v === "") return undefined;
//   if (typeof v === "string") return isHexId(v) ? v : undefined;

//   // Mongoose ObjectId instance or object with _id
//   if (Types.ObjectId.isValid(v)) return String(v);
//   if (v && typeof v === "object") {
//     if (v._id && isHexId(String(v._id))) return String(v._id);
//     if (v.$oid && isHexId(String(v.$oid))) return String(v.$oid);
//     const s = v.toString?.();
//     if (typeof s === "string" && isHexId(s)) return s;
//   }
//   return undefined;
// };

// const normalizeIdArray = (arr) => {
//   if (!Array.isArray(arr)) return undefined;
//   const out = arr
//     .map((x) => (typeof x === "string" ? x.trim() : x))
//     .map(normalizeId)
//     .filter(Boolean);
//   return out.length ? out : undefined;
// };

// const normalizeDate = (v) => {
//   if (!v) return undefined;
//   if (typeof v === "string") {
//     const d = new Date(v);
//     return isNaN(d.getTime()) ? undefined : d;
//   }
//   if (v && typeof v === "object" && v.$date) {
//     const d = new Date(v.$date);
//     return isNaN(d.getTime()) ? undefined : d;
//   }
//   return undefined;
// };

// const cleanNumber = (v) => {
//   if (v === "" || v == null) return undefined;
//   const n = Number(v);
//   return Number.isFinite(n) ? n : undefined;
// };

// const nonEmptyString = (v) =>
//   typeof v === "string" && v.trim().length ? v.trim() : undefined;

// const compactObject = (obj) => {
//   Object.keys(obj).forEach((k) => {
//     const v = obj[k];
//     if (
//       v === undefined ||
//       v === null ||
//       (typeof v === "string" && v.trim() === "") ||
//       (typeof v === "object" &&
//         !Array.isArray(v) &&
//         v !== null &&
//         Object.keys(v).length === 0)
//     ) {
//       delete obj[k];
//     }
//   });
//   return obj;
// };

// exports.updateCourse = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid course id" });
//     }

//     // Pull in only fields you allow to be updated
//     const b = req.body || {};

//     const updates = {
//       // Basics
//       title: nonEmptyString(b.title),
//       slug: nonEmptyString(b.slug),
//       description: nonEmptyString(b.description),
//       language: nonEmptyString(b.language),
//       level: nonEmptyString(b.level), // your schema enum will validate ("Beginner"/"Intermediate"/"Advanced")
//       accessType: nonEmptyString(b.accessType),
//       thumbnail: nonEmptyString(b.thumbnail),
//       promoVideoUrl: nonEmptyString(b.promoVideoUrl),

//       // SEO
//       metaTitle: nonEmptyString(b.metaTitle),
//       metaDescription: nonEmptyString(b.metaDescription),
//       tags: Array.isArray(b.tags) ? b.tags.filter(Boolean) : undefined,
//       keywords: Array.isArray(b.keywords)
//         ? b.keywords.filter(Boolean)
//         : undefined,

//       // Marketing
//       requirements: Array.isArray(b.requirements)
//         ? b.requirements.filter(Boolean)
//         : undefined,
//       learningOutcomes: Array.isArray(b.learningOutcomes)
//         ? b.learningOutcomes.filter(Boolean)
//         : undefined,

//       // Associations / people
//       degree: normalizeId(b.degree),
//       semester: normalizeId(b.semester),
//       category: normalizeId(b.category),
//       subCategory: normalizeId(b.subCategory),
//       instructor: normalizeId(b.instructor),
//       authors: normalizeIdArray(b.authors),

//       // Learning resources
//       learningResources:
//         b.learningResources && typeof b.learningResources === "object"
//           ? compactObject({
//               videos: Array.isArray(b.learningResources.videos)
//                 ? b.learningResources.videos.filter(Boolean)
//                 : undefined,
//               pdfs: Array.isArray(b.learningResources.pdfs)
//                 ? b.learningResources.pdfs.filter(Boolean)
//                 : undefined,
//               assignments: Array.isArray(b.learningResources.assignments)
//                 ? b.learningResources.assignments.filter(Boolean)
//                 : undefined,
//               externalLinks: Array.isArray(b.learningResources.externalLinks)
//                 ? b.learningResources.externalLinks.filter(Boolean)
//                 : undefined,
//             })
//           : undefined,

//       // Access / enrollment
//       maxStudents: cleanNumber(b.maxStudents),
//       enrollmentDeadline: normalizeDate(b.enrollmentDeadline),
//       completionCriteria: nonEmptyString(b.completionCriteria),

//       // Certificate
//       issueCertificate:
//         typeof b.issueCertificate === "boolean"
//           ? b.issueCertificate
//           : undefined,
//       certificateTemplateUrl: nonEmptyString(b.certificateTemplateUrl),

//       // Flags / display
//       published: typeof b.published === "boolean" ? b.published : undefined,
//       isArchived: typeof b.isArchived === "boolean" ? b.isArchived : undefined,
//       isFeatured: typeof b.isFeatured === "boolean" ? b.isFeatured : undefined,
//       order: cleanNumber(b.order),
//       durationInHours: cleanNumber(b.durationInHours),
//       price: cleanNumber(b.price),
//       version: nonEmptyString(b.version),

//       // Modules & topics
//       modules: Array.isArray(b.modules)
//         ? b.modules.map((m) =>
//             compactObject({
//               title: nonEmptyString(m.title),
//               description: nonEmptyString(m.description),
//               topics: Array.isArray(m.topics)
//                 ? m.topics.map((t) =>
//                     compactObject({
//                       title: nonEmptyString(t.title),
//                       explanation: nonEmptyString(t.explanation),
//                       code: typeof t.code === "string" ? t.code : undefined,
//                       codeExplanation:
//                         typeof t.codeExplanation === "string"
//                           ? t.codeExplanation
//                           : undefined,
//                       codeLanguage:
//                         nonEmptyString(t.codeLanguage) || "plaintext",
//                       videoUrl: nonEmptyString(t.videoUrl),
//                       pdfUrl: nonEmptyString(t.pdfUrl),
//                       duration: cleanNumber(t.duration),
//                       isFreePreview:
//                         typeof t.isFreePreview === "boolean"
//                           ? t.isFreePreview
//                           : undefined,
//                     })
//                   )
//                 : [],
//             })
//           )
//         : undefined,
//     };

//     // Remove empty sub-objects/undefineds so we don't set "{}" into fields
//     compactObject(updates);
//     if (
//       updates.learningResources &&
//       Object.keys(updates.learningResources).length === 0
//     ) {
//       delete updates.learningResources;
//     }

//     // Do the update
//     const doc = await Course.findByIdAndUpdate(
//       id,
//       { $set: updates },
//       { new: true, runValidators: true, context: "query" }
//     );

//     if (!doc) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     return res.json(doc);
//   } catch (err) {
//     // Surface validation details so you can see exactly what failed
//     if (err && err.name === "ValidationError") {
//       const errors = {};
//       for (const [k, v] of Object.entries(err.errors || {})) {
//         errors[k] = v.message;
//       }
//       return res.status(400).json({ message: "Validation failed", errors });
//     }
//     console.error("updateCourse error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// exports.deleteCourse = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid course id" });
//     }
//     const deleted = await Course.findByIdAndDelete(id).lean();
//     if (!deleted) return res.status(404).json({ message: "Course not found" });
//     res.json({ message: "Course deleted", id: deleted._id });
//   } catch (err) {
//     console.error("deleteCourse error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* ---------------------- toggles & bulk visibility ---------------------- */

// exports.togglePublished = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid course id" });
//     }
//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     if (req.body.published !== undefined) {
//       doc.published = boolFrom(req.body.published);
//     } else {
//       doc.published = !doc.published;
//     }
//     await doc.save();
//     res.json({ id: doc._id, published: doc.published });
//   } catch (err) {
//     console.error("togglePublished error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.toggleArchived = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid course id" });
//     }
//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     if (req.body.isArchived !== undefined) {
//       doc.isArchived = boolFrom(req.body.isArchived);
//     } else {
//       doc.isArchived = !doc.isArchived;
//     }
//     await doc.save();
//     res.json({ id: doc._id, isArchived: doc.isArchived });
//   } catch (err) {
//     console.error("toggleArchived error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.toggleFeatured = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id)) {
//       return res.status(400).json({ message: "Invalid course id" });
//     }
//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     if (req.body.isFeatured !== undefined) {
//       doc.isFeatured = boolFrom(req.body.isFeatured);
//     } else {
//       doc.isFeatured = !doc.isFeatured;
//     }
//     await doc.save();
//     res.json({ id: doc._id, isFeatured: doc.isFeatured });
//   } catch (err) {
//     console.error("toggleFeatured error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // POST body: { ids:[], field: "published"|"isArchived"|"isFeatured", value: true|false }
// exports.bulkSetVisibility = async (req, res) => {
//   try {
//     const ids = toArray(req.body.ids).map(toObjectId).filter(Boolean);
//     const field = String(req.body.field || "");
//     const allowed = new Set(["published", "isArchived", "isFeatured"]);
//     if (!ids.length) return res.status(400).json({ message: "No valid ids" });
//     if (!allowed.has(field))
//       return res.status(400).json({ message: "Invalid field" });

//     const value = boolFrom(req.body.value);
//     const r = await Course.updateMany(
//       { _id: { $in: ids } },
//       { $set: { [field]: value } }
//     );
//     res.json({
//       matched: r.matchedCount ?? r.n,
//       modified: r.modifiedCount ?? r.nModified,
//     });
//   } catch (err) {
//     console.error("bulkSetVisibility error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* ----------------------------- counts / facets ----------------------------- */

// exports.countsSummary = async (_req, res) => {
//   try {
//     const [total, published, archived, featured] = await Promise.all([
//       Course.countDocuments(),
//       Course.countDocuments({ published: true }),
//       Course.countDocuments({ isArchived: true }),
//       Course.countDocuments({ isFeatured: true }),
//     ]);
//     res.json({ total, published, archived, featured });
//   } catch (err) {
//     console.error("countsSummary error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.countsByCategory = async (_req, res) => {
//   try {
//     const rows = await Course.aggregate([
//       { $group: { _id: "$category", count: { $sum: 1 } } },
//       { $sort: { count: -1 } },
//     ]);
//     res.json(rows);
//   } catch (err) {
//     console.error("countsByCategory error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.countsByLevel = async (_req, res) => {
//   try {
//     const rows = await Course.aggregate([
//       { $group: { _id: "$level", count: { $sum: 1 } } },
//       { $sort: { count: -1 } },
//     ]);
//     res.json(rows);
//   } catch (err) {
//     console.error("countsByLevel error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.countsByAccessType = async (_req, res) => {
//   try {
//     const rows = await Course.aggregate([
//       { $group: { _id: "$accessType", count: { $sum: 1 } } },
//       { $sort: { count: -1 } },
//     ]);
//     res.json(rows);
//   } catch (err) {
//     console.error("countsByAccessType error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.facets = async (_req, res) => {
//   try {
//     const [
//       languages,
//       levels,
//       tags,
//       keywords,
//       categories,
//       subCategories,
//       instructors,
//     ] = await Promise.all([
//       Course.distinct("language"),
//       Course.distinct("level"),
//       Course.distinct("tags"),
//       Course.distinct("keywords"),
//       Course.distinct("category"),
//       Course.distinct("subCategory"),
//       Course.distinct("instructor"),
//     ]);

//     res.json({
//       languages: languages.filter(Boolean).sort(),
//       levels: levels.filter(Boolean).sort(),
//       tags: tags.filter(Boolean).sort(),
//       keywords: keywords.filter(Boolean).sort(),
//       categories: categories.filter(Boolean),
//       subCategories: subCategories.filter(Boolean),
//       instructors: instructors.filter(Boolean),
//       accessTypes: ["Free", "Paid", "Subscription", "Lifetime"],
//       completionCriteria: ["All Topics", "Final Exam", "Manual Approval"],
//     });
//   } catch (err) {
//     console.error("facets error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* ----------------------------- modules & topics ----------------------------- */

// exports.addModule = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const mod = normalizeModules([req.body])[0] || {};
//     if (!mod || !mod.title) {
//       return res.status(400).json({ message: "Module title is required" });
//     }

//     doc.modules.push(mod);
//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
//     if (status >= 500) console.error("addModule error:", err);
//     res.status(status).json(payload);
//   }
// };

// exports.updateModule = async (req, res) => {
//   try {
//     const { id, mIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const idx = Number(mIndex);
//     if (!Number.isInteger(idx) || idx < 0)
//       return res.status(400).json({ message: "Invalid module index" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });
//     if (!doc.modules || !doc.modules[idx])
//       return res.status(404).json({ message: "Module not found" });

//     const patch = normalizeModules([req.body])[0] || {};
//     Object.entries(patch).forEach(([k, v]) => {
//       if (v !== undefined) doc.modules[idx][k] = v;
//     });

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
//     if (status >= 500) console.error("updateModule error:", err);
//     res.status(status).json(payload);
//   }
// };

// exports.deleteModule = async (req, res) => {
//   try {
//     const { id, mIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const idx = Number(mIndex);
//     if (!Number.isInteger(idx) || idx < 0)
//       return res.status(400).json({ message: "Invalid module index" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });
//     if (!doc.modules || !doc.modules[idx])
//       return res.status(404).json({ message: "Module not found" });

//     doc.modules.splice(idx, 1);
//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
//     if (status >= 500) console.error("deleteModule error:", err);
//     res.status(status).json(payload);
//   }
// };

// exports.addTopic = async (req, res) => {
//   try {
//     const { id, mIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const idx = Number(mIndex);
//     if (!Number.isInteger(idx) || idx < 0)
//       return res.status(400).json({ message: "Invalid module index" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });
//     const mod = doc.modules?.[idx];
//     if (!mod) return res.status(404).json({ message: "Module not found" });

//     const t = normTopic(req.body);
//     if (!t.title)
//       return res.status(400).json({ message: "Topic title is required" });

//     mod.topics = Array.isArray(mod.topics) ? mod.topics : [];
//     mod.topics.push(t);

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
//     if (status >= 500) console.error("addTopic error:", err);
//     res.status(status).json(payload);
//   }
// };

// exports.updateTopic = async (req, res) => {
//   try {
//     const { id, mIndex, tIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const mi = Number(mIndex);
//     const ti = Number(tIndex);
//     if (!Number.isInteger(mi) || mi < 0)
//       return res.status(400).json({ message: "Invalid module index" });
//     if (!Number.isInteger(ti) || ti < 0)
//       return res.status(400).json({ message: "Invalid topic index" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const mod = doc.modules?.[mi];
//     if (!mod) return res.status(404).json({ message: "Module not found" });
//     if (!mod.topics || !mod.topics[ti])
//       return res.status(404).json({ message: "Topic not found" });

//     const patch = normTopic(req.body);
//     Object.entries(patch).forEach(([k, v]) => {
//       if (v !== undefined) mod.topics[ti][k] = v;
//     });

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
//     if (status >= 500) console.error("updateTopic error:", err);
//     res.status(status).json(payload);
//   }
// };

// exports.deleteTopic = async (req, res) => {
//   try {
//     const { id, mIndex, tIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const mi = Number(mIndex);
//     const ti = Number(tIndex);
//     if (!Number.isInteger(mi) || mi < 0)
//       return res.status(400).json({ message: "Invalid module index" });
//     if (!Number.isInteger(ti) || ti < 0)
//       return res.status(400).json({ message: "Invalid topic index" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const mod = doc.modules?.[mi];
//     if (!mod) return res.status(404).json({ message: "Module not found" });
//     if (!mod.topics || !mod.topics[ti])
//       return res.status(404).json({ message: "Topic not found" });

//     mod.topics.splice(ti, 1);
//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     const payload = getErrorPayload(err);
//     const status =
//       err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
//     if (status >= 500) console.error("deleteTopic error:", err);
//     res.status(status).json(payload);
//   }
// };

// /* ----------------------------- reorder ----------------------------- */

// exports.reorderModules = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const order = parseJSON(req.body.order) || req.body.order;
//     if (!Array.isArray(order) || !Array.isArray(doc.modules)) {
//       return res.status(400).json({ message: "Invalid reorder payload" });
//     }

//     let modules = [...doc.modules];

//     if (order.length && typeof order[0] === "number") {
//       if (order.length !== modules.length) {
//         return res.status(400).json({ message: "Order length mismatch" });
//       }
//       modules = order.map((idx) => modules[idx]).filter(Boolean);
//     } else if (order.length && typeof order[0] === "object") {
//       for (const step of order) {
//         const from = Number(step.from);
//         const to = Number(step.to);
//         if (
//           Number.isInteger(from) &&
//           Number.isInteger(to) &&
//           from >= 0 &&
//           to >= 0 &&
//           from < modules.length &&
//           to < modules.length
//         ) {
//           const [m] = modules.splice(from, 1);
//           modules.splice(to, 0, m);
//         }
//       }
//     } else {
//       return res.status(400).json({ message: "Unsupported reorder format" });
//     }

//     doc.modules = modules;
//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("reorderModules error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.reorderTopics = async (req, res) => {
//   try {
//     const { id, mIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const idx = Number(mIndex);
//     if (!Number.isInteger(idx) || idx < 0)
//       return res.status(400).json({ message: "Invalid module index" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const mod = doc.modules?.[idx];
//     if (!mod) return res.status(404).json({ message: "Module not found" });

//     const order = parseJSON(req.body.order) || req.body.order;
//     if (!Array.isArray(order) || !Array.isArray(mod.topics)) {
//       return res.status(400).json({ message: "Invalid reorder payload" });
//     }

//     let topics = [...mod.topics];

//     if (order.length && typeof order[0] === "number") {
//       if (order.length !== topics.length) {
//         return res.status(400).json({ message: "Order length mismatch" });
//       }
//       topics = order.map((idx) => topics[idx]).filter(Boolean);
//     } else if (order.length && typeof order[0] === "object") {
//       for (const step of order) {
//         const from = Number(step.from);
//         const to = Number(step.to);
//         if (
//           Number.isInteger(from) &&
//           Number.isInteger(to) &&
//           from >= 0 &&
//           to >= 0 &&
//           from < topics.length &&
//           to < topics.length
//         ) {
//           const [t] = topics.splice(from, 1);
//           topics.splice(to, 0, t);
//         }
//       }
//     } else {
//       return res.status(400).json({ message: "Unsupported reorder format" });
//     }

//     mod.topics = topics;
//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("reorderTopics error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* ----------------------------- enrollment ----------------------------- */

// exports.enrollStudent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const studentId = normalizeObjectId(req.body.studentId);
//     if (!studentId)
//       return res.status(400).json({ message: "Invalid studentId" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     doc.enrolledStudents = Array.isArray(doc.enrolledStudents)
//       ? doc.enrolledStudents
//       : [];

//     const already = doc.enrolledStudents.find(
//       (s) => String(s.studentId) === String(studentId)
//     );
//     if (already) return res.status(409).json({ message: "Already enrolled" });

//     doc.enrolledStudents.push({
//       studentId,
//       enrolledAt: new Date(),
//       completed: false,
//       progress: 0,
//       completedTopics: [],
//       certificateIssued: false,
//     });

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("enrollStudent error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.updateEnrollment = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const studentId = normalizeObjectId(req.body.studentId);
//     if (!studentId)
//       return res.status(400).json({ message: "Invalid studentId" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const idx = (doc.enrolledStudents || []).findIndex(
//       (s) => String(s.studentId) === String(studentId)
//     );
//     if (idx === -1)
//       return res.status(404).json({ message: "Enrollment not found" });

//     const patch = {};
//     if (req.body.progress !== undefined) {
//       const n = toNumber(req.body.progress);
//       if (n !== undefined) patch.progress = Math.max(0, Math.min(100, n));
//     }
//     if (req.body.completed !== undefined)
//       patch.completed = boolFrom(req.body.completed);
//     if (req.body.certificateIssued !== undefined)
//       patch.certificateIssued = boolFrom(req.body.certificateIssued);
//     if (req.body.completedTopics !== undefined)
//       patch.completedTopics = normalizeStringArray(req.body.completedTopics);

//     Object.assign(doc.enrolledStudents[idx], stripEmptyDeep(patch));

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("updateEnrollment error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.unenrollStudent = async (req, res) => {
//   try {
//     const { id, studentId: sid } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const studentId = normalizeObjectId(sid);
//     if (!studentId)
//       return res.status(400).json({ message: "Invalid studentId" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const before = doc.enrolledStudents?.length || 0;
//     doc.enrolledStudents = (doc.enrolledStudents || []).filter(
//       (s) => String(s.studentId) !== String(studentId)
//     );

//     if ((doc.enrolledStudents?.length || 0) === before) {
//       return res.status(404).json({ message: "Enrollment not found" });
//     }

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("unenrollStudent error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* ----------------------------- ratings ----------------------------- */

// exports.addOrUpdateRating = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const studentId = normalizeObjectId(req.body.studentId);
//     const rating = toNumber(req.body.rating);
//     if (!studentId)
//       return res.status(400).json({ message: "Invalid studentId" });
//     if (rating === undefined || rating < 1 || rating > 5)
//       return res.status(400).json({ message: "rating must be 1..5" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     doc.ratings = Array.isArray(doc.ratings) ? doc.ratings : [];
//     const idx = doc.ratings.findIndex(
//       (r) => String(r.studentId) === String(studentId)
//     );

//     if (idx >= 0) {
//       doc.ratings[idx].rating = rating;
//       if (req.body.review !== undefined)
//         doc.ratings[idx].review = normalizeString(req.body.review);
//       doc.ratings[idx].createdAt = new Date();
//     } else {
//       doc.ratings.push({
//         studentId,
//         rating,
//         review: normalizeString(req.body.review),
//         createdAt: new Date(),
//       });
//     }

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("addOrUpdateRating error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* ----------------------------- threads (Q&A) ----------------------------- */

// exports.addThread = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const userId = normalizeObjectId(req.body.userId);
//     const message = normalizeString(req.body.message);
//     if (!userId || !message)
//       return res
//         .status(400)
//         .json({ message: "userId and message are required" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     doc.discussionThreads = Array.isArray(doc.discussionThreads)
//       ? doc.discussionThreads
//       : [];
//     doc.discussionThreads.push({
//       userId,
//       message,
//       createdAt: new Date(),
//       replies: [],
//     });

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("addThread error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// exports.addReply = async (req, res) => {
//   try {
//     const { id, tIndex } = req.params;
//     if (!isValidObjectId(id))
//       return res.status(400).json({ message: "Invalid course id" });
//     const ti = Number(tIndex);
//     if (!Number.isInteger(ti) || ti < 0)
//       return res.status(400).json({ message: "Invalid thread index" });

//     const userId = normalizeObjectId(req.body.userId);
//     const message = normalizeString(req.body.message);
//     if (!userId || !message)
//       return res
//         .status(400)
//         .json({ message: "userId and message are required" });

//     const doc = await Course.findById(id);
//     if (!doc) return res.status(404).json({ message: "Course not found" });

//     const th = doc.discussionThreads?.[ti];
//     if (!th) return res.status(404).json({ message: "Thread not found" });

//     th.replies = Array.isArray(th.replies) ? th.replies : [];
//     th.replies.push({ userId, message, createdAt: new Date() });

//     await doc.save();
//     res.json(doc.toObject());
//   } catch (err) {
//     console.error("addReply error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

//

// controllers/CourseController.js
const mongoose = require("mongoose");
const Course = require("../models/CourseModel");

const { Types } = mongoose;

/* ----------------------------- helpers ------------------------------ */

const toObjectId = (v) => {
  try {
    if (!v) return null;
    return new Types.ObjectId(v);
  } catch {
    return null;
  }
};

const isValidObjectId = (v) => Types.ObjectId.isValid(String(v || ""));

const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const boolFrom = (v) =>
  typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);

const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return v
      .split(",")
      .map((x) => String(x).trim())
      .filter(Boolean);
  }
  return v ? [v] : [];
};

const parseJSON = (v) => {
  if (v == null) return v;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
};

const toNumber = (v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const toDate = (v) => {
  if (v === "" || v == null) return undefined;
  const d = new Date(v);
  return isNaN(d) ? undefined : d;
};

const normalizeString = (v) => (v == null ? undefined : String(v).trim());

const normalizeStringArray = (v) => {
  const arr = toArray(v);
  return arr.map((s) => String(s).trim()).filter(Boolean);
};

const normalizeObjectId = (v) => {
  const id = toObjectId(v);
  return id || undefined;
};

// Deeply remove undefined / empty-string values from plain objects/arrays
const stripEmptyDeep = (val) => {
  if (Array.isArray(val)) {
    const arr = val.map(stripEmptyDeep).filter((x) => x !== undefined);
    return arr;
  }
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      const nv = stripEmptyDeep(v);
      if (nv !== undefined) out[k] = nv;
    }
    return out;
  }
  if (val === "") return undefined;
  return val;
};

// Format mongoose errors into a consistent shape
const getErrorPayload = (err) => {
  if (!err) return { message: "Unknown error" };

  if (err.name === "ValidationError") {
    const details = {};
    for (const [path, e] of Object.entries(err.errors || {})) {
      details[path] = e.message;
    }
    return { message: "Validation failed", errors: details };
  }

  if (err.name === "CastError") {
    return {
      message: `Invalid value for "${err.path}"`,
      path: err.path,
      value: err.value,
      kind: err.kind,
    };
  }

  if (err.name === "StrictModeError") {
    return { message: err.message };
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    return { message: `Duplicate value for: ${fields.join(", ")}` };
  }

  return { message: err.message || "Server error" };
};

/* ---------- topic / module normalizers ---------- */

const normTopic = (t = {}) => {
  const o = {};
  if (t.title !== undefined) o.title = normalizeString(t.title);

  // learning content
  if (t.explanation !== undefined)
    o.explanation = normalizeString(t.explanation);
  if (t.code !== undefined)
    o.code = t.code == null ? undefined : String(t.code);
  if (t.codeExplanation !== undefined)
    o.codeExplanation = normalizeString(t.codeExplanation);
  if (t.codeLanguage !== undefined)
    o.codeLanguage = normalizeString(t.codeLanguage);

  // media/metadata
  if (t.videoUrl !== undefined) o.videoUrl = normalizeString(t.videoUrl);
  if (t.pdfUrl !== undefined) o.pdfUrl = normalizeString(t.pdfUrl);
  if (t.duration !== undefined) {
    const n = toNumber(t.duration);
    if (n !== undefined) o.duration = n;
  }
  if (t.isFreePreview !== undefined)
    o.isFreePreview = boolFrom(t.isFreePreview);

  return stripEmptyDeep(o);
};

const normalizeModules = (input) => {
  let mods = input;
  if (typeof input === "string") {
    const parsed = parseJSON(input);
    if (Array.isArray(parsed)) mods = parsed;
  }
  if (!Array.isArray(mods)) return undefined;

  return mods.map((m) => {
    const out = {};
    if (m.title !== undefined) out.title = normalizeString(m.title);
    if (m.description !== undefined)
      out.description = normalizeString(m.description);

    let topics = m.topics;
    if (typeof topics === "string") {
      const parsed = parseJSON(topics);
      if (Array.isArray(parsed)) topics = parsed;
    }
    if (Array.isArray(topics)) out.topics = topics.map(normTopic);

    return stripEmptyDeep(out);
  });
};

const normalizeLearningResources = (v) => {
  if (v === undefined) return undefined;

  let obj = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (parsed && typeof parsed === "object") obj = parsed;
  }
  if (!obj || typeof obj !== "object") return undefined;

  const out = {};
  if (obj.videos !== undefined) out.videos = normalizeStringArray(obj.videos);
  if (obj.pdfs !== undefined) out.pdfs = normalizeStringArray(obj.pdfs);
  if (obj.assignments !== undefined)
    out.assignments = normalizeStringArray(obj.assignments);
  if (obj.externalLinks !== undefined)
    out.externalLinks = normalizeStringArray(obj.externalLinks);
  return stripEmptyDeep(out);
};

const normalizeEnrolledStudents = (v) => {
  if (v === undefined) return undefined;

  let arr = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (Array.isArray(parsed)) arr = parsed;
  }
  if (!Array.isArray(arr)) return undefined;

  return arr.map((s) => {
    const out = {};
    if (s.studentId !== undefined)
      out.studentId = normalizeObjectId(s.studentId);
    if (s.enrolledAt !== undefined) {
      const d = toDate(s.enrolledAt);
      if (d !== undefined) out.enrolledAt = d;
    }
    if (s.completed !== undefined) out.completed = boolFrom(s.completed);
    if (s.progress !== undefined) {
      const n = toNumber(s.progress);
      if (n !== undefined) out.progress = n;
    }
    if (s.completedTopics !== undefined)
      out.completedTopics = normalizeStringArray(s.completedTopics);
    if (s.certificateIssued !== undefined)
      out.certificateIssued = boolFrom(s.certificateIssued);
    return stripEmptyDeep(out);
  });
};

const normalizeRatings = (v) => {
  if (v === undefined) return undefined;

  let arr = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (Array.isArray(parsed)) arr = parsed;
  }
  if (!Array.isArray(arr)) return undefined;

  return arr.map((r) => {
    const out = {};
    if (r.studentId !== undefined)
      out.studentId = normalizeObjectId(r.studentId);
    if (r.rating !== undefined) {
      const n = toNumber(r.rating);
      if (n !== undefined) out.rating = n;
    }
    if (r.review !== undefined) out.review = normalizeString(r.review);
    if (r.createdAt !== undefined) {
      const d = toDate(r.createdAt);
      if (d !== undefined) out.createdAt = d;
    }
    return stripEmptyDeep(out);
  });
};

const normalizeThreads = (v) => {
  if (v === undefined) return undefined;

  let arr = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (Array.isArray(parsed)) arr = parsed;
  }
  if (!Array.isArray(arr)) return undefined;

  return arr.map((th) => {
    const out = {};
    if (th.userId !== undefined) out.userId = normalizeObjectId(th.userId);
    if (th.message !== undefined) out.message = normalizeString(th.message);
    if (th.createdAt !== undefined) {
      const d = toDate(th.createdAt);
      if (d !== undefined) out.createdAt = d;
    }
    if (th.replies !== undefined) {
      let reps = th.replies;
      if (typeof reps === "string") {
        const parsed = parseJSON(reps);
        if (Array.isArray(parsed)) reps = parsed;
      }
      if (Array.isArray(reps)) {
        out.replies = reps.map((rp) => {
          const r = {};
          if (rp.userId !== undefined) r.userId = normalizeObjectId(rp.userId);
          if (rp.message !== undefined) r.message = normalizeString(rp.message);
          if (rp.createdAt !== undefined) {
            const d = toDate(rp.createdAt);
            if (d !== undefined) r.createdAt = d;
          }
          return stripEmptyDeep(r);
        });
      }
    }
    return stripEmptyDeep(out);
  });
};

const normalizeCourseInput = (payload = {}) => {
  const out = {};

  // Basic info
  if (payload.title !== undefined) out.title = normalizeString(payload.title);
  if (payload.slug !== undefined)
    out.slug = normalizeString(payload.slug)?.toLowerCase();
  if (payload.description !== undefined)
    out.description = normalizeString(payload.description);
  if (payload.language !== undefined)
    out.language = normalizeString(payload.language);
  if (payload.level !== undefined) out.level = normalizeString(payload.level);
  if (payload.thumbnail !== undefined)
    out.thumbnail = normalizeString(payload.thumbnail);
  if (payload.promoVideoUrl !== undefined)
    out.promoVideoUrl = normalizeString(payload.promoVideoUrl);

  if (payload.durationInHours !== undefined) {
    const n = toNumber(payload.durationInHours);
    if (n !== undefined) out.durationInHours = n;
  }

  if (payload.price !== undefined) {
    const n = toNumber(payload.price);
    if (n !== undefined) out.price = n;
  }

  // Categorization
  if (payload.category !== undefined)
    out.category = normalizeObjectId(payload.category);
  if (payload.subCategory !== undefined)
    out.subCategory = normalizeObjectId(payload.subCategory);

  // Degree / Semister (optional)
  if (payload.degree !== undefined)
    out.degree = normalizeObjectId(payload.degree);
  if (payload.semester !== undefined)
    out.semester = normalizeObjectId(payload.semester);

  // Marketing
  if (payload.requirements !== undefined)
    out.requirements = normalizeStringArray(payload.requirements);
  if (payload.learningOutcomes !== undefined)
    out.learningOutcomes = normalizeStringArray(payload.learningOutcomes);
  if (payload.tags !== undefined) out.tags = normalizeStringArray(payload.tags);
  if (payload.metaTitle !== undefined)
    out.metaTitle = normalizeString(payload.metaTitle);
  if (payload.metaDescription !== undefined)
    out.metaDescription = normalizeString(payload.metaDescription);
  if (payload.keywords !== undefined)
    out.keywords = normalizeStringArray(payload.keywords);

  // People
  if (payload.authors !== undefined) {
    out.authors = toArray(payload.authors)
      .map(normalizeObjectId)
      .filter(Boolean);
  }
  if (payload.instructor !== undefined)
    out.instructor = normalizeObjectId(payload.instructor);

  // Content
  if (payload.modules !== undefined)
    out.modules = normalizeModules(payload.modules);

  if (payload.totalModules !== undefined) {
    const n = toNumber(payload.totalModules);
    if (n !== undefined) out.totalModules = n;
  }
  if (payload.totalTopics !== undefined) {
    const n = toNumber(payload.totalTopics);
    if (n !== undefined) out.totalTopics = n;
  }

  // Learning resources
  if (payload.learningResources !== undefined)
    out.learningResources = normalizeLearningResources(
      payload.learningResources
    );

  // Access
  if (payload.accessType !== undefined)
    out.accessType = normalizeString(payload.accessType);
  if (payload.maxStudents !== undefined) {
    const n = toNumber(payload.maxStudents);
    if (n !== undefined) out.maxStudents = n;
  }
  if (payload.enrollmentDeadline !== undefined) {
    // allow explicit null to clear, string/Date otherwise
    if (payload.enrollmentDeadline === null) {
      out.enrollmentDeadline = null;
    } else {
      const d = toDate(payload.enrollmentDeadline);
      if (d !== undefined) out.enrollmentDeadline = d;
    }
  }
  if (payload.completionCriteria !== undefined)
    out.completionCriteria = normalizeString(payload.completionCriteria);

  // ⬇️ ENFORCE FREE ⇒ PRICE = 0
  if ((out.accessType || "").toLowerCase() === "free") {
    out.price = 0;
  }

  // Enrollment
  if (payload.enrolledStudents !== undefined)
    out.enrolledStudents = normalizeEnrolledStudents(payload.enrolledStudents);

  // Certificate
  if (payload.issueCertificate !== undefined)
    out.issueCertificate = boolFrom(payload.issueCertificate);
  if (payload.certificateTemplateUrl !== undefined)
    out.certificateTemplateUrl = normalizeString(
      payload.certificateTemplateUrl
    );

  // Ratings
  if (payload.ratings !== undefined)
    out.ratings = normalizeRatings(payload.ratings);
  if (payload.averageRating !== undefined) {
    const n = toNumber(payload.averageRating);
    if (n !== undefined) out.averageRating = n;
  }

  // Q&A
  if (payload.discussionThreads !== undefined)
    out.discussionThreads = normalizeThreads(payload.discussionThreads);

  // Flags
  if (payload.published !== undefined)
    out.published = boolFrom(payload.published);
  if (payload.isArchived !== undefined)
    out.isArchived = boolFrom(payload.isArchived);
  if (payload.isFeatured !== undefined)
    out.isFeatured = boolFrom(payload.isFeatured);
  if (payload.order !== undefined) {
    const n = toNumber(payload.order);
    if (n !== undefined) out.order = n;
  }

  // Version
  if (payload.version !== undefined)
    out.version = normalizeString(payload.version);

  return stripEmptyDeep(out);
};

/* ------------- only allow setting known schema paths ------------- */

const pickSchemaPaths = (data) => {
  const allowed = new Set(Object.keys(Course.schema.paths));
  // allow nested arrays/objects by top-level keys (modules, learningResources, etc.)
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
};

/* ----------------------------- CRUD ------------------------------ */

exports.createCourse = async (req, res) => {
  try {
    let data = normalizeCourseInput(req.body);

    // ⬇️ ENFORCE AGAIN (defensive)
    if ((data.accessType || "").toLowerCase() === "free") {
      data.price = 0;
    }

    const missing = [];
    if (!data.title) missing.push("title");
    if (!data.description) missing.push("description");
    if (data.durationInHours == null) missing.push("durationInHours");
    if (!data.category) missing.push("category");
    if (!data.subCategory) missing.push("subCategory");
    if (!data.instructor) missing.push("instructor");

    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    const doc = new Course(data);
    await doc.save();
    res.status(201).json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError"
        ? 400
        : err?.code === 11000
        ? 409
        : 500;
    if (status >= 500) console.error("createCourse error:", err);
    res.status(status).json(payload);
  }
};

exports.listCourses = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
    const limit = Math.max(
      1,
      Math.min(5000, parseInt(req.query.limit ?? "20", 10))
    );
    const sortBy = (req.query.sortBy || "createdAt").toString();
    const order =
      (req.query.order || "desc").toString().toLowerCase() === "asc" ? 1 : -1;
    const search = (req.query.search || "").trim();

    const q = {};
    if (search) {
      q.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { shortDescription: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Course.countDocuments(q);

    const items = await Course.find(q)
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category", "category_name name")
      .lean();

    res.json({
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        sortBy,
        order: order === 1 ? "asc" : "desc",
      },
    });
  } catch (err) {
    console.error("listCourses error:", err);
    res.status(500).json({ message: "Failed to list courses" });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course id" });
    }
    const doc = await Course.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Course not found" });
    res.json(doc);
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCourseBySlug = async (req, res) => {
  try {
    const doc = await Course.findOne({ slug: req.params.slug }).lean();
    if (!doc) return res.status(404).json({ message: "Course not found" });
    res.json(doc);
  } catch (err) {
    console.error("getCourseBySlug error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Use save() so pre-save recomputes totals/average
const isHexId = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

const normalizeId = (v) => {
  if (v == null || v === "") return undefined;
  if (typeof v === "string") return isHexId(v) ? v : undefined;

  // Mongoose ObjectId instance or object with _id
  if (Types.ObjectId.isValid(v)) return String(v);
  if (v && typeof v === "object") {
    if (v._id && isHexId(String(v._id))) return String(v._id);
    if (v.$oid && isHexId(String(v.$oid))) return String(v.$oid);
    const s = v.toString?.();
    if (typeof s === "string" && isHexId(s)) return s;
  }
  return undefined;
};

const normalizeIdArray = (arr) => {
  if (!Array.isArray(arr)) return undefined;
  const out = arr
    .map((x) => (typeof x === "string" ? x.trim() : x))
    .map(normalizeId)
    .filter(Boolean);
  return out.length ? out : undefined;
};

const normalizeDate = (v) => {
  if (!v) return undefined;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (v && typeof v === "object" && v.$date) {
    const d = new Date(v.$date);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const cleanNumber = (v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const nonEmptyString = (v) =>
  typeof v === "string" && v.trim().length ? v.trim() : undefined;

const compactObject = (obj) => {
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (typeof v === "object" &&
        !Array.isArray(v) &&
        v !== null &&
        Object.keys(v).length === 0)
    ) {
      delete obj[k];
    }
  });
  return obj;
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    // Pull in only fields you allow to be updated
    const b = req.body || {};

    const updates = {
      // Basics
      title: nonEmptyString(b.title),
      slug: nonEmptyString(b.slug),
      description: nonEmptyString(b.description),
      language: nonEmptyString(b.language),
      level: nonEmptyString(b.level), // enum validated by schema
      accessType: nonEmptyString(b.accessType),
      thumbnail: nonEmptyString(b.thumbnail),
      promoVideoUrl: nonEmptyString(b.promoVideoUrl),

      // SEO
      metaTitle: nonEmptyString(b.metaTitle),
      metaDescription: nonEmptyString(b.metaDescription),
      tags: Array.isArray(b.tags) ? b.tags.filter(Boolean) : undefined,
      keywords: Array.isArray(b.keywords)
        ? b.keywords.filter(Boolean)
        : undefined,

      // Marketing
      requirements: Array.isArray(b.requirements)
        ? b.requirements.filter(Boolean)
        : undefined,
      learningOutcomes: Array.isArray(b.learningOutcomes)
        ? b.learningOutcomes.filter(Boolean)
        : undefined,

      // Associations / people
      degree: normalizeId(b.degree),
      semester: normalizeId(b.semester),
      category: normalizeId(b.category),
      subCategory: normalizeId(b.subCategory),
      instructor: normalizeId(b.instructor),
      authors: normalizeIdArray(b.authors),

      // Learning resources
      learningResources:
        b.learningResources && typeof b.learningResources === "object"
          ? compactObject({
              videos: Array.isArray(b.learningResources.videos)
                ? b.learningResources.videos.filter(Boolean)
                : undefined,
              pdfs: Array.isArray(b.learningResources.pdfs)
                ? b.learningResources.pdfs.filter(Boolean)
                : undefined,
              assignments: Array.isArray(b.learningResources.assignments)
                ? b.learningResources.assignments.filter(Boolean)
                : undefined,
              externalLinks: Array.isArray(b.learningResources.externalLinks)
                ? b.learningResources.externalLinks.filter(Boolean)
                : undefined,
            })
          : undefined,

      // Access / enrollment
      maxStudents: cleanNumber(b.maxStudents),
      enrollmentDeadline: normalizeDate(b.enrollmentDeadline),
      completionCriteria: nonEmptyString(b.completionCriteria),

      // Certificate
      issueCertificate:
        typeof b.issueCertificate === "boolean"
          ? b.issueCertificate
          : undefined,
      certificateTemplateUrl: nonEmptyString(b.certificateTemplateUrl),

      // Flags / display
      published: typeof b.published === "boolean" ? b.published : undefined,
      isArchived: typeof b.isArchived === "boolean" ? b.isArchived : undefined,
      isFeatured: typeof b.isFeatured === "boolean" ? b.isFeatured : undefined,
      order: cleanNumber(b.order),
      durationInHours: cleanNumber(b.durationInHours),
      price: cleanNumber(b.price),
      version: nonEmptyString(b.version),

      // Modules & topics
      modules: Array.isArray(b.modules)
        ? b.modules.map((m) =>
            compactObject({
              title: nonEmptyString(m.title),
              description: nonEmptyString(m.description),
              topics: Array.isArray(m.topics)
                ? m.topics.map((t) =>
                    compactObject({
                      title: nonEmptyString(t.title),
                      explanation: nonEmptyString(t.explanation),
                      code: typeof t.code === "string" ? t.code : undefined,
                      codeExplanation:
                        typeof t.codeExplanation === "string"
                          ? t.codeExplanation
                          : undefined,
                      codeLanguage:
                        nonEmptyString(t.codeLanguage) || "plaintext",
                      videoUrl: nonEmptyString(t.videoUrl),
                      pdfUrl: nonEmptyString(t.pdfUrl),
                      duration: cleanNumber(t.duration),
                      isFreePreview:
                        typeof t.isFreePreview === "boolean"
                          ? t.isFreePreview
                          : undefined,
                    })
                  )
                : [],
            })
          )
        : undefined,
    };

    // Remove empty sub-objects/undefineds so we don't set "{}" into fields
    compactObject(updates);
    if (
      updates.learningResources &&
      Object.keys(updates.learningResources).length === 0
    ) {
      delete updates.learningResources;
    }

    // ⬇️ ENFORCE FREE ⇒ PRICE = 0 ON UPDATE
    if ((updates.accessType || "").toLowerCase() === "free") {
      updates.price = 0;
    }

    // Do the update
    const doc = await Course.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true, context: "query" }
    );

    if (!doc) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json(doc);
  } catch (err) {
    // Surface validation details so you can see exactly what failed
    if (err && err.name === "ValidationError") {
      const errors = {};
      for (const [k, v] of Object.entries(err.errors || {})) {
        errors[k] = v.message;
      }
      return res.status(400).json({ message: "Validation failed", errors });
    }
    console.error("updateCourse error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course id" });
    }
    const deleted = await Course.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course deleted", id: deleted._id });
  } catch (err) {
    console.error("deleteCourse error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------- toggles & bulk visibility ---------------------- */

exports.togglePublished = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course id" });
    }
    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    if (req.body.published !== undefined) {
      doc.published = boolFrom(req.body.published);
    } else {
      doc.published = !doc.published;
    }
    await doc.save();
    res.json({ id: doc._id, published: doc.published });
  } catch (err) {
    console.error("togglePublished error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleArchived = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course id" });
    }
    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    if (req.body.isArchived !== undefined) {
      doc.isArchived = boolFrom(req.body.isArchived);
    } else {
      doc.isArchived = !doc.isArchived;
    }
    await doc.save();
    res.json({ id: doc._id, isArchived: doc.isArchived });
  } catch (err) {
    console.error("toggleArchived error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid course id" });
    }
    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    if (req.body.isFeatured !== undefined) {
      doc.isFeatured = boolFrom(req.body.isFeatured);
    } else {
      doc.isFeatured = !doc.isFeatured;
    }
    await doc.save();
    res.json({ id: doc._id, isFeatured: doc.isFeatured });
  } catch (err) {
    console.error("toggleFeatured error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST body: { ids:[], field: "published"|"isArchived"|"isFeatured", value: true|false }
exports.bulkSetVisibility = async (req, res) => {
  try {
    const ids = toArray(req.body.ids).map(toObjectId).filter(Boolean);
    const field = String(req.body.field || "");
    const allowed = new Set(["published", "isArchived", "isFeatured"]);
    if (!ids.length) return res.status(400).json({ message: "No valid ids" });
    if (!allowed.has(field))
      return res.status(400).json({ message: "Invalid field" });

    const value = boolFrom(req.body.value);
    const r = await Course.updateMany(
      { _id: { $in: ids } },
      { $set: { [field]: value } }
    );
    res.json({
      matched: r.matchedCount ?? r.n,
      modified: r.modifiedCount ?? r.nModified,
    });
  } catch (err) {
    console.error("bulkSetVisibility error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- counts / facets ----------------------------- */

exports.countsSummary = async (_req, res) => {
  try {
    const [total, published, archived, featured] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ published: true }),
      Course.countDocuments({ isArchived: true }),
      Course.countDocuments({ isFeatured: true }),
    ]);
    res.json({ total, published, archived, featured });
  } catch (err) {
    console.error("countsSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countsByCategory = async (_req, res) => {
  try {
    const rows = await Course.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countsByLevel = async (_req, res) => {
  try {
    const rows = await Course.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByLevel error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countsByAccessType = async (_req, res) => {
  try {
    const rows = await Course.aggregate([
      { $group: { _id: "$accessType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByAccessType error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.facets = async (_req, res) => {
  try {
    const [
      languages,
      levels,
      tags,
      keywords,
      categories,
      subCategories,
      instructors,
    ] = await Promise.all([
      Course.distinct("language"),
      Course.distinct("level"),
      Course.distinct("tags"),
      Course.distinct("keywords"),
      Course.distinct("category"),
      Course.distinct("subCategory"),
      Course.distinct("instructor"),
    ]);

    res.json({
      languages: languages.filter(Boolean).sort(),
      levels: levels.filter(Boolean).sort(),
      tags: tags.filter(Boolean).sort(),
      keywords: keywords.filter(Boolean).sort(),
      categories: categories.filter(Boolean),
      subCategories: subCategories.filter(Boolean),
      instructors: instructors.filter(Boolean),
      accessTypes: ["Free", "Paid", "Subscription", "Lifetime"],
      completionCriteria: ["All Topics", "Final Exam", "Manual Approval"],
    });
  } catch (err) {
    console.error("facets error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- modules & topics ----------------------------- */

exports.addModule = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = normalizeModules([req.body])[0] || {};
    if (!mod || !mod.title) {
      return res.status(400).json({ message: "Module title is required" });
    }

    doc.modules.push(mod);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
    if (status >= 500) console.error("addModule error:", err);
    res.status(status).json(payload);
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { id, mIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const idx = Number(mIndex);
    if (!Number.isInteger(idx) || idx < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });
    if (!doc.modules || !doc.modules[idx])
      return res.status(404).json({ message: "Module not found" });

    const patch = normalizeModules([req.body])[0] || {};
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== undefined) doc.modules[idx][k] = v;
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
    if (status >= 500) console.error("updateModule error:", err);
    res.status(status).json(payload);
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { id, mIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const idx = Number(mIndex);
    if (!Number.isInteger(idx) || idx < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });
    if (!doc.modules || !doc.modules[idx])
      return res.status(404).json({ message: "Module not found" });

    doc.modules.splice(idx, 1);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
    if (status >= 500) console.error("deleteModule error:", err);
    res.status(status).json(payload);
  }
};

exports.addTopic = async (req, res) => {
  try {
    const { id, mIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const idx = Number(mIndex);
    if (!Number.isInteger(idx) || idx < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });
    const mod = doc.modules?.[idx];
    if (!mod) return res.status(404).json({ message: "Module not found" });

    const t = normTopic(req.body);
    if (!t.title)
      return res.status(400).json({ message: "Topic title is required" });

    mod.topics = Array.isArray(mod.topics) ? mod.topics : [];
    mod.topics.push(t);

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
    if (status >= 500) console.error("addTopic error:", err);
    res.status(status).json(payload);
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { id, mIndex, tIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const mi = Number(mIndex);
    const ti = Number(tIndex);
    if (!Number.isInteger(mi) || mi < 0)
      return res.status(400).json({ message: "Invalid module index" });
    if (!Number.isInteger(ti) || ti < 0)
      return res.status(400).json({ message: "Invalid topic index" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = doc.modules?.[mi];
    if (!mod) return res.status(404).json({ message: "Module not found" });
    if (!mod.topics || !mod.topics[ti])
      return res.status(404).json({ message: "Topic not found" });

    const patch = normTopic(req.body);
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== undefined) mod.topics[ti][k] = v;
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
    if (status >= 500) console.error("updateTopic error:", err);
    res.status(status).json(payload);
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const { id, mIndex, tIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const mi = Number(mIndex);
    const ti = Number(tIndex);
    if (!Number.isInteger(mi) || mi < 0)
      return res.status(400).json({ message: "Invalid module index" });
    if (!Number.isInteger(ti) || ti < 0)
      return res.status(400).json({ message: "Invalid topic index" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = doc.modules?.[mi];
    if (!mod) return res.status(404).json({ message: "Module not found" });
    if (!mod.topics || !mod.topics[ti])
      return res.status(404).json({ message: "Topic not found" });

    mod.topics.splice(ti, 1);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    const payload = getErrorPayload(err);
    const status =
      err?.name === "ValidationError" || err?.name === "CastError" ? 400 : 500;
    if (status >= 500) console.error("deleteTopic error:", err);
    res.status(status).json(payload);
  }
};

/* ----------------------------- reorder ----------------------------- */

exports.reorderModules = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const order = parseJSON(req.body.order) || req.body.order;
    if (!Array.isArray(order) || !Array.isArray(doc.modules)) {
      return res.status(400).json({ message: "Invalid reorder payload" });
    }

    let modules = [...doc.modules];

    if (order.length && typeof order[0] === "number") {
      if (order.length !== modules.length) {
        return res.status(400).json({ message: "Order length mismatch" });
      }
      modules = order.map((idx) => modules[idx]).filter(Boolean);
    } else if (order.length && typeof order[0] === "object") {
      for (const step of order) {
        const from = Number(step.from);
        const to = Number(step.to);
        if (
          Number.isInteger(from) &&
          Number.isInteger(to) &&
          from >= 0 &&
          to >= 0 &&
          from < modules.length &&
          to < modules.length
        ) {
          const [m] = modules.splice(from, 1);
          modules.splice(to, 0, m);
        }
      }
    } else {
      return res.status(400).json({ message: "Unsupported reorder format" });
    }

    doc.modules = modules;
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("reorderModules error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.reorderTopics = async (req, res) => {
  try {
    const { id, mIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const idx = Number(mIndex);
    if (!Number.isInteger(idx) || idx < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = doc.modules?.[idx];
    if (!mod) return res.status(404).json({ message: "Module not found" });

    const order = parseJSON(req.body.order) || req.body.order;
    if (!Array.isArray(order) || !Array.isArray(mod.topics)) {
      return res.status(400).json({ message: "Invalid reorder payload" });
    }

    let topics = [...mod.topics];

    if (order.length && typeof order[0] === "number") {
      if (order.length !== topics.length) {
        return res.status(400).json({ message: "Order length mismatch" });
      }
      topics = order.map((idx) => topics[idx]).filter(Boolean);
    } else if (order.length && typeof order[0] === "object") {
      for (const step of order) {
        const from = Number(step.from);
        const to = Number(step.to);
        if (
          Number.isInteger(from) &&
          Number.isInteger(to) &&
          from >= 0 &&
          to >= 0 &&
          from < topics.length &&
          to < topics.length
        ) {
          const [t] = topics.splice(from, 1);
          topics.splice(to, 0, t);
        }
      }
    } else {
      return res.status(400).json({ message: "Unsupported reorder format" });
    }

    mod.topics = topics;
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("reorderTopics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- enrollment ----------------------------- */

exports.enrollStudent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const studentId = normalizeObjectId(req.body.studentId);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    doc.enrolledStudents = Array.isArray(doc.enrolledStudents)
      ? doc.enrolledStudents
      : [];

    const already = doc.enrolledStudents.find(
      (s) => String(s.studentId) === String(studentId)
    );
    if (already) return res.status(409).json({ message: "Already enrolled" });

    doc.enrolledStudents.push({
      studentId,
      enrolledAt: new Date(),
      completed: false,
      progress: 0,
      completedTopics: [],
      certificateIssued: false,
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("enrollStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const studentId = normalizeObjectId(req.body.studentId);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const idx = (doc.enrolledStudents || []).findIndex(
      (s) => String(s.studentId) === String(studentId)
    );
    if (idx === -1)
      return res.status(404).json({ message: "Enrollment not found" });

    const patch = {};
    if (req.body.progress !== undefined) {
      const n = toNumber(req.body.progress);
      if (n !== undefined) patch.progress = Math.max(0, Math.min(100, n));
    }
    if (req.body.completed !== undefined)
      patch.completed = boolFrom(req.body.completed);
    if (req.body.certificateIssued !== undefined)
      patch.certificateIssued = boolFrom(req.body.certificateIssued);
    if (req.body.completedTopics !== undefined)
      patch.completedTopics = normalizeStringArray(req.body.completedTopics);

    Object.assign(doc.enrolledStudents[idx], stripEmptyDeep(patch));

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("updateEnrollment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unenrollStudent = async (req, res) => {
  try {
    const { id, studentId: sid } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const studentId = normalizeObjectId(sid);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const before = doc.enrolledStudents?.length || 0;
    doc.enrolledStudents = (doc.enrolledStudents || []).filter(
      (s) => String(s.studentId) !== String(studentId)
    );

    if ((doc.enrolledStudents?.length || 0) === before) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("unenrollStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- ratings ----------------------------- */

exports.addOrUpdateRating = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const studentId = normalizeObjectId(req.body.studentId);
    const rating = toNumber(req.body.rating);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });
    if (rating === undefined || rating < 1 || rating > 5)
      return res.status(400).json({ message: "rating must be 1..5" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    doc.ratings = Array.isArray(doc.ratings) ? doc.ratings : [];
    const idx = doc.ratings.findIndex(
      (r) => String(r.studentId) === String(studentId)
    );

    if (idx >= 0) {
      doc.ratings[idx].rating = rating;
      if (req.body.review !== undefined)
        doc.ratings[idx].review = normalizeString(req.body.review);
      doc.ratings[idx].createdAt = new Date();
    } else {
      doc.ratings.push({
        studentId,
        rating,
        review: normalizeString(req.body.review),
        createdAt: new Date(),
      });
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addOrUpdateRating error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- threads (Q&A) ----------------------------- */

exports.addThread = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const userId = normalizeObjectId(req.body.userId);
    const message = normalizeString(req.body.message);
    if (!userId || !message)
      return res
        .status(400)
        .json({ message: "userId and message are required" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    doc.discussionThreads = Array.isArray(doc.discussionThreads)
      ? doc.discussionThreads
      : [];
    doc.discussionThreads.push({
      userId,
      message,
      createdAt: new Date(),
      replies: [],
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addThread error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addReply = async (req, res) => {
  try {
    const { id, tIndex } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ message: "Invalid course id" });
    const ti = Number(tIndex);
    if (!Number.isInteger(ti) || ti < 0)
      return res.status(400).json({ message: "Invalid thread index" });

    const userId = normalizeObjectId(req.body.userId);
    const message = normalizeString(req.body.message);
    if (!userId || !message)
      return res
        .status(400)
        .json({ message: "userId and message are required" });

    const doc = await Course.findById(id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const th = doc.discussionThreads?.[ti];
    if (!th) return res.status(404).json({ message: "Thread not found" });

    th.replies = Array.isArray(th.replies) ? th.replies : [];
    th.replies.push({ userId, message, createdAt: new Date() });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addReply error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listBySemester = async (req, res) => {
  try {
    const { semesterId } = req.params;

    // Cast to ObjectId if valid; Mongoose can match with strings too,
    // but this avoids mixed-type quirks.
    const castId = Types.ObjectId.isValid(semesterId)
      ? new Types.ObjectId(semesterId)
      : semesterId;

    // ✅ Support both 'semester' and legacy 'semister' field names
    const q = { $or: [{ semester: castId }, { semister: castId }] };

    // Optional: also filter by degree if sent as query ?degreeId=...
    if (req.query.degreeId && Types.ObjectId.isValid(req.query.degreeId)) {
      const dId = new Types.ObjectId(req.query.degreeId);
      q.$and = [{ $or: [{ degree: dId }, { Degree: dId }] }]; // be generous if schema had variants
    }

    const list = await Course.find(q)
      .sort({ title: 1 })
      .select("_id title name slug semester semister degree"); // small payload

    res.json({ success: true, data: list });
  } catch (e) {
    res
      .status(500)
      .json({ success: false, message: e.message || "Failed to list courses" });
  }
};
