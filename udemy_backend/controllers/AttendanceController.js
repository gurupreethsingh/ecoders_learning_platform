const {
  Attendance,
  AttendanceLink,
  ATTENDANCE_STATUS,
  ATTENDANCE_METHOD,
  toDateOnlyUTC,
} = require("../models/AttendanceModel");

const mongoose = require("mongoose");
const { Types } = mongoose;

/* -------------------------------------------------------------------------- */
/*                                UTIL HELPERS                                */
/* -------------------------------------------------------------------------- */

const ok = (res, data, meta = {}) => res.json({ ok: true, data, meta });
const bad = (res, message, code = "BAD_REQUEST", status = 400, extra = {}) =>
  res.status(status).json({ ok: false, code, message, ...extra });

const parseObjectId = (v) => {
  try {
    return v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null;
  } catch {
    return null;
  }
};

const isNonEmpty = (v) =>
  v !== undefined && v !== null && String(v).trim() !== "";

function pick(obj, keys) {
  const o = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
  });
  return o;
}

function parsePaging(q) {
  const page = Math.max(1, parseInt(q.page || "1", 10));
  const limit = Math.max(1, Math.min(500, parseInt(q.limit || "25", 10)));
  const skip = (page - 1) * limit;
  const sortBy = String(q.sortBy || "createdAt");
  const sortDir = String(q.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
  return { page, limit, skip, sort: { [sortBy]: sortDir } };
}

/** Build Mongo where for Attendance (querystring-friendly). */
function buildAttendanceQuery(q) {
  const where = {};
  // ids
  if (q.id) {
    const id = parseObjectId(q.id);
    if (id) where._id = id;
  }
  // foreigns (support both ... and ...Id keys)
  const student = parseObjectId(q.student || q.studentId);
  if (student) where.student = student;
  const degree = parseObjectId(q.degree || q.degreeId);
  if (degree) where.degree = degree;
  const semester = parseObjectId(q.semester || q.semesterId);
  if (semester) where.semester = semester;
  const course = parseObjectId(q.course || q.courseId);
  if (course) where.course = course;

  // enums
  if (isNonEmpty(q.status)) where.status = String(q.status).toLowerCase(); // present/absent/late/excused
  if (isNonEmpty(q.method)) where.method = String(q.method).toLowerCase(); // link/manual

  // date filters (normalized date-only)
  if (isNonEmpty(q.date)) where.date = toDateOnlyUTC(q.date);
  if (isNonEmpty(q.dateFrom) || isNonEmpty(q.dateTo)) {
    where.date = {};
    if (isNonEmpty(q.dateFrom)) where.date.$gte = toDateOnlyUTC(q.dateFrom);
    if (isNonEmpty(q.dateTo)) where.date.$lte = toDateOnlyUTC(q.dateTo);
  }

  return where;
}

/** Build Mongo where for AttendanceLink. */
function buildLinkQuery(q) {
  const where = {};
  if (q.id) {
    const id = parseObjectId(q.id);
    if (id) where._id = id;
  }
  const course = parseObjectId(q.course || q.courseId);
  if (course) where.course = course;

  const degree = parseObjectId(q.degree || q.degreeId);
  if (degree) where.degree = degree;

  const semester = parseObjectId(q.semester || q.semesterId);
  if (semester) where.semester = semester;

  if (isNonEmpty(q.code)) where.code = String(q.code).trim();
  if (isNonEmpty(q.isActive)) where.isActive = String(q.isActive) === "true";

  // validity window
  if (String(q.activeNow) === "true") {
    const now = new Date();
    where.validFrom = { $lte: now };
    where.validTo = { $gte: now };
    where.isActive = true;
  }

  // explicit range
  if (isNonEmpty(q.from) || isNonEmpty(q.to)) {
    if (isNonEmpty(q.from))
      (where.validFrom = where.validFrom || {}),
        (where.validFrom.$gte = new Date(q.from));
    if (isNonEmpty(q.to))
      (where.validTo = where.validTo || {}),
        (where.validTo.$lte = new Date(q.to));
  }

  return where;
}

/* --------------------------- Notification stubs --------------------------- */
// Replace with your integrations (email/SMS/push/queue)
async function notify(userIds, payload) {
  if (!Array.isArray(userIds)) userIds = [userIds].filter(Boolean);
  if (userIds.length) {
    console.log("[notify]", { to: userIds.map(String), payload });
  }
}
async function notifyOnMarked(attDoc) {
  await notify(attDoc.student, {
    type: "attendance_marked",
    attendanceId: attDoc._id,
    courseId: attDoc.course,
    status: attDoc.status,
    date: attDoc.date,
  });
}
async function notifyOnLinkCreated(linkDoc) {
  console.log("[link_created]", {
    code: linkDoc.code,
    course: String(linkDoc.course),
    validFrom: linkDoc.validFrom,
    validTo: linkDoc.validTo,
  });
}

/* -------------------------------------------------------------------------- */
/*                              ATTENDANCE CRUD                               */
/* -------------------------------------------------------------------------- */

/**
 * Create an attendance record (manual). Requires studentId, degreeId, semesterId, courseId.
 * If a record exists for the same student/course/date, unique index will block duplicates.
 */
exports.createAttendance = async (req, res) => {
  try {
    const b = req.body || {};
    const doc = await Attendance.create({
      student: b.studentId,
      degree: b.degreeId,
      semester: b.semesterId,
      course: b.courseId,
      date: toDateOnlyUTC(b.date || new Date()),
      status: (b.status || ATTENDANCE_STATUS.PRESENT).toLowerCase(),
      method: ATTENDANCE_METHOD.MANUAL,
      markedBy: b.markedBy || req.user?._id,
      notes: b.notes,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    await notifyOnMarked(doc);
    return ok(res, doc);
  } catch (err) {
    if (err?.code === 11000) {
      return bad(
        res,
        "Duplicate attendance for that date/student/course.",
        "DUPLICATE",
        409
      );
    }
    return bad(res, err.message, "CREATE_ATTENDANCE_FAILED", 400);
  }
};

exports.getAttendanceById = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await Attendance.findById(id);
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    return bad(res, err.message, "GET_ATTENDANCE_FAILED", 400);
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const allowed = [
      "status",
      "notes",
      "date",
      "courseId",
      "semesterId",
      "degreeId",
    ];
    const patch = pick(req.body || {}, allowed);

    if (patch.date) patch.date = toDateOnlyUTC(patch.date);
    if (patch.courseId) (patch.course = patch.courseId), delete patch.courseId;
    if (patch.semesterId)
      (patch.semester = patch.semesterId), delete patch.semesterId;
    if (patch.degreeId) (patch.degree = patch.degreeId), delete patch.degreeId;

    const doc = await Attendance.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    if (err?.code === 11000) {
      return bad(
        res,
        "Duplicate attendance for that date/student/course.",
        "DUPLICATE",
        409
      );
    }
    return bad(res, err.message, "UPDATE_ATTENDANCE_FAILED", 400);
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await Attendance.findByIdAndDelete(id);
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, { deleted: true, id });
  } catch (err) {
    return bad(res, err.message, "DELETE_ATTENDANCE_FAILED", 400);
  }
};

