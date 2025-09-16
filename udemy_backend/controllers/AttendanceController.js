// AttendenceController.js
// Express-style controller functions for Attendance & AttendanceLink.
//
// NOTE: If your model file is named "AttendenceModel.js", update the require below.
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

const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== "";

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

function buildAttendanceQuery(q) {
  const where = {};
  // ids
  if (q.id) {
    const id = parseObjectId(q.id);
    if (id) where._id = id;
  }
  // foreigns
  const student = parseObjectId(q.student || q.studentId);
  if (student) where.student = student;
  const degree = parseObjectId(q.degree || q.degreeId);
  if (degree) where.degree = degree;
  const semester = parseObjectId(q.semester || q.semesterId);
  if (semester) where.semester = semester;
  const course = parseObjectId(q.course || q.courseId);
  if (course) where.course = course;

  // enums
  if (isNonEmpty(q.status)) where.status = String(q.status).toLowerCase();
  if (isNonEmpty(q.method)) where.method = String(q.method).toLowerCase();

  // date filters (normalized date-only)
  if (isNonEmpty(q.date)) where.date = toDateOnlyUTC(q.date);
  if (isNonEmpty(q.dateFrom) || isNonEmpty(q.dateTo)) {
    where.date = {};
    if (isNonEmpty(q.dateFrom)) where.date.$gte = toDateOnlyUTC(q.dateFrom);
    if (isNonEmpty(q.dateTo)) where.date.$lte = toDateOnlyUTC(q.dateTo);
  }
  return where;
}

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

  if (isNonEmpty(q.code)) where.code = String(q.code);
  if (isNonEmpty(q.isActive)) where.isActive = String(q.isActive) === "true";

  // validity window
  if (isNonEmpty(q.activeNow)) {
    const now = new Date();
    where.validFrom = { $lte: now };
    where.validTo = { $gte: now };
    where.isActive = true;
  }

  // range filters
  if (isNonEmpty(q.from) || isNonEmpty(q.to)) {
    if (isNonEmpty(q.from)) (where.validFrom = where.validFrom || {}), (where.validFrom.$gte = new Date(q.from));
    if (isNonEmpty(q.to)) (where.validTo = where.validTo || {}), (where.validTo.$lte = new Date(q.to));
  }

  return where;
}

