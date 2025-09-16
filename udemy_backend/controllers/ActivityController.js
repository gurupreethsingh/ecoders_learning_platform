// // udemy_backend/controllers/ActivityController.js
// const fs = require("fs");
// const fsp = require("fs/promises");
// const path = require("path");
// const mongoose = require("mongoose");
// const {
//   Activity,
//   ActivityAssignment,
//   ActivitySubmission,
// } = require("../models/ActivityModel.js");
// const User = require("../models/UserModel.js");

// /* ---------------------------------------
//  * Helpers
//  * -------------------------------------*/
// const asyncHandler = (fn) => (req, res, next) =>
//   Promise.resolve(fn(req, res, next)).catch(next);

// const toObjectId = (id) =>
//   id == null ? null : new mongoose.Types.ObjectId(String(id));

// const toIdArray = (val) => {
//   if (!val) return [];
//   const arr = Array.isArray(val) ? val : String(val).split(",");
//   return arr
//     .map((x) => String(x).trim())
//     .filter(Boolean)
//     .map(toObjectId);
// };

// const requireSuperadmin = (req) => {
//   if (!req.user || req.user.role !== "superadmin") {
//     const err = new Error("Only superadmin is allowed to perform this action.");
//     err.status = 403;
//     throw err;
//   }
// };

// const assertMeOr401 = (req) => {
//   if (!req.user || !req.user._id) {
//     const err = new Error("Unauthorized: missing or invalid token");
//     err.status = 401;
//     throw err;
//   }
//   return toObjectId(req.user._id);
// };

// // uploads dir (relative to project backend root)
// const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// function absUploadPath(p) {
//   if (!p) return null;
//   return path.isAbsolute(p) ? p : path.join(__dirname, "..", p);
// }
// async function unlinkQuiet(p) {
//   try {
//     if (!p) return;
//     await fsp.unlink(absUploadPath(p));
//   } catch (_) {}
// }

// /**
//  * Try to run `work(session)` inside a Mongo transaction.
//  * If the Mongo server is standalone (no replica set), fall back to running
//  * the same work without a session/transaction.
//  */
// async function runWithOptionalTxn(work) {
//   let session = null;
//   try {
//     session = await mongoose.startSession();
//     session.startTransaction();
//     const out = await work(session);
//     await session.commitTransaction();
//     return out;
//   } catch (err) {
//     const msg = String(err?.message || "");
//     const notReplica =
//       /Transaction numbers are only allowed on a replica set member or mongos/i.test(
//         msg
//       );
//     if (notReplica) {
//       try {
//         if (session?.inTransaction()) await session.abortTransaction();
//       } catch (_) {}
//       try {
//         session?.endSession();
//       } catch (_) {}
//       return work(null);
//     }
//     try {
//       if (session?.inTransaction()) await session.abortTransaction();
//     } catch (_) {}
//     try {
//       session?.endSession();
//     } catch (_) {}
//     throw err;
//   } finally {
//     try {
//       session?.endSession();
//     } catch (_) {}
//   }
// }

// /** Build a flexible filter from query/body for Activity find() */
// function buildActivityFilter(q = {}) {
//   const filter = {};

//   // Prefer $text search when q is present (uses text index on title/instructions)
//   if (q.q) {
//     filter.$text = { $search: String(q.q) };
//   }

//   // enums
//   if (q.status) filter.status = { $in: String(q.status).split(",") };
//   if (q.audienceType)
//     filter.audienceType = { $in: String(q.audienceType).split(",") };

//   // audience specifics
//   if (q.role) filter.roles = { $in: String(q.role).split(",") };
//   if (q.user) filter.users = { $in: String(q.user).split(",").map(toObjectId) };

//   // context (support many aliases from FE)
//   const degreeQ = q.context_degree || q.degree || q.degreeId;
//   const semQ = q.context_semester || q.semesterId || q.semisterId;
//   const courseQ = q.context_course || q.course || q.courseId;

//   if (degreeQ) filter["context.degrees"] = { $in: [toObjectId(degreeQ)] };
//   if (semQ) filter["context.semesters"] = { $in: [toObjectId(semQ)] };
//   if (courseQ) filter["context.courses"] = { $in: [toObjectId(courseQ)] };

//   if (q.context_section) filter["context.section"] = q.context_section;
//   if (q.context_batchYear) filter["context.batchYear"] = q.context_batchYear;

//   // date ranges (startAt / endAt / createdAt / updatedAt)
//   const dateField = q.dateField || "createdAt"; // createdAt | startAt | endAt | updatedAt
//   const range = {};
//   if (q.since) range.$gte = new Date(q.since);
//   if (q.until) range.$lte = new Date(q.until);
//   if (Object.keys(range).length) filter[dateField] = range;

//   return filter;
// }

// /** Build sort spec: ?sort=-createdAt,title (minus = desc) */
// function parseSort(sortStr) {
//   if (!sortStr) return { createdAt: -1 };
//   const parts = String(sortStr).split(",");
//   const sort = {};
//   parts.forEach((p) => {
//     p = p.trim();
//     if (!p) return;
//     if (p.startsWith("-")) sort[p.slice(1)] = -1;
//     else sort[p] = 1;
//   });
//   return sort;
// }

// /** Resolve audience to userIds based on the activity doc */
// async function resolveAudienceUsers(activity) {
//   if (activity.audienceType === "all") {
//     const users = await User.find({}, { _id: 1 }).lean();
//     return users.map((u) => u._id);
//   }

//   if (activity.audienceType === "roles") {
//     if (!activity.roles?.length) return [];
//     const users = await User.find(
//       { role: { $in: activity.roles } },
//       { _id: 1 }
//     ).lean();
//     return users.map((u) => u._id);
//   }

//   if (activity.audienceType === "users") {
//     return (activity.users || []).map(toObjectId);
//   }

//   if (activity.audienceType === "contextual") {
//     const ctx = activity.context || {};
//     const filter = {};
//     if (ctx.degrees?.length)
//       filter.degree = { $in: ctx.degrees.map(toObjectId) };
//     if (ctx.semesters?.length)
//       filter.semister = { $in: ctx.semesters.map(toObjectId) };
//     if (ctx.courses?.length)
//       filter.course = { $in: ctx.courses.map(toObjectId) };
//     if (ctx.section) filter.section = ctx.section;
//     if (ctx.batchYear) filter.batchYear = ctx.batchYear;