exports.listAttendance = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parsePaging(req.query);
    const where = buildAttendanceQuery(req.query);

    // optional population flags
    const populate = [];
    if (String(req.query.withStudent) === "true")
      populate.push({ path: "student", select: "name email roll" });
    if (String(req.query.withCourse) === "true")
      populate.push({ path: "course", select: "title code" });
    if (String(req.query.withDegree) === "true")
      populate.push({ path: "degree", select: "name" });
    if (String(req.query.withSemester) === "true")
      populate.push({ path: "semester", select: "name semister_name" });

    let q = Attendance.find(where).sort(sort).skip(skip).limit(limit);
    populate.forEach((p) => (q = q.populate(p)));

    const [items, total] = await Promise.all([
      q,
      Attendance.countDocuments(where),
    ]);

    return ok(res, items, { page, limit, total });
  } catch (err) {
    return bad(res, err.message, "LIST_ATTENDANCE_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                            ATTENDANCE: MARKING                             */
/* -------------------------------------------------------------------------- */

exports.markViaLink = async (req, res) => {
  try {
    const code = String(req.params.code || req.query.code || "").trim();
    if (!code) return bad(res, "Link code missing.");
    const studentId = req.user?._id;
    if (!studentId) return bad(res, "Not authenticated.", "UNAUTHORIZED", 401);

    const linkDoc = await AttendanceLink.findOne({ code });
    if (!linkDoc)
      return bad(res, "Invalid attendance link.", "LINK_NOT_FOUND", 404);

    // Allow client to send explicit degree/semester; fallback to req.user.degree if you store it
    const degreeId =
      req.query.degreeId || req.body?.degreeId || req.user?.degree;
    const semesterId = req.query.semesterId || req.body?.semesterId;

    const { doc, created } = await Attendance.markViaLink({
      linkDoc,
      studentId,
      degreeId,
      semesterId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: ATTENDANCE_STATUS.PRESENT,
      at: new Date(),
    });

    await notifyOnMarked(doc);
    return ok(res, { ...doc.toObject(), created });
  } catch (err) {
    let status = 400;
    if (err.code === "LINK_INVALID") status = 410;
    return bad(res, err.message, "MARK_VIA_LINK_FAILED", status);
  }
};

exports.markManual = async (req, res) => {
  try {
    const b = req.body || {};
    const studentId = b.studentId || req.user?._id;
    if (!studentId) return bad(res, "studentId required.");

    const doc = await Attendance.markManual({
      studentId,
      degreeId: b.degreeId,
      semesterId: b.semesterId,
      courseId: b.courseId,
      date: b.date || new Date(),
      status: (b.status || ATTENDANCE_STATUS.PRESENT).toLowerCase(),
      markedBy: req.user?._id || studentId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      notes: b.notes,
    });

    await notifyOnMarked(doc);
    return ok(res, doc);
  } catch (err) {
    if (err?.code === 11000) {
      return ok(
        res,
        { duplicate: true },
        { message: "Already marked for that day." }
      );
    }
    return bad(res, err.message, "MARK_MANUAL_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                                LINK  CRUD                                  */
/* -------------------------------------------------------------------------- */

exports.createLink = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.courseId) return bad(res, "courseId required.");

    // model will auto-generate a unique code if not provided
    const link = await AttendanceLink.create({
      code: (b.code && String(b.code).trim()) || undefined, // optional
      title: b.title,
      degree: b.degreeId,
      semester: b.semesterId,
      course: b.courseId,
      validFrom: new Date(b.validFrom || Date.now()),
      validTo: new Date(b.validTo || Date.now() + 60 * 60 * 1000),
      isActive: b.isActive !== undefined ? !!b.isActive : true,
      maxUsesPerStudent: b.maxUsesPerStudent || 1,
      createdBy: req.user?._id,
      metadata: b.metadata,
    });

    await notifyOnLinkCreated(link);
    return ok(res, link);
  } catch (err) {
    if (err?.code === 11000) {
      return bad(res, "Duplicate link code.", "DUPLICATE_CODE", 409);
    }
    return bad(res, err.message, "CREATE_LINK_FAILED", 400);
  }
};

exports.getLink = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await AttendanceLink.findById(id);
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    return bad(res, err.message, "GET_LINK_FAILED", 400);
  }
};