/* --------------------------- Notification stubs --------------------------- */
// Replace these with your email/SMS/push/queue integrations.
async function notify(userIds, payload) {
  // e.g., enqueue to a worker: Queue.publish('notifications', { userIds, payload })
  // For now, just log:
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
  // broadcast to students enrolled in linkDoc.course if you track enrollments
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

// Create (manual)
exports.createAttendance = async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Attendance.create({
      student: body.studentId,
      degree: body.degreeId,
      semester: body.semesterId,
      course: body.courseId,
      date: toDateOnlyUTC(body.date || new Date()),
      status: (body.status || ATTENDANCE_STATUS.PRESENT).toLowerCase(),
      method: ATTENDANCE_METHOD.MANUAL,
      markedBy: body.markedBy || req.user?._id,
      notes: body.notes,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    await notifyOnMarked(doc);
    return ok(res, doc);
  } catch (err) {
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
    const allowed = ["status", "notes", "date", "courseId", "semesterId", "degreeId"];
    const patch = pick(req.body || {}, allowed);

    if (patch.date) patch.date = toDateOnlyUTC(patch.date);
    if (patch.courseId) patch.course = patch.courseId, delete patch.courseId;
    if (patch.semesterId) patch.semester = patch.semesterId, delete patch.semesterId;
    if (patch.degreeId) patch.degree = patch.degreeId, delete patch.degreeId;

    const doc = await Attendance.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    if (err.code === 11000) {
      return bad(res, "Duplicate attendance for that date/student/course.", "DUPLICATE", 409);
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
    const [items, total] = await Promise.all([
      Attendance.find(where).sort(sort).skip(skip).limit(limit),
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
    if (!linkDoc) return bad(res, "Invalid attendance link.", "LINK_NOT_FOUND", 404);

    const degreeId = req.query.degreeId || req.body?.degreeId || req.user?.degree;
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
    const body = req.body || {};
    const studentId = body.studentId || req.user?._id;
    if (!studentId) return bad(res, "studentId required.");

    const doc = await Attendance.markManual({
      studentId,
      degreeId: body.degreeId,
      semesterId: body.semesterId,
      courseId: body.courseId,
      date: body.date || new Date(),
      status: (body.status || ATTENDANCE_STATUS.PRESENT).toLowerCase(),
      markedBy: req.user?._id || studentId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      notes: body.notes,
    });

    await notifyOnMarked(doc);
    return ok(res, doc);
  } catch (err) {
    if (err.code === 11000) {
      return ok(res, { duplicate: true }, { message: "Already marked for that day." });
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
    const link = await AttendanceLink.create({
      code: b.code, // optional; if omitted, you can call AttendanceLink.createForCourse elsewhere
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
    const code = String(req.params.code || req.query.code || "");
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
    ]);

    if (patch.degreeId) patch.degree = patch.degreeId, delete patch.degreeId;
    if (patch.semesterId) patch.semester = patch.semesterId, delete patch.semesterId;
    if (patch.courseId) patch.course = patch.courseId, delete patch.courseId;
    if (patch.validFrom) patch.validFrom = new Date(patch.validFrom);
    if (patch.validTo) patch.validTo = new Date(patch.validTo);

    const doc = await AttendanceLink.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
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
    const [items, total] = await Promise.all([
      AttendanceLink.find(where).sort(sort).skip(skip).limit(limit),
      AttendanceLink.countDocuments(where),
    ]);
    return ok(res, items, { page, limit, total });
  } catch (err) {
    return bad(res, err.message, "LIST_LINKS_FAILED", 400);
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

/* -------------------------------------------------------------------------- */
/*                                   FILTERS                                  */
/* -------------------------------------------------------------------------- */

exports.listByMethod = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    if (!where.method && req.params.method) where.method = req.params.method;
    const { page, limit, skip, sort } = parsePaging(req.query);
    const [items, total] = await Promise.all([
      Attendance.find(where).sort(sort).skip(skip).limit(limit),
      Attendance.countDocuments(where),
    ]);
    return ok(res, items, { page, limit, total });
  } catch (err) {
    return bad(res, err.message, "LIST_BY_METHOD_FAILED", 400);
  }
};

exports.listLate = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    where.status = "late";
    const { page, limit, skip, sort } = parsePaging(req.query);
    const [items, total] = await Promise.all([
      Attendance.find(where).sort(sort).skip(skip).limit(limit),
      Attendance.countDocuments(where),
    ]);
    return ok(res, items, { page, limit, total });
  } catch (err) {
    return bad(res, err.message, "LIST_LATE_FAILED", 400);
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
    // Accept either: items[] like bulkMark OR a minimally-shaped CSV payload
    // For CSV you can send array of objects already parsed on the client.
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
    // Generate multiple links for recurring classes
    // body: { courseId, degreeId, semesterId, count, spanMinutes, startAt, intervalMinutes, title }
    const b = req.body || {};
    const count = Math.max(1, Math.min(200, parseInt(b.count || "1", 10)));
    const span = Math.max(5, Math.min(360, parseInt(b.spanMinutes || "60", 10)));
    const interval = Math.max(0, parseInt(b.intervalMinutes || "0", 10));

    let startAt = new Date(b.startAt || Date.now());
    const out = [];
    for (let i = 0; i < count; i++) {
      const validFrom = new Date(startAt);
      const validTo = new Date(validFrom.getTime() + span * 60 * 1000);
      const link = await AttendanceLink.create({
        title: b.title || `Class Window #${i + 1}`,
        degree: b.degreeId,
        semester: b.semesterId,
        course: b.courseId,
        validFrom,
        validTo,
        isActive: true,
        maxUsesPerStudent: 1,
        createdBy: req.user?._id,
      });
      out.push(link);
      if (interval > 0) startAt = new Date(startAt.getTime() + interval * 60 * 1000);
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
/*                               CALCULATIONS                                 */
/* -------------------------------------------------------------------------- */

// percentage for one student in one course (optionally date range)
exports.calcStudentCoursePercent = async (req, res) => {
  try {
    const student = parseObjectId(req.query.studentId);
    const course = parseObjectId(req.query.courseId);
    if (!student || !course) return bad(res, "studentId and courseId required.");

    const where = buildAttendanceQuery(req.query);
    where.student = student;
    where.course = course;

    const total = await Attendance.countDocuments(where);
    if (!total) return ok(res, { percent: 0, total: 0, present: 0 });

    const present = await Attendance.countDocuments({ ...where, status: "present" });
    const percent = Math.round((present / total) * 100);
    return ok(res, { percent, total, present });
  } catch (err) {
    return bad(res, err.message, "CALC_STUDENT_COURSE_PERCENT_FAILED", 400);
  }
};

// percentage for one student across a semester (all courses)
exports.calcStudentSemesterPercent = async (req, res) => {
  try {
    const student = parseObjectId(req.query.studentId);
    const semester = parseObjectId(req.query.semesterId);
    if (!student || !semester) return bad(res, "studentId and semesterId required.");

    const where = buildAttendanceQuery(req.query);
    where.student = student;
    where.semester = semester;

    const total = await Attendance.countDocuments(where);
    if (!total) return ok(res, { percent: 0, total: 0, present: 0 });

    const present = await Attendance.countDocuments({ ...where, status: "present" });
    const percent = Math.round((present / total) * 100);
    return ok(res, { percent, total, present });
  } catch (err) {
    return bad(res, err.message, "CALC_STUDENT_SEMESTER_PERCENT_FAILED", 400);
  }
};

// daily/weekly/monthly breakdown for a student or course
exports.calcMonthlyBreakdown = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.aggregate([
      { $match: where },
      {
        $group: {
          _id: {
            y: { $year: "$date" },
            m: { $month: "$date" },
          },
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

// class coverage for a course: how many unique class-days exist (any mark) vs present marks
exports.calcCourseCoverage = async (req, res) => {
  try {
    const course = parseObjectId(req.query.courseId);
    if (!course) return bad(res, "courseId required.");
    const where = buildAttendanceQuery(req.query);
    where.course = course;

    // unique days with any attendance record
    const uniqueDays = await Attendance.aggregate([
      { $match: where },
      { $group: { _id: "$date" } },
      { $count: "days" },
    ]);
    const totalDays = uniqueDays[0]?.days || 0;

    // total "present" marks in the course
    const present = await Attendance.countDocuments({ ...where, status: "present" });

    return ok(res, { totalDays, totalPresentMarks: present });
  } catch (err) {
    return bad(res, err.message, "CALC_COURSE_COVERAGE_FAILED", 400);
  }
};

// consecutive attendance streak for a student (present-only), latest first
exports.calcStreak = async (req, res) => {
  try {
    const student = parseObjectId(req.query.studentId);
    const course = parseObjectId(req.query.courseId);
    if (!student || !course) return bad(res, "studentId and courseId required.");

    const where = { student, course };
    const records = await Attendance.find(where).sort({ date: -1 }).limit(120); // last ~4 months
    let streak = 0;
    const today = toDateOnlyUTC(new Date());
    let expected = today;

    for (const r of records) {
      const d = toDateOnlyUTC(r.date);
      if (r.status !== "present") break;
      // If there are gaps, stop; otherwise continue streak day-by-day (Mon-Fri only? If needed, add calendar rules)
      if (d.getTime() === expected.getTime()) {
        streak++;
        expected = new Date(expected.getTime() - 24 * 3600 * 1000);
      } else if (d.getTime() === expected.getTime() - 24 * 3600 * 1000) {
        // Accept previous day if we started today with no class
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

// eligibility: is student allowed to sit exam (threshold%, e.g., 75)
exports.calcEligibility = async (req, res) => {
  try {
    const threshold = Math.max(0, Math.min(100, parseInt(req.query.threshold || "75", 10)));
    const student = parseObjectId(req.query.studentId);
    const course = parseObjectId(req.query.courseId);
    if (!student || !course) return bad(res, "studentId and courseId required.");

    const total = await Attendance.countDocuments({ student, course });
    if (!total) return ok(res, { eligible: false, percent: 0, reason: "no_records" });
    const present = await Attendance.countDocuments({ student, course, status: "present" });
    const percent = Math.round((present / total) * 100);
    return ok(res, { eligible: percent >= threshold, percent, threshold });
  } catch (err) {
    return bad(res, err.message, "CALC_ELIGIBILITY_FAILED", 400);
  }
};

// leaderboard: top students by percent present within course/semester/degree
exports.calcLeaderboard = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    if (!where.course && !where.semester && !where.degree) {
      return bad(res, "Provide at least one of courseId | semesterId | degreeId to scope the leaderboard.");
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
            $cond: [{ $gt: ["$total", 0] }, { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 0] }, 0],
          },
        },
      },
      { $sort: { percent: -1, present: -1 } },
      { $limit: Math.max(5, Math.min(100, parseInt(req.query.limit || "20", 10))) },
    ]);
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "CALC_LEADERBOARD_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                               NOTIFICATIONS                                */
/* -------------------------------------------------------------------------- */

// Reminder to mark attendance for an active link (send to enrolled students)
// Requires you to have a way to fetch enrolled studentIds for the course.
exports.sendReminderForActiveLink = async (req, res) => {
  try {
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

    // TODO: fetch enrolled students for the course
    const enrolledStudentIds = []; // <- fill from your Enrollment model
    if (!enrolledStudentIds.length) return ok(res, { sent: 0, note: "No enrolled students (mock)." });

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

// Alert students with low attendance (below threshold) in a semester or course
exports.notifyLowAttendance = async (req, res) => {
  try {
    const threshold = Math.max(0, Math.min(100, parseInt(req.query.threshold || "75", 10)));
    const where = buildAttendanceQuery(req.query);
    if (!where.course && !where.semester) return bad(res, "Provide courseId or semesterId.");

    const rows = await Attendance.aggregate([
      { $match: where },
      { $group: { _id: "$student", total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } } } },
      {
        $project: {
          student: "$_id",
          total: 1,
          present: 1,
          percent: {
            $cond: [{ $gt: ["$total", 0] }, { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 0] }, 0],
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

// Send instructor a daily summary for a course/date
exports.notifyInstructorSummary = async (req, res) => {
  try {
    const courseId = parseObjectId(req.query.courseId);
    const date = toDateOnlyUTC(req.query.date || new Date());
    if (!courseId) return bad(res, "courseId required.");

    const where = { course: courseId, date };
    const total = await Attendance.countDocuments(where);
    const present = await Attendance.countDocuments({ ...where, status: "present" });
    const absent = await Attendance.countDocuments({ ...where, status: "absent" });
    const late = await Attendance.countDocuments({ ...where, status: "late" });
    const excused = await Attendance.countDocuments({ ...where, status: "excused" });

    // TODO: Lookup instructorId(s) for the course
    const instructorIds = []; // fill from Course -> instructor mapping
    if (instructorIds.length) {
      await notify(instructorIds, {
        type: "instructor_daily_summary",
        courseId,
        date,
        totals: { total, present, absent, late, excused },
      });
    }
    return ok(res, { sent: instructorIds.length, totals: { total, present, absent, late, excused } });
  } catch (err) {
    return bad(res, err.message, "NOTIFY_INSTRUCTOR_SUMMARY_FAILED", 400);
  }
};

/* -------------------------------------------------------------------------- */
/*                          SCHOOL/COLLEGE-SPECIFIC                           */
/* -------------------------------------------------------------------------- */

// Mark attendance for all students enrolled in a class session (e.g., present by default)
exports.bulkMarkForSession = async (req, res) => {
  try {
    // body: { courseId, semesterId, degreeId, date, defaultStatus, studentIds[] }
    const b = req.body || {};
    const courseId = parseObjectId(b.courseId);
    if (!courseId) return bad(res, "courseId required.");
    const date = toDateOnlyUTC(b.date || new Date());
    const defaultStatus = (b.defaultStatus || ATTENDANCE_STATUS.PRESENT).toLowerCase();
    const studentIds = (b.studentIds || []).map(parseObjectId).filter(Boolean);

    if (!studentIds.length) return bad(res, "studentIds[] required.");
    const ops = studentIds.map((sid) => ({
      updateOne: {
        filter: { student: sid, course: courseId, date },
        update: {
          $set: {
            student: sid,
            degree: parseObjectId(b.degreeId),
            semester: parseObjectId(b.semesterId),
            course: courseId,
            date,
            status: defaultStatus,
            method: ATTENDANCE_METHOD.MANUAL,
            markedBy: req.user?._id,
          },
          $setOnInsert: { markedAt: new Date() },
        },
        upsert: true,
      },
    }));
    const r = await Attendance.bulkWrite(ops, { ordered: false });
    return ok(res, r);
  } catch (err) {
    return bad(res, err.message, "BULK_MARK_FOR_SESSION_FAILED", 400);
  }
};

// Undo a day's attendance for a course (admin use)
exports.clearCourseDay = async (req, res) => {
  try {
    const courseId = parseObjectId(req.body?.courseId);
    const date = toDateOnlyUTC(req.body?.date);
    if (!courseId || !date) return bad(res, "courseId and date required.");
    const r = await Attendance.deleteMany({ course: courseId, date });
    return ok(res, { deleted: r.deletedCount || 0 });
  } catch (err) {
    return bad(res, err.message, "CLEAR_COURSE_DAY_FAILED", 400);
  }
};

// Export attendance (JSON for now; CSV can be done in route layer)
exports.exportAttendance = async (req, res) => {
  try {
    const where = buildAttendanceQuery(req.query);
    const rows = await Attendance.find(where).lean();
    return ok(res, rows);
  } catch (err) {
    return bad(res, err.message, "EXPORT_ATTENDANCE_FAILED", 400);
  }
};