//     if (!Object.keys(filter).length) return [];
//     const users = await User.find(filter, { _id: 1 }).lean();
//     return users.map((u) => u._id);
//   }

//   return [];
// }

// /** Upsert ActivityAssignment docs for provided userIds */
// async function ensureAssignments(activityId, userIds, session = null) {
//   if (!userIds?.length) return { upserted: 0, existing: 0 };

//   const ops = userIds.map((uid) => ({
//     updateOne: {
//       filter: { activity: activityId, user: uid },
//       update: {
//         $setOnInsert: {
//           activity: activityId,
//           user: uid,
//           status: "new",
//           lastStatusAt: new Date(),
//         },
//       },
//       upsert: true,
//     },
//   }));

//   const result = await ActivityAssignment.bulkWrite(ops, {
//     session: session || undefined,
//   });

//   const upserted = result?.upsertedCount || 0;
//   const existing = userIds.length - upserted;
//   return { upserted, existing };
// }

// /* ---------------------------------------
//  * CRUD
//  * -------------------------------------*/
// exports.create = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);

//   const payload = { ...req.body };
//   if (!payload.status) payload.status = "draft";
//   payload.createdBy = req.user?._id;

//   // ---- Normalize context from many possible field names ----
//   const degrees = [
//     ...toIdArray(payload.degrees),
//     ...toIdArray(payload.degreeIds),
//     ...toIdArray(payload.degree),
//     ...toIdArray(payload.degreeId),
//     ...toIdArray(payload.context_degree),
//   ];
//   const semesters = [
//     ...toIdArray(payload.semesters),
//     ...toIdArray(payload.semisterIds),
//     ...toIdArray(payload.semesterId),
//     ...toIdArray(payload.semisterId),
//     ...toIdArray(payload.context_semester),
//   ];
//   const courses = [
//     ...toIdArray(payload.courses),
//     ...toIdArray(payload.courseIds),
//     ...toIdArray(payload.course),
//     ...toIdArray(payload.courseId),
//     ...toIdArray(payload.context_course),
//   ];

//   payload.context = {
//     ...(payload.context || {}),
//     degrees: degrees.length ? degrees : (payload.context?.degrees || []),
//     semesters: semesters.length ? semesters : (payload.context?.semesters || []),
//     courses: courses.length ? courses : (payload.context?.courses || []),
//     section: payload.context?.section || payload.section || undefined,
//     batchYear: payload.context?.batchYear || payload.batchYear || undefined,
//   };

//   const doc = await Activity.create(payload);
//   res.status(201).json({ data: doc });
// });

// exports.getById = asyncHandler(async (req, res) => {
//   const doc = await Activity.findById(req.params.id).lean();
//   if (!doc) return res.status(404).json({ error: "Not found" });
//   res.json({ data: doc });
// });

// exports.update = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);
//   const doc = await Activity.findById(req.params.id);
//   if (!doc) return res.status(404).json({ error: "Not found" });

//   const changes = { ...req.body, updatedBy: req.user?._id };

//   // merge context updates if any fields are present
//   const degrees = [
//     ...toIdArray(changes.degrees),
//     ...toIdArray(changes.degreeIds),
//     ...toIdArray(changes.degree),
//     ...toIdArray(changes.degreeId),
//     ...toIdArray(changes.context_degree),
//   ];
//   const semesters = [
//     ...toIdArray(changes.semesters),
//     ...toIdArray(changes.semisterIds),
//     ...toIdArray(changes.semesterId),
//     ...toIdArray(changes.semisterId),
//     ...toIdArray(changes.context_semester),
//   ];
//   const courses = [
//     ...toIdArray(changes.courses),
//     ...toIdArray(changes.courseIds),
//     ...toIdArray(changes.course),
//     ...toIdArray(changes.courseId),
//     ...toIdArray(changes.context_course),
//   ];

//   if (!changes.context) changes.context = {};
//   if (degrees.length) changes.context.degrees = degrees;
//   if (semesters.length) changes.context.semesters = semesters;
//   if (courses.length) changes.context.courses = courses;
//   if (changes.section) changes.context.section = changes.section;
//   if (changes.batchYear) changes.context.batchYear = changes.batchYear;

//   Object.assign(doc, changes);
//   await doc.save();
//   res.json({ data: doc });
// });

// exports.remove = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);
//   const id = req.params.id;

//   await runWithOptionalTxn(async (session) => {
//     // collect submission file paths to delete
//     const subsQ = ActivitySubmission.find({ activity: id }).select("files");
//     if (session) subsQ.session(session);
//     const subs = await subsQ.lean();

//     // collect activity attachment file paths to delete
//     const actQ = Activity.findById(id).select("attachments");
//     if (session) actQ.session(session);
//     const act = await actQ.lean();

//     // delete DB docs
//     const del1 = Activity.findByIdAndDelete(id);
//     const del2 = ActivityAssignment.deleteMany({ activity: id });
//     const del3 = ActivitySubmission.deleteMany({ activity: id });
//     if (session)
//       del1.session(session), del2.session(session), del3.session(session);
//     await Promise.all([del1, del2, del3]);

//     // physically delete submission & activity files
//     const filePaths = [];
//     subs.forEach((s) => {
//       (s.files || []).forEach((f) => {
//         if (f?.path) filePaths.push(f.path);
//       });
//     });
//     (act?.attachments || []).forEach((a) => {
//       if (a?.path) filePaths.push(a.path);
//     });

//     await Promise.all(filePaths.map(unlinkQuiet));
//   });

//   res.json({ ok: true });
// });

// /* ---------------------------------------
//  * Publishing / Archiving / Assignment fanout
//  * -------------------------------------*/
// exports.publish = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);
//   const { id } = req.params;

//   const result = await runWithOptionalTxn(async (session) => {
//     const query = Activity.findById(id);
//     if (session) query.session(session);
//     const doc = await query;
//     if (!doc) return { http: 404, body: { error: "Not found" } };

//     // Resolve audience, create assignments
//     const userIds = await resolveAudienceUsers(doc);
//     const { upserted, existing } = await ensureAssignments(
//       doc._id,
//       userIds,
//       session || null
//     );

//     doc.status = "published";
//     await doc.save({ session: session || undefined });