exports.getLinkByCode = async (req, res) => {
  try {
    const code = String(req.params.code || req.query.code || "").trim();
    if (!code) return bad(res, "code required.");
    const doc = await AttendanceLink.findOne({ code });
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    return bad(res, err.message, "GET_LINK_BY_CODE_FAILED", 400);
  }
};

exports.updateLink = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");

    const patch = pick(req.body || {}, [
      "title",
      "degreeId",
      "semesterId",
      "courseId",
      "validFrom",
      "validTo",
      "isActive",
      "maxUsesPerStudent",
      "metadata",
      "code", // optional: allow admin to set a new custom code
    ]);

    if (patch.degreeId) (patch.degree = patch.degreeId), delete patch.degreeId;
    if (patch.semesterId)
      (patch.semester = patch.semesterId), delete patch.semesterId;
    if (patch.courseId) (patch.course = patch.courseId), delete patch.courseId;
    if (patch.validFrom) patch.validFrom = new Date(patch.validFrom);
    if (patch.validTo) patch.validTo = new Date(patch.validTo);
    if (patch.code) patch.code = String(patch.code).trim();

    const doc = await AttendanceLink.findByIdAndUpdate(id, patch, {
      new: true,
    });
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    if (err?.code === 11000) {
      return bad(res, "Duplicate link code.", "DUPLICATE_CODE", 409);
    }
    return bad(res, err.message, "UPDATE_LINK_FAILED", 400);
  }
};

exports.deleteLink = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await AttendanceLink.findByIdAndDelete(id);
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, { deleted: true, id });
  } catch (err) {
    return bad(res, err.message, "DELETE_LINK_FAILED", 400);
  }
};

exports.listLinks = async (req, res) => {
  try {
    const { page, limit, skip, sort } = parsePaging(req.query);
    const where = buildLinkQuery(req.query);

    // optional population flags
    const populate = [];
    if (String(req.query.withCourse) === "true")
      populate.push({ path: "course", select: "title code" });
    if (String(req.query.withDegree) === "true")
      populate.push({ path: "degree", select: "name" });
    if (String(req.query.withSemester) === "true")
      populate.push({ path: "semester", select: "name semister_name" });

    let q = AttendanceLink.find(where).sort(sort).skip(skip).limit(limit);
    populate.forEach((p) => (q = q.populate(p)));

    const [items, total] = await Promise.all([
      q,
      AttendanceLink.countDocuments(where),
    ]);

    return ok(res, items, { page, limit, total });
  } catch (err) {
    return bad(res, err.message, "LIST_LINKS_FAILED", 400);
  }
};

/* -------------------------- link utilities (LMS) -------------------------- */

exports.duplicateLink = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const src = await AttendanceLink.findById(id);
    if (!src) return bad(res, "Not found", "NOT_FOUND", 404);

    const shift = parseInt(req.body?.shiftMinutes || "0", 10); // optional
    const validFrom = new Date(
      (src.validFrom?.getTime() || Date.now()) + shift * 60000
    );
    const validTo = new Date(
      (src.validTo?.getTime() || Date.now()) + shift * 60000
    );

    const dup = await AttendanceLink.create({
      title: req.body?.title || `${src.title || "Class Window"} (copy)`,
      degree: src.degree,
      semester: src.semester,
      course: src.course,
      validFrom,
      validTo,
      isActive: true,
      maxUsesPerStudent: src.maxUsesPerStudent || 1,
      createdBy: req.user?._id,
      metadata: src.metadata,
      // code auto-generated
    });

    return ok(res, dup);
  } catch (err) {
    return bad(res, err.message, "DUPLICATE_LINK_FAILED", 400);
  }
};

exports.activateLink = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await AttendanceLink.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    return bad(res, err.message, "ACTIVATE_LINK_FAILED", 400);
  }
};

exports.deactivateLink = async (req, res) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await AttendanceLink.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    return bad(res, err.message, "DEACTIVATE_LINK_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                                   COUNTS                                   */
/* -------------------------------------------------------------------------- */

exports.countByStatus = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.aggregate([
      { $match: where },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const out = rows.reduce((acc, r) => ((acc[r._id] = r.count), acc), {});
    return ok(res, out);
  } catch (err) {
    return bad(res, err.message, "COUNT_BY_STATUS_FAILED", 400);
  }
};

exports.countByCourse = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.aggregate([
      { $match: where },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]);
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "COUNT_BY_COURSE_FAILED", 400);
  }
};

exports.countByStudent = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.aggregate([
      { $match: where },
      { $group: { _id: "$student", count: { $sum: 1 } } },
    ]);
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "COUNT_BY_STUDENT_FAILED", 400);
  }
};