//     return {
//       http: 200,
//       body: {
//         data: doc.toObject(),
//         assignments: {
//           totalUsers: userIds.length,
//           created: upserted,
//           existing,
//         },
//       },
//     };
//   });

//   return res.status(result.http).json(result.body);
// });

// exports.archive = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);
//   const doc = await Activity.findById(req.params.id);
//   if (!doc) return res.status(404).json({ error: "Not found" });
//   doc.status = "archived";
//   await doc.save();
//   res.json({ data: doc });
// });

// /* ---------------------------------------
//  * Listing / Filtering / Sorting / Count
//  * -------------------------------------*/
// exports.list = asyncHandler(async (req, res) => {
//   const filter = buildActivityFilter(req.query);
//   const sort = parseSort(req.query.sort);
//   const page = Math.max(parseInt(req.query.page || "1", 10), 1);
//   const limit = Math.min(
//     Math.max(parseInt(req.query.limit || "20", 10), 1),
//     200
//   );

//   const q = Activity.find(filter)
//     .sort(sort)
//     .skip((page - 1) * limit)
//     .limit(limit);

//   // If using $text, add score for optional sorting by relevance when caller passes sort=score
//   if (filter.$text) {
//     q.select({ score: { $meta: "textScore" } });
//     if (req.query.sort === "score") q.sort({ score: { $meta: "textScore" } });
//   }

//   const [rows, total] = await Promise.all([
//     q.lean(),
//     Activity.countDocuments(filter),
//   ]);

//   res.json({
//     data: rows,
//     meta: { page, limit, total, pages: Math.ceil(total / limit) },
//   });
// });

// exports.filter = asyncHandler(async (req, res) => {
//   const filter = buildActivityFilter(req.body || {});
//   const sort = parseSort(req.body?.sort);
//   const page = Math.max(parseInt(req.body?.page || "1", 10), 1);
//   const limit = Math.min(
//     Math.max(parseInt(req.body?.limit || "20", 10), 1),
//     200
//   );

//   const q = Activity.find(filter)
//     .sort(sort)
//     .skip((page - 1) * limit)
//     .limit(limit);

//   if (filter.$text) {
//     q.select({ score: { $meta: "textScore" } });
//     if (req.body?.sort === "score") q.sort({ score: { $meta: "textScore" } });
//   }

//   const [rows, total] = await Promise.all([
//     q.lean(),
//     Activity.countDocuments(filter),
//   ]);

//   res.json({
//     data: rows,
//     meta: { page, limit, total, pages: Math.ceil(total / limit) },
//   });
// });

// exports.countAll = asyncHandler(async (_req, res) => {
//   const total = await Activity.countDocuments();
//   res.json({ total });
// });

// exports.countByStatus = asyncHandler(async (_req, res) => {
//   const agg = await Activity.aggregate([
//     { $group: { _id: "$status", count: { $sum: 1 } } },
//     { $project: { status: "$_id", count: 1, _id: 0 } },
//   ]);
//   res.json({ data: agg });
// });

// exports.countByAudienceType = asyncHandler(async (_req, res) => {
//   const agg = await Activity.aggregate([
//     { $group: { _id: "$audienceType", count: { $sum: 1 } } },
//     { $project: { audienceType: "$_id", count: 1, _id: 0 } },
//   ]);
//   res.json({ data: agg });
// });

// /* ---------------------------------------
//  * Assignments (per-user progress)
//  * -------------------------------------*/
// exports.listAssignments = asyncHandler(async (req, res) => {
//   const { id } = req.params; // activityId
//   const page = Math.max(parseInt(req.query.page || "1", 10), 1);
//   const limit = Math.min(
//     Math.max(parseInt(req.query.limit || "50", 10), 1),
//     500
//   );
//   const sort = parseSort(req.query.sort);
//   const filter = { activity: toObjectId(id) };
//   if (req.query.status)
//     filter.status = { $in: String(req.query.status).split(",") };

//   const [rows, total] = await Promise.all([
//     ActivityAssignment.find(filter)
//       .populate("user", "name email role")
//       .populate("submission")
//       .sort(sort)
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .lean(),
//     ActivityAssignment.countDocuments(filter),
//   ]);

//   res.json({
//     data: rows,
//     meta: { page, limit, total, pages: Math.ceil(total / limit) },
//   });
// });

// exports.getAssignment = asyncHandler(async (req, res) => {
//   const { id } = req.params; // assignmentId
//   const row = await ActivityAssignment.findById(id)
//     .populate("user", "name email role")
//     .populate("activity")
//     .populate("submission")
//     .lean();
//   if (!row) return res.status(404).json({ error: "Not found" });
//   res.json({ data: row });
// });

// exports.markAssignmentStatus = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);
//   const { id } = req.params; // assignmentId
//   const { status } = req.body;
//   const allowed = ["new", "inprogress", "completed"];
//   if (!allowed.includes(status))
//     return res.status(400).json({ error: "Invalid status" });

//   const row = await ActivityAssignment.findById(id);
//   if (!row) return res.status(404).json({ error: "Not found" });
//   row.status = status;
//   row.lastStatusAt = new Date();
//   await row.save();
//   res.json({ data: row });
// });

// /* ---------------------------------------
//  * Submissions (upload / review / grade)
//  * -------------------------------------*/
// /**
//  * Users submit their work.
//  * - Files come from multer (stored in /uploads).
//  * - Replacement rule (per user, per activity):
//  *   * If a newly uploaded file has the SAME original name (case-insensitive)
//  *     and SAME extension as an existing file in the submission,
//  *     we REPLACE the old one (and delete the old physical file).
//  *   * If either the name or extension differs, we ADD a new file entry.
//  */
// exports.submit = asyncHandler(async (req, res) => {
//   const me = assertMeOr401(req);
//   const { id } = req.params; // activityId

//   // ensure uploads directory exists (defensive)
//   if (!fs.existsSync(UPLOADS_DIR)) {
//     fs.mkdirSync(UPLOADS_DIR, { recursive: true });
//   }

//   const activity = await Activity.findById(id);
//   if (!activity) return res.status(404).json({ error: "Activity not found" });

//   // deadline enforcement (unless allowLate)
//   if (
//     activity.endAt &&
//     new Date() > new Date(activity.endAt) &&
//     !activity.allowLate
//   ) {
//     return res
//       .status(400)
//       .json({ error: "Submissions are closed for this activity" });
//   }