exports.dailyCounts = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.aggregate([
      { $match: where },
      {
        $group: {
          _id: "$date",
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ["$status", "excused"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "DAILY_COUNTS_FAILED", 400);
  }
};

exports.calcMonthlyBreakdown = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.aggregate([
      { $match: where },
      {
        $group: {
          _id: { y: { $year: "$date" }, m: { $month: "$date" } },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]);
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "CALC_MONTHLY_BREAKDOWN_FAILED", 400);
  }
};

exports.calcCourseCoverage = async (req, res) => {
  try {
    const course = parseObjectId(req.query.courseId);
    if (!course) return bad(res, "courseId required.");
    const where = buildAttendanceQuery(req.query);
    where.course = course;

    const uniqueDays = await Attendance.aggregate([
      { $match: where },
      { $group: { _id: "$date" } },
      { $count: "days" },
    ]);
    const totalDays = uniqueDays[0]?.days || 0;

    const present = await Attendance.countDocuments({
      ...where,
      status: "present",
    });

    return ok(res, { totalDays, totalPresentMarks: present });
  } catch (err) {
    return bad(res, err.message, "CALC_COURSE_COVERAGE_FAILED", 400);
  }
};

exports.calcStreak = async (req, res) => {
  try {
    const student = parseObjectId(req.query.studentId);
    const course = parseObjectId(req.query.courseId);
    if (!student || !course)
      return bad(res, "studentId and courseId required.");

    const where = { student, course };
    const records = await Attendance.find(where).sort({ date: -1 }).limit(180);
    let streak = 0;
    const today = toDateOnlyUTC(new Date());
    let expected = today;

    for (const r of records) {
      const d = toDateOnlyUTC(r.date);
      if (r.status !== "present") break;
      if (d.getTime() === expected.getTime()) {
        streak++;
        expected = new Date(expected.getTime() - 24 * 3600 * 1000);
      } else if (d.getTime() === expected.getTime() - 24 * 3600 * 1000) {
        streak++;
        expected = new Date(expected.getTime() - 24 * 3600 * 1000);
      } else {
        break;
      }
    }
    return ok(res, { streak });
  } catch (err) {
    return bad(res, err.message, "CALC_STREAK_FAILED", 400);
  }
};

exports.calcEligibility = async (req, res) => {
  try {
    const threshold = Math.max(
      0,
      Math.min(100, parseInt(req.query.threshold || "75", 10))
    );
    const student = parseObjectId(req.query.studentId);
    const course = parseObjectId(req.query.courseId);
    if (!student || !course)
      return bad(res, "studentId and courseId required.");

    const total = await Attendance.countDocuments({ student, course });
    if (!total)
      return ok(res, { eligible: false, percent: 0, reason: "no_records" });
    const present = await Attendance.countDocuments({
      student,
      course,
      status: "present",
    });
    const percent = Math.round((present / total) * 100);
    return ok(res, { eligible: percent >= threshold, percent, threshold });
  } catch (err) {
    return bad(res, err.message, "CALC_ELIGIBILITY_FAILED", 400);
  }
};

exports.calcLeaderboard = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    if (!where.course && !where.semester && !where.degree) {
      return bad(
        res,
        "Provide at least one of courseId | semesterId | degreeId.",
        "SCOPE_REQUIRED",
        400
      );
    }
    const rows = await Attendance.aggregate([
      { $match: where },
      {
        $group: {
          _id: { student: "$student" },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        },
      },
      {
        $project: {
          student: "$_id.student",
          total: 1,
          present: 1,
          percent: {
            $cond: [
              { $gt: ["$total", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { percent: -1, present: -1 } },
      {
        $limit: Math.max(
          5,
          Math.min(100, parseInt(req.query.limit || "20", 10))
        ),
      },
    ]);
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "CALC_LEADERBOARD_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                                 BULK OPS                                   */
/* -------------------------------------------------------------------------- */

exports.bulkMark = async (req, res) => {
  try {
    // [{ studentId, degreeId, semesterId, courseId, date, status, notes }]
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return bad(res, "items[] required");

    const results = [];
    for (const it of items) {
      // eslint-disable-next-line no-await-in-loop
      const doc = await Attendance.markManual({
        studentId: it.studentId,
        degreeId: it.degreeId,
        semesterId: it.semesterId,
        courseId: it.courseId,
        date: it.date || new Date(),
        status: (it.status || ATTENDANCE_STATUS.PRESENT).toLowerCase(),
        markedBy: req.user?._id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        notes: it.notes,
      });
      results.push(doc);
    }
    return ok(res, results, { count: results.length });
  } catch (err) {
    return bad(res, err.message, "BULK_MARK_FAILED", 400);
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.body || {});
    const r = await Attendance.deleteMany(where);
    return ok(res, { deleted: r.deletedCount || 0 });
  } catch (err) {
    return bad(res, err.message, "BULK_DELETE_FAILED", 400);
  }
};

exports.bulkImport = async (req, res) => {
  try {
    // Accept either: items[] like bulkMark OR array-of-objects parsed from CSV
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return bad(res, "items[] required");

    const ops = items.map((it) => ({
      updateOne: {
        filter: {
          student: parseObjectId(it.studentId),
          course: parseObjectId(it.courseId),
          date: toDateOnlyUTC(it.date || new Date()),
        },
        update: {
          $set: {
            student: parseObjectId(it.studentId),
            degree: parseObjectId(it.degreeId),
            semester: parseObjectId(it.semesterId),
            course: parseObjectId(it.courseId),
            date: toDateOnlyUTC(it.date || new Date()),
            status: (it.status || ATTENDANCE_STATUS.PRESENT).toLowerCase(),
            method: ATTENDANCE_METHOD.MANUAL,
            markedBy: req.user?._id,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            notes: it.notes,
          },
          $setOnInsert: { markedAt: new Date() },
        },
        upsert: true,
      },
    }));

    const r = await Attendance.bulkWrite(ops, { ordered: false });
    return ok(res, r);
  } catch (err) {
    return bad(res, err.message, "BULK_IMPORT_FAILED", 400);
  }
};

exports.bulkGenerateLinks = async (req, res) => {
  try {
    // body: { courseId, degreeId, semesterId, count, spanMinutes, startAt, intervalMinutes, title }
    const b = req.body || {};
    const courseId = parseObjectId(b.courseId);
    if (!courseId) return bad(res, "courseId required.");
    const count = Math.max(1, Math.min(200, parseInt(b.count || "1", 10)));
    const span = Math.max(
      5,
      Math.min(360, parseInt(b.spanMinutes || "60", 10))
    );
    const interval = Math.max(0, parseInt(b.intervalMinutes || "0", 10));

    let startAt = new Date(b.startAt || Date.now());
    const out = [];
    for (let i = 0; i < count; i++) {
      const validFrom = new Date(startAt);
      const validTo = new Date(validFrom.getTime() + span * 60 * 1000);
      // code auto-generated
      // eslint-disable-next-line no-await-in-loop
      const link = await AttendanceLink.create({
        title: b.title || `Class Window #${i + 1}`,
        degree: parseObjectId(b.degreeId),
        semester: parseObjectId(b.semesterId),
        course: courseId,
        validFrom,
        validTo,
        isActive: true,
        maxUsesPerStudent: 1,
        createdBy: req.user?._id,
      });
      out.push(link);
      if (interval > 0)
        startAt = new Date(startAt.getTime() + interval * 60 * 1000);
    }
    return ok(res, out);
  } catch (err) {
    return bad(res, err.message, "BULK_GENERATE_LINKS_FAILED", 400);
  }
};

exports.deactivateExpiredLinks = async (_req, res) => {
  try {
    const now = new Date();
    const r = await AttendanceLink.updateMany(
      { isActive: true, validTo: { $lt: now } },
      { $set: { isActive: false } }
    );
    return ok(res, { modified: r.modifiedCount || 0 });
  } catch (err) {
    return bad(res, err.message, "DEACTIVATE_EXPIRED_LINKS_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                               NOTIFICATIONS                                */
/* -------------------------------------------------------------------------- */

exports.sendReminderForActiveLink = async (req, res) => {
  try {
    // NOTE: this endpoint expects courseId in the QUERY (?courseId=...)
    const courseId = parseObjectId(req.query.courseId);
    if (!courseId) return bad(res, "courseId required.");
    const now = new Date();

    const link = await AttendanceLink.findOne({
      course: courseId,
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    }).sort({ validFrom: -1 });

    if (!link) return bad(res, "No active link found.", "NO_ACTIVE_LINK", 404);

    // TODO: fetch enrolled students for the course from your Enrollment model
    const enrolledStudentIds = []; // e.g., await Enrollment.find({course: courseId}).distinct('student');
    if (!enrolledStudentIds.length)
      return ok(res, { sent: 0, note: "No enrolled students (mock)." });

    await notify(enrolledStudentIds, {
      type: "attendance_reminder",
      courseId: courseId,
      linkCode: link.code,
      validTo: link.validTo,
    });
    return ok(res, { sent: enrolledStudentIds.length });
  } catch (err) {
    return bad(res, err.message, "SEND_REMINDER_FAILED", 400);
  }
};

exports.notifyLowAttendance = async (req, res) => {
  try {
    const threshold = Math.max(
      0,
      Math.min(100, parseInt(req.query.threshold || "75", 10))
    );
    const where = buildAttendanceQuery(req.query);
    if (!where.course && !where.semester)
      return bad(res, "Provide courseId or semesterId.");

    const rows = await Attendance.aggregate([
      { $match: where },
      {
        $group: {
          _id: "$student",
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        },
      },
      {
        $project: {
          student: "$_id",
          total: 1,
          present: 1,
          percent: {
            $cond: [
              { $gt: ["$total", 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ["$present", "$total"] }, 100] },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      { $match: { percent: { $lt: threshold } } },
    ]);

    const ids = rows.map((r) => r.student);
    if (ids.length) {
      await notify(ids, {
        type: "low_attendance_warning",
        context: where.course ? "course" : "semester",
        threshold,
      });
    }
    return ok(res, { warned: ids.length });
  } catch (err) {
    return bad(res, err.message, "NOTIFY_LOW_ATTENDANCE_FAILED", 400);
  }
};

exports.notifyInstructorSummary = async (req, res) => {
  try {
    const courseId = parseObjectId(req.query.courseId);
    const date = toDateOnlyUTC(req.query.date || new Date());
    if (!courseId) return bad(res, "courseId required.");

    const where = { course: courseId, date };
    const [total, present, absent, late, excused] = await Promise.all([
      Attendance.countDocuments(where),
      Attendance.countDocuments({ ...where, status: "present" }),
      Attendance.countDocuments({ ...where, status: "absent" }),
      Attendance.countDocuments({ ...where, status: "late" }),
      Attendance.countDocuments({ ...where, status: "excused" }),
    ]);

    // TODO: Lookup instructorId(s) for the course from Course model
    const instructorIds = []; // e.g., await Course.findById(courseId).select('instructors').then(...)
    if (instructorIds.length) {
      await notify(instructorIds, {
        type: "instructor_daily_summary",
        courseId,
        date,
        totals: { total, present, absent, late, excused },
      });
    }
    return ok(res, {
      sent: instructorIds.length,
      totals: { total, present, absent, late, excused },
    });
  } catch (err) {
    return bad(res, err.message, "NOTIFY_INSTRUCTOR_SUMMARY_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                                   EXPORTS                                   */
/* -------------------------------------------------------------------------- */

exports.exportAttendanceJSON = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.find(where).lean();
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "EXPORT_ATTENDANCE_FAILED", 400);
  }
};

exports.exportAttendanceCSV = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.find(where)
      .populate("student", "name email")
      .populate("course", "title code")
      .populate("degree", "name")
      .populate("semester", "name semister_name")
      .lean();

    const header = [
      "studentId",
      "studentName",
      "studentEmail",
      "degree",
      "semester",
      "course",
      "courseTitle",
      "date",
      "status",
      "method",
      "markedAt",
      "notes",
    ];
    const lines = [header.join(",")];

    for (const r of rows) {
      lines.push(
        [
          r.student?._id ?? "",
          (r.student?.name || "").replace(/,/g, " "),
          r.student?.email || "",
          r.degree?.name || r.degree || "",
          r.semester?.name || r.semester?.semister_name || r.semester || "",
          r.course?._id ?? "",
          (r.course?.title || "").replace(/,/g, " "),
          new Date(r.date).toISOString().slice(0, 10),
          r.status,
          r.method,
          r.markedAt ? new Date(r.markedAt).toISOString() : "",
          (r.notes || "").replace(/,/g, " "),
        ].join(",")
      );
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
    return res.status(200).send(csv);
  } catch (err) {
    return bad(res, err.message, "EXPORT_ATTENDANCE_CSV_FAILED", 400);
  }
};


/* ============================ MY ATTENDANCE (STUDENT) ============================ */

/**
 * GET /api/my-attendance-summary
 * Query:
 *  - studentId (optional if you set req.user in authRequired)
 *  - degreeId, semesterId (recommended)
 *  - courseId (optional)
 *  - from, to (ISO datetimes) -> converted to dateFrom/dateTo (date-only)
 *
 * Response: { present, total, percentage, breakdownByCourse?: [{courseId, present, total, pct}] }
 */
exports.myAttendanceSummary = async (req, res) => {
  try {
    const q = req.query || {};

    // If your auth middleware sets req.user, prefer that. Otherwise accept studentId via query.
    const studentId =
      parseObjectId(q.studentId) || parseObjectId(req.user?._id);
    if (!studentId) return bad(res, "studentId required.", "STUDENT_REQUIRED", 400);

    // Build a where clause in terms the DB understands (date-only range)
    const where = buildAttendanceQuery({
      studentId: studentId,
      degreeId: q.degreeId,
      semesterId: q.semesterId,
      courseId: q.courseId,
      status: q.status,                 // optional
      dateFrom: q.from,                 // map from->dateFrom
      dateTo: q.to,                     // map to->dateTo
    });

    // Top-level counts
    const [total, present] = await Promise.all([
      Attendance.countDocuments(where),
      Attendance.countDocuments({ ...where, status: "present" }),
    ]);

    let breakdownByCourse = [];
    // Always compute per-course breakdown (frontend can ignore if they want)
    const rows = await Attendance.aggregate([
      { $match: where },
      {
        $group: {
          _id: "$course",
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
        },
      },
    ]);

    breakdownByCourse = rows.map((r) => ({
      courseId: r._id,
      present: r.present || 0,
      total: r.total || 0,
      pct:
        r.total > 0 ? Math.round((Number(r.present || 0) / r.total) * 100) : 0,
    }));

    const percentage =
      total > 0 ? Math.round((Number(present || 0) / total) * 100) : 0;

    return ok(res, {
      present,
      total,
      percentage,
      breakdownByCourse,
    });
  } catch (err) {
    return bad(res, err.message, "MY_ATTENDANCE_SUMMARY_FAILED", 400);
  }
};

/**
 * GET /api/my-attendance-list
 * Same filters as summary. Returns individual rows (used for CSV and "Daily Log").
 *
 * Response: Array<{ _id, courseId, courseTitle?, status, date, markedAt, createdAt }>
 */
exports.myAttendanceList = async (req, res) => {
  try {
    const q = req.query || {};
    const studentId =
      parseObjectId(q.studentId) || parseObjectId(req.user?._id);
    if (!studentId) return bad(res, "studentId required.", "STUDENT_REQUIRED", 400);

    const where = buildAttendanceQuery({
      studentId: studentId,
      degreeId: q.degreeId,
      semesterId: q.semesterId,
      courseId: q.courseId,
      status: q.status,
      dateFrom: q.from,
      dateTo: q.to,
    });

    const items = await Attendance.find(where)
      .sort({ date: -1, createdAt: -1 })
      .populate({ path: "course", select: "title name code" })
      .lean();

    const out = items.map((r) => ({
      _id: r._id,
      studentId: r.student,
      courseId: r.course?._id || r.course,
      courseTitle: r.course?.title || r.course?.name || r.course?.code || undefined,
      status: r.status,
      date: r.date,        // date-only (UTC midnight)
      markedAt: r.markedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return ok(res, out);
  } catch (err) {
    return bad(res, err.message, "MY_ATTENDANCE_LIST_FAILED", 400);
  }
};