//   // Build new file entries from multer
//   let newFiles = [];
//   if (Array.isArray(req.files) && req.files.length) {
//     newFiles = req.files.map((f) => ({
//       name: f.originalname,
//       type: f.mimetype,
//       size: f.size,
//       url: `/uploads/${f.filename}`,
//       path: `uploads/${f.filename}`,
//     }));
//   } else if (Array.isArray(req.body.files)) {
//     // JSON fallback (no physical upload). These won't trigger disk cleanup/replacement.
//     newFiles = req.body.files.map((x) => ({
//       name: x.name || x.filename || "file",
//       type: x.type || x.mimetype || "application/octet-stream",
//       size: x.size || 0,
//       url: x.url || x.path || "",
//       path: x.path || "",
//     }));
//   }

//   // Find or create submission
//   let sub = await ActivitySubmission.findOne({ activity: id, user: me });
//   if (!sub) {
//     sub = await ActivitySubmission.create({
//       activity: id,
//       user: me,
//       files: [],
//       status: "pending",
//       submittedAt: new Date(),
//     });
//   }

//   // Replacement logic against existing files
//   const updatedFiles = Array.isArray(sub.files) ? [...sub.files] : [];

//   for (const nf of newFiles) {
//     const nfName = String(nf.name || "").toLowerCase();
//     const nfExt = (path.extname(nf.name || "") || "").toLowerCase();

//     // Find index with same name+ext (case-insensitive)
//     const ix = updatedFiles.findIndex((ef) => {
//       const efName = String(ef.name || "").toLowerCase();
//       const efExt = (path.extname(ef.name || "") || "").toLowerCase();
//       return efName === nfName && efExt === nfExt;
//     });

//     if (ix >= 0) {
//       // Replace existing -> delete old physical file if we own it
//       await unlinkQuiet(updatedFiles[ix]?.path);
//       updatedFiles[ix] = nf;
//     } else {
//       // Add as new
//       updatedFiles.push(nf);
//     }
//   }

//   // Save submission
//   sub.files = updatedFiles;
//   sub.status = "pending";
//   sub.submittedAt = new Date();
//   await sub.save();

//   // Ensure/Update assignment -> inprogress + link submission
//   const assign = await ActivityAssignment.findOneAndUpdate(
//     { activity: id, user: me },
//     {
//       $setOnInsert: {
//         activity: id,
//         user: me,
//         createdAt: new Date(),
//       },
//       $set: {
//         status: "inprogress",
//         lastStatusAt: new Date(),
//         submission: sub._id,
//       },
//     },
//     { new: true, upsert: true }
//   );

//   res.status(201).json({ data: sub, assignment: assign });
// });

// exports.listSubmissions = asyncHandler(async (req, res) => {
//   const { id } = req.params; // activityId
//   const page = Math.max(parseInt(req.query.page || "1", 10), 1);
//   const limit = Math.min(
//     Math.max(parseInt(req.query.limit || "50", 10), 1),
//     500
//   );
//   const sort = parseSort(req.query.sort);
//   const filter = { activity: toObjectId(id) };
//   if (req.query.status)
//     filter.status = { $in: String(req.query.status).split(",") };
//   if (req.query.user) filter.user = toObjectId(req.query.user);

//   const [rows, total] = await Promise.all([
//     ActivitySubmission.find(filter)
//       .populate("user", "name email role")
//       .populate("assignment")
//       .sort(sort)
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .lean(),
//     ActivitySubmission.countDocuments(filter),
//   ]);

//   res.json({
//     data: rows,
//     meta: { page, limit, total, pages: Math.ceil(total / limit) },
//   });
// });

// exports.getSubmission = asyncHandler(async (req, res) => {
//   const { id } = req.params; // submissionId
//   const sub = await ActivitySubmission.findById(id)
//     .populate("user", "name email role")
//     .populate("activity")
//     .populate("assignment")
//     .lean();
//   if (!sub) return res.status(404).json({ error: "Not found" });
//   res.json({ data: sub });
// });

// exports.reviewSubmission = asyncHandler(async (req, res) => {
//   requireSuperadmin(req); // or allow teacher roles as needed
//   const { id } = req.params; // submissionId
//   const { notes, status } = req.body; // status optional -> 'under_review'
//   const allowed = ["pending", "under_review", "graded"];
//   const sub = await ActivitySubmission.findById(id);
//   if (!sub) return res.status(404).json({ error: "Not found" });

//   sub.review = {
//     ...(sub.review || {}),
//     notes: notes || sub.review?.notes || "",
//     reviewedBy: req.user._id,
//     reviewedAt: new Date(),
//   };
//   if (status && allowed.includes(status)) sub.status = status;

//   await sub.save();
//   res.json({ data: sub });
// });

// exports.gradeSubmission = asyncHandler(async (req, res) => {
//   requireSuperadmin(req); // or allow teacher roles as needed
//   const { id } = req.params; // submissionId
//   const { marks, maxMarks } = req.body;

//   const sub = await ActivitySubmission.findById(id).populate("activity");
//   if (!sub) return res.status(404).json({ error: "Not found" });

//   const ceiling =
//     typeof maxMarks === "number" ? maxMarks : sub.activity?.maxMarks || 100;
//   if (typeof marks !== "number" || marks < 0)
//     return res
//       .status(400)
//       .json({ error: "marks must be a non-negative number" });
//   if (marks > ceiling)
//     return res
//       .status(400)
//       .json({ error: `marks cannot exceed maxMarks (${ceiling})` });

//   sub.grade = {
//     marks,
//     maxMarks: ceiling,
//     gradedBy: req.user._id,
//     gradedAt: new Date(),
//   };
//   sub.status = "graded";
//   await sub.save();

//   // Make sure the linked assignment is set to completed
//   await ActivityAssignment.findOneAndUpdate(
//     { activity: sub.activity, user: sub.user },
//     {
//       $set: {
//         status: "completed",
//         lastStatusAt: new Date(),
//         submission: sub._id,
//       },
//     },
//     { upsert: true }
//   );

//   res.json({ data: sub });
// });

// /* ---------------------------------------
//  * CSV export
//  * -------------------------------------*/
// exports.exportSubmissionsCsv = asyncHandler(async (req, res) => {
//   requireSuperadmin(req);
//   const { id } = req.params; // activityId

//   const submissions = await ActivitySubmission.find({ activity: id })
//     .populate("user", "name email role")
//     .lean();

//   const lines = [];
//   lines.push(
//     "user_name,user_email,user_role,status,submittedAt,reviewedAt,gradedAt,marks,maxMarks"
//   );
//   submissions.forEach((s) => {
//     const name = (s.user && s.user.name) || "";
//     const email = (s.user && s.user.email) || "";
//     const role = (s.user && s.user.role) || "";
//     const status = s.status || "";
//     const submittedAt = s.submittedAt
//       ? new Date(s.submittedAt).toISOString()
//       : "";
//     const reviewedAt = s.review?.reviewedAt
//       ? new Date(s.review.reviewedAt).toISOString()
//       : "";
//     const gradedAt = s.grade?.gradedAt
//       ? new Date(s.grade.gradedAt).toISOString()
//       : "";
//     const marks = typeof s.grade?.marks === "number" ? s.grade.marks : "";
//     const maxMarks =
//       typeof s.grade?.maxMarks === "number" ? s.grade.maxMarks : "";
//     lines.push(
//       [
//         name,
//         email,
//         role,
//         status,
//         submittedAt,
//         reviewedAt,
//         gradedAt,
//         marks,
//         maxMarks,
//       ]
//         .map((v) => `"${String(v).replaceAll('"', '""')}"`)
//         .join(",")
//     );
//   });

//   const csv = lines.join("\n");
//   res.setHeader("Content-Type", "text/csv; charset=utf-8");
//   res.setHeader(
//     "Content-Disposition",
//     `attachment; filename="activity_${id}_submissions.csv"`
//   );
//   res.status(200).send(csv);
// });

// /* ---------------------------------------
//  * Convenience: feed for the current user
//  * -------------------------------------*/
// exports.myAssignments = asyncHandler(async (req, res) => {
//   const me = assertMeOr401(req);
//   const page = Math.max(parseInt(req.query.page || "1", 10), 1);
//   const limit = Math.min(
//     Math.max(parseInt(req.query.limit || "20", 10), 1),
//     200
//   );
//   const sort = parseSort(req.query.sort); // e.g., -updatedAt

//   const filter = { user: me };
//   if (req.query.status)
//     filter.status = { $in: String(req.query.status).split(",") };

//   const [rows, total] = await Promise.all([
//     ActivityAssignment.find(filter)
//       .populate("activity")
//       .populate("submission")
//       .sort(sort)
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .lean(),
//     ActivityAssignment.countDocuments(filter),
//   ]);

//   res.json({
//     data: rows,
//     meta: { page, limit, total, pages: Math.ceil(total / limit) },
//   });
// });


// till here original. 

// 

// udemy_backend/controllers/ActivityController.js
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const {
  Activity,
  ActivityAssignment,
  ActivitySubmission,
} = require("../models/ActivityModel.js");
const User = require("../models/UserModel.js");

/* ---------------------------------------
 * Helpers
 * -------------------------------------*/
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toObjectId = (id) =>
  id == null ? null : new mongoose.Types.ObjectId(String(id));

const toIdArray = (val) => {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : String(val).split(",");
  return arr
    .map((x) => String(x).trim())
    .filter(Boolean)
    .map(toObjectId);
};

const requireSuperadmin = (req) => {
  if (!req.user || req.user.role !== "superadmin") {
    const err = new Error("Only superadmin is allowed to perform this action.");
    err.status = 403;
    throw err;
  }
};

const assertMeOr401 = (req) => {
  if (!req.user || !req.user._id) {
    const err = new Error("Unauthorized: missing or invalid token");
    err.status = 401;
    throw err;
  }
  return toObjectId(req.user._id);
};

// uploads dir (relative to project backend root)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

function absUploadPath(p) {
  if (!p) return null;
  return path.isAbsolute(p) ? p : path.join(__dirname, "..", p);
}
async function unlinkQuiet(p) {
  try {
    if (!p) return;
    await fsp.unlink(absUploadPath(p));
  } catch (_) {}
}

/**
 * Try to run `work(session)` inside a Mongo transaction.
 * If the Mongo server is standalone (no replica set), fall back to running
 * the same work without a session/transaction.
 */
async function runWithOptionalTxn(work) {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const out = await work(session);
    await session.commitTransaction();
    return out;
  } catch (err) {
    const msg = String(err?.message || "");
    const notReplica =
      /Transaction numbers are only allowed on a replica set member or mongos/i.test(
        msg
      );
    if (notReplica) {
      try {
        if (session?.inTransaction()) await session.abortTransaction();
      } catch (_) {}
      try {
        session?.endSession();
      } catch (_) {}
      return work(null);
    }
    try {
      if (session?.inTransaction()) await session.abortTransaction();
    } catch (_) {}
    try {
      session?.endSession();
    } catch (_) {}
    throw err;
  } finally {
    try {
      session?.endSession();
    } catch (_) {}
  }
}

/** Build a flexible filter from query/body for Activity find() */
function buildActivityFilter(q = {}) {
  const filter = {};

  if (q.q) filter.$text = { $search: String(q.q) };

  // enums
  if (q.status) filter.status = { $in: String(q.status).split(",") };
  if (q.audienceType)
    filter.audienceType = { $in: String(q.audienceType).split(",") };

  // audience specifics
  if (q.role) filter.roles = { $in: String(q.role).split(",") };
  if (q.user) filter.users = { $in: String(q.user).split(",").map(toObjectId) };

  // context (support many aliases from FE)
  const degreeQ = q.context_degree || q.degree || q.degreeId;
  const semQ = q.context_semester || q.semesterId || q.semisterId;
  const courseQ = q.context_course || q.course || q.courseId;

  if (degreeQ) filter["context.degrees"] = { $in: [toObjectId(degreeQ)] };
  if (semQ) filter["context.semesters"] = { $in: [toObjectId(semQ)] };
  if (courseQ) filter["context.courses"] = { $in: [toObjectId(courseQ)] };

  if (q.context_section) filter["context.section"] = q.context_section;
  if (q.context_batchYear) filter["context.batchYear"] = q.context_batchYear;

  // date ranges
  const dateField = q.dateField || "createdAt";
  const range = {};
  if (q.since) range.$gte = new Date(q.since);
  if (q.until) range.$lte = new Date(q.until);
  if (Object.keys(range).length) filter[dateField] = range;

  return filter;
}

/** Build sort spec: ?sort=-createdAt,title (minus = desc) */
function parseSort(sortStr) {
  if (!sortStr) return { createdAt: -1 };
  const parts = String(sortStr).split(",");
  const sort = {};
  parts.forEach((p) => {
    p = p.trim();
    if (!p) return;
    if (p.startsWith("-")) sort[p.slice(1)] = -1;
    else sort[p] = 1;
  });
  return sort;
}

/** Resolve audience to userIds based on the activity doc */
async function resolveAudienceUsers(activity) {
  if (activity.audienceType === "all") {
    const users = await User.find({}, { _id: 1 }).lean();
    return users.map((u) => u._id);
  }

  if (activity.audienceType === "roles") {
    if (!activity.roles?.length) return [];
    const users = await User.find(
      { role: { $in: activity.roles } },
      { _id: 1 }
    ).lean();
    return users.map((u) => u._id);
  }

  if (activity.audienceType === "users") {
    return (activity.users || []).map(toObjectId);
  }

  if (activity.audienceType === "contextual") {
    const ctx = activity.context || {};
    const filter = {};
    if (ctx.degrees?.length)
      filter.degree = { $in: ctx.degrees.map(toObjectId) };
    // NOTE: your user model uses `semister` (typo) – keep aligned:
    if (ctx.semesters?.length)
      filter.semister = { $in: ctx.semesters.map(toObjectId) };
    if (ctx.courses?.length)
      filter.course = { $in: ctx.courses.map(toObjectId) };
    if (ctx.section) filter.section = ctx.section;
    if (ctx.batchYear) filter.batchYear = ctx.batchYear;

    if (!Object.keys(filter).length) return [];
    const users = await User.find(filter, { _id: 1 }).lean();
    return users.map((u) => u._id);
  }

  return [];
}

/** Upsert ActivityAssignment docs for provided userIds */
async function ensureAssignments(activityId, userIds, session = null) {
  if (!userIds?.length) return { upserted: 0, existing: 0 };

  const ops = userIds.map((uid) => ({
    updateOne: {
      filter: { activity: activityId, user: uid },
      update: {
        $setOnInsert: {
          activity: activityId,
          user: uid,
          status: "new",
          lastStatusAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const result = await ActivityAssignment.bulkWrite(ops, {
    session: session || undefined,
  });

  const upserted = result?.upsertedCount || 0;
  const existing = userIds.length - upserted;
  return { upserted, existing };
}

/* ---------------------------------------
 * CRUD
 * -------------------------------------*/
exports.create = asyncHandler(async (req, res) => {
  requireSuperadmin(req);

  const payload = { ...req.body };
  const publishNow = !!payload.publishNow;

  // default audienceType to contextual if not provided
  if (!payload.audienceType) payload.audienceType = "contextual";

  // ---- Normalize context from many possible field names ----
  const degrees = [
    ...toIdArray(payload.degrees),
    ...toIdArray(payload.degreeIds),
    ...toIdArray(payload.degree),
    ...toIdArray(payload.degreeId),
    ...toIdArray(payload.context_degree),
    ...(payload.context?.degrees || []),
  ];
  const semesters = [
    ...toIdArray(payload.semesters),
    ...toIdArray(payload.semisterIds),
    ...toIdArray(payload.semesterId),
    ...toIdArray(payload.semisterId),
    ...toIdArray(payload.context_semester),
    ...(payload.context?.semesters || []),
  ];
  const courses = [
    ...toIdArray(payload.courses),
    ...toIdArray(payload.courseIds),
    ...toIdArray(payload.course),
    ...toIdArray(payload.courseId),
    ...toIdArray(payload.context_course),
    ...(payload.context?.courses || []),
  ];

  payload.context = {
    ...(payload.context || {}),
    degrees: degrees,
    semesters: semesters,
    courses: courses,
    section: payload.context?.section || payload.section || undefined,
    batchYear: payload.context?.batchYear || payload.batchYear || undefined,
  };

  // 🔒 REQUIRE Degree + Semester when contextual
  if (payload.audienceType === "contextual") {
    if (!payload.context.degrees?.length) {
      const err = new Error("Degree is required for contextual audience.");
      err.status = 400;
      throw err;
    }
    if (!payload.context.semesters?.length) {
      const err = new Error("Semester is required for contextual audience.");
      err.status = 400;
      throw err;
    }
  }

  // status
  if (!payload.status) payload.status = publishNow ? "published" : "draft";
  payload.createdBy = req.user?._id;

  // Create activity (and optionally publish immediately)
  const result = await runWithOptionalTxn(async (session) => {
    const doc = await Activity.create(
      [{ ...payload }],
      session ? { session } : undefined
    ).then((arr) => arr[0]);

    if (publishNow || payload.status === "published") {
      const userIds = await resolveAudienceUsers(doc);
      await ensureAssignments(doc._id, userIds, session || null);
      doc.status = "published";
      await doc.save({ session: session || undefined });
      return {
        http: 201,
        body: {
          data: doc.toObject(),
          assignments: { totalUsers: userIds.length },
        },
      };
    }

    return { http: 201, body: { data: doc.toObject() } };
  });

  res.status(result.http).json(result.body);
});

exports.getById = asyncHandler(async (req, res) => {
  const doc = await Activity.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const doc = await Activity.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const changes = { ...req.body, updatedBy: req.user?._id };

  // merge context updates if any fields are present
  const degrees = [
    ...toIdArray(changes.degrees),
    ...toIdArray(changes.degreeIds),
    ...toIdArray(changes.degree),
    ...toIdArray(changes.degreeId),
    ...toIdArray(changes.context_degree),
  ];
  const semesters = [
    ...toIdArray(changes.semesters),
    ...toIdArray(changes.semisterIds),
    ...toIdArray(changes.semesterId),
    ...toIdArray(changes.semisterId),
    ...toIdArray(changes.context_semester),
  ];
  const courses = [
    ...toIdArray(changes.courses),
    ...toIdArray(changes.courseIds),
    ...toIdArray(changes.course),
    ...toIdArray(changes.courseId),
    ...toIdArray(changes.context_course),
  ];

  if (!changes.context) changes.context = {};
  if (degrees.length) changes.context.degrees = degrees;
  if (semesters.length) changes.context.semesters = semesters;
  if (courses.length) changes.context.courses = courses;
  if (changes.section) changes.context.section = changes.section;
  if (changes.batchYear) changes.context.batchYear = changes.batchYear;

  Object.assign(doc, changes);
  await doc.save();
  res.json({ data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const id = req.params.id;

  await runWithOptionalTxn(async (session) => {
    // collect submission file paths to delete
    const subsQ = ActivitySubmission.find({ activity: id }).select("files");
    if (session) subsQ.session(session);
    const subs = await subsQ.lean();

    // collect activity attachment file paths to delete
    const actQ = Activity.findById(id).select("attachments");
    if (session) actQ.session(session);
    const act = await actQ.lean();

    // delete DB docs
    const del1 = Activity.findByIdAndDelete(id);
    const del2 = ActivityAssignment.deleteMany({ activity: id });
    const del3 = ActivitySubmission.deleteMany({ activity: id });
    if (session)
      del1.session(session), del2.session(session), del3.session(session);
    await Promise.all([del1, del2, del3]);

    // physically delete submission & activity files
    const filePaths = [];
    subs.forEach((s) => {
      (s.files || []).forEach((f) => {
        if (f?.path) filePaths.push(f.path);
      });
    });
    (act?.attachments || []).forEach((a) => {
      if (a?.path) filePaths.push(a.path);
    });

    await Promise.all(filePaths.map(unlinkQuiet));
  });

  res.json({ ok: true });
});

/* ---------------------------------------
 * Publishing / Archiving / Assignment fanout
 * -------------------------------------*/
exports.publish = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;

  const result = await runWithOptionalTxn(async (session) => {
    const query = Activity.findById(id);
    if (session) query.session(session);
    const doc = await query;
    if (!doc) return { http: 404, body: { error: "Not found" } };

    // Resolve audience, create assignments
    const userIds = await resolveAudienceUsers(doc);
    const { upserted, existing } = await ensureAssignments(
      doc._id,
      userIds,
      session || null
    );

    doc.status = "published";
    await doc.save({ session: session || undefined });

    return {
      http: 200,
      body: {
        data: doc.toObject(),
        assignments: {
          totalUsers: userIds.length,
          created: upserted,
          existing,
        },
      },
    };
  });

  return res.status(result.http).json(result.body);
});

exports.archive = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const doc = await Activity.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  doc.status = "archived";
  await doc.save();
  res.json({ data: doc });
});

/* ---------------------------------------
 * Listing / Filtering / Sorting / Count
 * -------------------------------------*/
exports.list = asyncHandler(async (req, res) => {
  const filter = buildActivityFilter(req.query);
  const sort = parseSort(req.query.sort);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10), 1),
    200
  );

  const q = Activity.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  if (filter.$text) {
    q.select({ score: { $meta: "textScore" } });
    if (req.query.sort === "score") q.sort({ score: { $meta: "textScore" } });
  }

  const [rows, total] = await Promise.all([
    q.lean(),
    Activity.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.filter = asyncHandler(async (req, res) => {
  const filter = buildActivityFilter(req.body || {});
  const sort = parseSort(req.body?.sort);
  const page = Math.max(parseInt(req.body?.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.body?.limit || "20", 10), 1),
    200
  );

  const q = Activity.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  if (filter.$text) {
    q.select({ score: { $meta: "textScore" } });
    if (req.body?.sort === "score") q.sort({ score: { $meta: "textScore" } });
  }

  const [rows, total] = await Promise.all([
    q.lean(),
    Activity.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.countAll = asyncHandler(async (_req, res) => {
  const total = await Activity.countDocuments();
  res.json({ total });
});

exports.countByStatus = asyncHandler(async (_req, res) => {
  const agg = await Activity.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $project: { status: "$_id", count: 1, _id: 0 } },
  ]);
  res.json({ data: agg });
});

exports.countByAudienceType = asyncHandler(async (_req, res) => {
  const agg = await Activity.aggregate([
    { $group: { _id: "$audienceType", count: { $sum: 1 } } },
    { $project: { audienceType: "$_id", count: 1, _id: 0 } },
  ]);
  res.json({ data: agg });
});

/* ---------------------------------------
 * Assignments (per-user progress)
 * -------------------------------------*/
exports.listAssignments = asyncHandler(async (req, res) => {
  const { id } = req.params; // activityId
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "50", 10), 1),
    500
  );
  const sort = parseSort(req.query.sort);
  const filter = { activity: toObjectId(id) };
  if (req.query.status)
    filter.status = { $in: String(req.query.status).split(",") };

  const [rows, total] = await Promise.all([
    ActivityAssignment.find(filter)
      .populate("user", "name email role")
      .populate("submission")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityAssignment.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params; // assignmentId
  const row = await ActivityAssignment.findById(id)
    .populate("user", "name email role")
    .populate("activity")
    .populate("submission")
    .lean();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ data: row });
});

exports.markAssignmentStatus = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params; // assignmentId
  const { status } = req.body;
  const allowed = ["new", "inprogress", "completed"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  const row = await ActivityAssignment.findById(id);
  if (!row) return res.status(404).json({ error: "Not found" });
  row.status = status;
  row.lastStatusAt = new Date();
  await row.save();
  res.json({ data: row });
});

/* ---------------------------------------
 * Submissions (upload / review / grade)
 * -------------------------------------*/
exports.submit = asyncHandler(async (req, res) => {
  const me = assertMeOr401(req);
  const { id } = req.params; // activityId

  // ensure uploads directory exists (defensive)
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const activity = await Activity.findById(id);
  if (!activity) return res.status(404).json({ error: "Activity not found" });

  // deadline enforcement (unless allowLate)
  if (
    activity.endAt &&
    new Date() > new Date(activity.endAt) &&
    !activity.allowLate
  ) {
    return res
      .status(400)
      .json({ error: "Submissions are closed for this activity" });
  }

  // Build new file entries from multer
  let newFiles = [];
  if (Array.isArray(req.files) && req.files.length) {
    newFiles = req.files.map((f) => ({
      name: f.originalname,
      type: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`,
      path: `uploads/${f.filename}`,
    }));
  } else if (Array.isArray(req.body.files)) {
    // JSON fallback (no physical upload). These won't trigger disk cleanup/replacement.
    newFiles = req.body.files.map((x) => ({
      name: x.name || x.filename || "file",
      type: x.type || x.mimetype || "application/octet-stream",
      size: x.size || 0,
      url: x.url || x.path || "",
      path: x.path || "",
    }));
  }

  // Find or create submission
  let sub = await ActivitySubmission.findOne({ activity: id, user: me });
  if (!sub) {
    sub = await ActivitySubmission.create({
      activity: id,
      user: me,
      files: [],
      status: "pending",
      submittedAt: new Date(),
    });
  }

  // Replacement logic against existing files
  const updatedFiles = Array.isArray(sub.files) ? [...sub.files] : [];

  for (const nf of newFiles) {
    const nfName = String(nf.name || "").toLowerCase();
    const nfExt = (path.extname(nf.name || "") || "").toLowerCase();

    const ix = updatedFiles.findIndex((ef) => {
      const efName = String(ef.name || "").toLowerCase();
      const efExt = (path.extname(ef.name || "") || "").toLowerCase();
      return efName === nfName && efExt === nfExt;
    });

    if (ix >= 0) {
      await unlinkQuiet(updatedFiles[ix]?.path);
      updatedFiles[ix] = nf;
    } else {
      updatedFiles.push(nf);
    }
  }

  // Save submission
  sub.files = updatedFiles;
  sub.status = "pending";
  sub.submittedAt = new Date();
  await sub.save();

  // Ensure/Update assignment -> inprogress + link submission
  const assign = await ActivityAssignment.findOneAndUpdate(
    { activity: id, user: me },
    {
      $setOnInsert: {
        activity: id,
        user: me,
        createdAt: new Date(),
      },
      $set: {
        status: "inprogress",
        lastStatusAt: new Date(),
        submission: sub._id,
      },
    },
    { new: true, upsert: true }
  );

  res.status(201).json({ data: sub, assignment: assign });
});

exports.listSubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params; // activityId
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "50", 10), 1),
    500
  );
  const sort = parseSort(req.query.sort);
  const filter = { activity: toObjectId(id) };
  if (req.query.status)
    filter.status = { $in: String(req.query.status).split(",") };
  if (req.query.user) filter.user = toObjectId(req.query.user);

  const [rows, total] = await Promise.all([
    ActivitySubmission.find(filter)
      .populate("user", "name email role")
      .populate("assignment")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivitySubmission.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params; // submissionId
  const sub = await ActivitySubmission.findById(id)
    .populate("user", "name email role")
    .populate("activity")
    .populate("assignment")
    .lean();
  if (!sub) return res.status(404).json({ error: "Not found" });
  res.json({ data: sub });
});

exports.reviewSubmission = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params; // submissionId
  const { notes, status } = req.body;
  const allowed = ["pending", "under_review", "graded"];
  const sub = await ActivitySubmission.findById(id);
  if (!sub) return res.status(404).json({ error: "Not found" });

  sub.review = {
    ...(sub.review || {}),
    notes: notes || sub.review?.notes || "",
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  };
  if (status && allowed.includes(status)) sub.status = status;

  await sub.save();
  res.json({ data: sub });
});

exports.gradeSubmission = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params; // submissionId
  const { marks, maxMarks } = req.body;

  const sub = await ActivitySubmission.findById(id).populate("activity");
  if (!sub) return res.status(404).json({ error: "Not found" });

  const ceiling =
    typeof maxMarks === "number" ? maxMarks : sub.activity?.maxMarks || 100;
  if (typeof marks !== "number" || marks < 0)
    return res
      .status(400)
      .json({ error: "marks must be a non-negative number" });
  if (marks > ceiling)
    return res
      .status(400)
      .json({ error: `marks cannot exceed maxMarks (${ceiling})` });

  sub.grade = {
    marks,
    maxMarks: ceiling,
    gradedBy: req.user._id,
    gradedAt: new Date(),
  };
  sub.status = "graded";
  await sub.save();

  await ActivityAssignment.findOneAndUpdate(
    { activity: sub.activity, user: sub.user },
    {
      $set: {
        status: "completed",
        lastStatusAt: new Date(),
        submission: sub._id,
      },
    },
    { upsert: true }
  );

  res.json({ data: sub });
});

/* ---------------------------------------
 * CSV export
 * -------------------------------------*/
exports.exportSubmissionsCsv = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params; // activityId

  const submissions = await ActivitySubmission.find({ activity: id })
    .populate("user", "name email role")
    .lean();

  const lines = [];
  lines.push(
    "user_name,user_email,user_role,status,submittedAt,reviewedAt,gradedAt,marks,maxMarks"
  );
  submissions.forEach((s) => {
    const name = (s.user && s.user.name) || "";
    const email = (s.user && s.user.email) || "";
    const role = (s.user && s.user.role) || "";
    const status = s.status || "";
    const submittedAt = s.submittedAt
      ? new Date(s.submittedAt).toISOString()
      : "";
    const reviewedAt = s.review?.reviewedAt
      ? new Date(s.review.reviewedAt).toISOString()
      : "";
    const gradedAt = s.grade?.gradedAt
      ? new Date(s.grade.gradedAt).toISOString()
      : "";
    const marks = typeof s.grade?.marks === "number" ? s.grade.marks : "";
    const maxMarks =
      typeof s.grade?.maxMarks === "number" ? s.grade.maxMarks : "";
    lines.push(
      [
        name,
        email,
        role,
        status,
        submittedAt,
        reviewedAt,
        gradedAt,
        marks,
        maxMarks,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    );
  });

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="activity_${id}_submissions.csv"`
  );
  res.status(200).send(csv);
});

/* ---------------------------------------
 * Convenience: feed for the current user
 * -------------------------------------*/
exports.myAssignments = asyncHandler(async (req, res) => {
  const me = assertMeOr401(req);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10), 1),
    200
  );
  const sort = parseSort(req.query.sort); // e.g., -updatedAt

  const filter = { user: me };
  if (req.query.status)
    filter.status = { $in: String(req.query.status).split(",") };

  const [rows, total] = await Promise.all([
    ActivityAssignment.find(filter)
      .populate("activity")
      .populate("submission")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityAssignment.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
