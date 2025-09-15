// controllers/StudentAdmissionController.js
const mongoose = require("mongoose");
const { Types } = mongoose;

const StudentAdmission = require("../models/StudentAdmissionModel"); // <-- the schema you shared
const User = require("../models/UserModel");
const Degree = require("../models/DegreeModel");
const Course = require("../models/CourseModel");

// If you have a Semester model registered as "Semester"
let SemesterModelName = "Semester"; // change to "semester" if that's your registered name

/* ----------------------------- helpers ------------------------------ */

const looksLikeId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
const toObjectId = (v) => (looksLikeId(String(v)) ? new Types.ObjectId(v) : null);
const normalizeEmail = (s) => String(s || "").trim().toLowerCase();
const boolFrom = (v) =>
  typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);
const safeInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const sendOk = (res, data, meta) => res.status(200).json({ ok: true, data, meta });
const sendCreated = (res, data) => res.status(201).json({ ok: true, data });
const sendErr = (res, code, message) => res.status(code).json({ ok: false, message });

/** Common populate for list/get */
const POPULATE = [
  { path: "user", select: "name email phone role avatar" },
  { path: "intendedEnrollment.degree", select: "name code slug level totalSemesters isActive" },
  // force the model name to avoid case-mismatch bugs between "Semester" vs "semester"
  { path: "intendedEnrollment.semester", select: "semester_name semNumber slug isActive", model: SemesterModelName },
  { path: "intendedEnrollment.course", select: "title code slug isActive" },
  { path: "reviewedBy", select: "name email role" },
  { path: "createdBy", select: "name email role" },
  { path: "updatedBy", select: "name email role" },
  { path: "student", select: "rollNumber regNumber user degree currentSemester" }, // if you have Student model
];

/** Build filters from query string */
function buildFilters(query = {}) {
  const {
    q,
    status,
    degree,
    semester,
    course,
    academicYear,
    email,
    userId,
    isDeleted,
    from,
    to,
  } = query;

  const $and = [];

  if (typeof isDeleted !== "undefined") {
    $and.push({ isDeleted: boolFrom(isDeleted) });
  } else {
    // default hide deleted
    $and.push({ isDeleted: { $ne: true } });
  }

  if (status) $and.push({ applicationStatus: status });

  if (degree && (looksLikeId(degree) || Array.isArray(degree))) {
    const val = Array.isArray(degree)
      ? degree.map(toObjectId).filter(Boolean)
      : [toObjectId(degree)];
    $and.push({ "intendedEnrollment.degree": { $in: val } });
  }

  if (semester && (looksLikeId(semester) || Array.isArray(semester))) {
    const val = Array.isArray(semester)
      ? semester.map(toObjectId).filter(Boolean)
      : [toObjectId(semester)];
    $and.push({ "intendedEnrollment.semester": { $in: val } });
  }

  if (course && (looksLikeId(course) || Array.isArray(course))) {
    const val = Array.isArray(course)
      ? course.map(toObjectId).filter(Boolean)
      : [toObjectId(course)];
    $and.push({ "intendedEnrollment.course": { $in: val } });
  }

  if (academicYear) {
    $and.push({ "intendedEnrollment.academicYear": String(academicYear) });
  }

  if (userId && looksLikeId(userId)) $and.push({ user: toObjectId(userId) });

  if (email) $and.push({ email: normalizeEmail(email) });

  if (from || to) {
    const createdAt = {};
    if (from) createdAt.$gte = new Date(from);
    if (to) createdAt.$lte = new Date(to);
    $and.push({ createdAt });
  }

  if (q && String(q).trim()) {
    const s = String(q).trim();
    $and.push({
      $or: [
        { firstName: new RegExp(s, "i") },
        { lastName: new RegExp(s, "i") },
        { email: new RegExp(s, "i") },
        { phone: new RegExp(s, "i") },
        { "intendedEnrollment.academicYear": new RegExp(s, "i") },
      ],
    });
  }

  return $and.length ? { $and } : {};
}

function parsePaginationSort(query = {}) {
  const page = Math.max(1, safeInt(query.page, 1));
  const limit = Math.min(200, Math.max(1, safeInt(query.limit, 20)));
  const sortBy = String(query.sortBy || "createdAt");
  const sortDir = String(query.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;
  return { page, limit, sort: { [sortBy]: sortDir } };
}

/** Ensure there isn’t an existing admission for same user+degree+academicYear (not deleted) */
async function findDuplicateAdmission({ userId, degreeId, academicYear, excludeId = null }) {
  const filter = {
    user: userId,
    "intendedEnrollment.degree": degreeId,
    "intendedEnrollment.academicYear": academicYear,
    isDeleted: { $ne: true },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return StudentAdmission.findOne(filter).lean();
}

/* ----------------------------- controllers ------------------------------ */

/**
 * Create / give admission
 * Auto-links existing User by userId OR email (no duplicate student creation).
 * Rejects if duplicate admission exists for same user+degree+academicYear.
 */
exports.createAdmission = async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      user: userIdRaw,
      email: emailRaw,
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      nationality,
      category,
      address,
      permanentAddress,
      intendedEnrollment = {},
      priorEducation = [],
      documents = [],
      termsAccepted = false,
      createdBy,
    } = payload;

    // 1) Resolve / validate user (must exist; don't create new)
    let userDoc = null;

    if (userIdRaw && looksLikeId(userIdRaw)) {
      userDoc = await User.findById(userIdRaw).lean();
      if (!userDoc) return sendErr(res, 400, "User not found by 'user' id.");
    } else if (emailRaw) {
      userDoc = await User.findOne({ email: normalizeEmail(emailRaw) }).lean();
      if (!userDoc) return sendErr(res, 400, "No existing user for given email.");
    } else {
      return sendErr(res, 400, "Provide 'user' (ObjectId) or 'email' to link an existing user.");
    }

    // Optional: enforce role=student (or auto-set elsewhere)
    // if (userDoc.role !== "student") return sendErr(res, 400, "User is not a student.");

    // 2) Validate intended enrollment
    const degreeId = intendedEnrollment.degree && toObjectId(intendedEnrollment.degree);
    const semesterId = intendedEnrollment.semester && toObjectId(intendedEnrollment.semester);
    const courseId = intendedEnrollment.course && toObjectId(intendedEnrollment.course);
    const academicYear = String(intendedEnrollment.academicYear || "").trim();

    if (!degreeId) return sendErr(res, 400, "intendedEnrollment.degree is required.");
    if (!academicYear) return sendErr(res, 400, "intendedEnrollment.academicYear is required.");

    // Validate existence of degree / (optional) semester / (optional) course
    const [degreeExists, semesterExists, courseExists] = await Promise.all([
      Degree.exists({ _id: degreeId }),
      semesterId ? mongoose.model(SemesterModelName).exists({ _id: semesterId }) : Promise.resolve(true),
      courseId ? Course.exists({ _id: courseId }) : Promise.resolve(true),
    ]);
    if (!degreeExists) return sendErr(res, 400, "Degree not found.");
    if (!semesterExists) return sendErr(res, 400, "Semester not found.");
    if (!courseExists) return sendErr(res, 400, "Course not found.");

    // 3) Prevent duplicates
    const dup = await findDuplicateAdmission({ userId: userDoc._id, degreeId, academicYear });
    if (dup) return sendErr(res, 409, "An admission already exists for this user, degree, and academic year.");

    // 4) Create admission (copy some user fields for convenience)
    const doc = await StudentAdmission.create({
      user: userDoc._id,
      firstName: firstName || (userDoc.name || "").split(" ").slice(0, -1).join(" ") || userDoc.name || "",
      lastName: lastName || (userDoc.name || "").split(" ").slice(-1).join(" ") || "",
      email: normalizeEmail(userDoc.email),
      phone: phone || userDoc.phone || "",
      gender: gender || "prefer_not_to_say",
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationality: nationality || "",
      category: category || "",
      address: address || userDoc.address || {},
      permanentAddress: permanentAddress || userDoc.address || {},
      intendedEnrollment: {
        academicYear,
        degree: degreeId,
        semester: semesterId || undefined,
        course: courseId || undefined,
        preferredBatch: intendedEnrollment.preferredBatch || undefined,
      },
      priorEducation: Array.isArray(priorEducation) ? priorEducation : [],
      documents: Array.isArray(documents) ? documents : [],
      termsAccepted: Boolean(termsAccepted),
      applicationStatus: "submitted",
      submittedAt: new Date(),
      createdBy: createdBy && looksLikeId(createdBy) ? toObjectId(createdBy) : undefined,
    });

    const populated = await StudentAdmission.findById(doc._id).populate(POPULATE).lean();
    return sendCreated(res, populated);
  } catch (err) {
    console.error("createAdmission error:", err);
    return sendErr(res, 500, err.message || "Failed to create admission.");
  }
};

/** GET /admissions (list with filters, pagination, sort) */
exports.listAdmissions = async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const { page, limit, sort } = parsePaginationSort(req.query);

    const [rows, total] = await Promise.all([
      StudentAdmission.find(filters)
        .populate(POPULATE)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StudentAdmission.countDocuments(filters),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      sort,
    };

    return sendOk(res, rows, meta);
  } catch (err) {
    console.error("listAdmissions error:", err);
    return sendErr(res, 500, "Failed to list admissions.");
  }
};

/** GET /admissions/:id */
exports.getAdmissionById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const doc = await StudentAdmission.findById(id).populate(POPULATE).lean();
    if (!doc) return sendErr(res, 404, "Admission not found.");
    return sendOk(res, doc);
  } catch (err) {
    console.error("getAdmissionById error:", err);
    return sendErr(res, 500, "Failed to fetch admission.");
  }
};

/** PATCH /admissions/:id */
exports.updateAdmission = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");

    const payload = req.body || {};
    const update = { ...payload, updatedAt: new Date() };

    // If intendedEnrollment updates are present, validate and prevent duplicates
    if (payload.intendedEnrollment) {
      const ie = payload.intendedEnrollment;
      const degreeId = ie.degree && toObjectId(ie.degree);
      const semesterId = ie.semester && toObjectId(ie.semester);
      const courseId = ie.course && toObjectId(ie.course);
      const academicYear = typeof ie.academicYear !== "undefined" ? String(ie.academicYear) : undefined;

      if (degreeId && !(await Degree.exists({ _id: degreeId }))) {
        return sendErr(res, 400, "Degree not found.");
      }
      if (semesterId && !(await mongoose.model(SemesterModelName).exists({ _id: semesterId }))) {
        return sendErr(res, 400, "Semester not found.");
      }
      if (courseId && !(await Course.exists({ _id: courseId }))) {
        return sendErr(res, 400, "Course not found.");
      }

      // Read existing to run duplicate guard
      const existing = await StudentAdmission.findById(id).lean();
      if (!existing) return sendErr(res, 404, "Admission not found.");

      const finalDegree = degreeId || existing.intendedEnrollment?.degree;
      const finalYear = academicYear || existing.intendedEnrollment?.academicYear;

      if (finalDegree && finalYear) {
        const dup = await findDuplicateAdmission({
          userId: existing.user,
          degreeId: finalDegree,
          academicYear: finalYear,
          excludeId: existing._id,
        });
        if (dup) return sendErr(res, 409, "Another admission already exists for this user, degree, and academic year.");
      }
    }

    const doc = await StudentAdmission.findByIdAndUpdate(id, update, { new: true })
      .populate(POPULATE)
      .lean();

    if (!doc) return sendErr(res, 404, "Admission not found.");
    return sendOk(res, doc);
  } catch (err) {
    console.error("updateAdmission error:", err);
    return sendErr(res, 500, "Failed to update admission.");
  }
};

/** DELETE /admissions/:id  (hard delete) */
exports.deleteAdmission = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const out = await StudentAdmission.findByIdAndDelete(id).lean();
    if (!out) return sendErr(res, 404, "Admission not found.");
    return sendOk(res, { deleted: true, _id: id });
  } catch (err) {
    console.error("deleteAdmission error:", err);
    return sendErr(res, 500, "Failed to delete admission.");
  }
};

/** PATCH /admissions/:id/cancel  (soft delete + mark withdrawn) */
exports.cancelAdmission = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const update = {
      applicationStatus: "withdrawn",
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };
    const doc = await StudentAdmission.findByIdAndUpdate(id, update, { new: true })
      .populate(POPULATE)
      .lean();
    if (!doc) return sendErr(res, 404, "Admission not found.");
    return sendOk(res, doc);
  } catch (err) {
    console.error("cancelAdmission error:", err);
    return sendErr(res, 500, "Failed to cancel admission.");
  }
};

/* ----------------------------- counts & facets ------------------------------ */

/** GET /admissions/counts/summary */
exports.countsSummary = async (req, res) => {
  try {
    const common = buildFilters(req.query);
    const [total, active, deleted, byStatus] = await Promise.all([
      StudentAdmission.countDocuments(common),
      StudentAdmission.countDocuments({ ...common, applicationStatus: { $nin: ["withdrawn", "rejected"] }, isDeleted: { $ne: true } }),
      StudentAdmission.countDocuments({ ...common, isDeleted: true }),
      StudentAdmission.aggregate([
        { $match: common.$and ? { $and: common.$and } : {} },
        { $group: { _id: "$applicationStatus", count: { $sum: 1 } } },
      ]),
    ]);

    return sendOk(res, { total, active, deleted, byStatus });
  } catch (err) {
    console.error("countsSummary error:", err);
    return sendErr(res, 500, "Failed to compute counts.");
  }
};

/** GET /admissions/counts/by-degree */
exports.countsByDegree = async (req, res) => {
  try {
    const common = buildFilters(req.query);
    const rows = await StudentAdmission.aggregate([
      { $match: common.$and ? { $and: common.$and } : {} },
      { $group: { _id: "$intendedEnrollment.degree", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return sendOk(res, rows);
  } catch (err) {
    console.error("countsByDegree error:", err);
    return sendErr(res, 500, "Failed to compute counts by degree.");
  }
};

/** GET /admissions/counts/by-year */
exports.countsByAcademicYear = async (req, res) => {
  try {
    const common = buildFilters(req.query);
    const rows = await StudentAdmission.aggregate([
      { $match: common.$and ? { $and: common.$and } : {} },
      { $group: { _id: "$intendedEnrollment.academicYear", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return sendOk(res, rows);
  } catch (err) {
    console.error("countsByAcademicYear error:", err);
    return sendErr(res, 500, "Failed to compute counts by academic year.");
  }
};

/** GET /admissions/facets  (distinct lists to power filters) */
exports.getFacets = async (req, res) => {
  try {
    const [years, statuses, degrees, semesters, courses] = await Promise.all([
      StudentAdmission.distinct("intendedEnrollment.academicYear"),
      StudentAdmission.distinct("applicationStatus"),
      StudentAdmission.distinct("intendedEnrollment.degree"),
      StudentAdmission.distinct("intendedEnrollment.semester"),
      StudentAdmission.distinct("intendedEnrollment.course"),
    ]);

    return sendOk(res, { years, statuses, degrees, semesters, courses });
  } catch (err) {
    console.error("getFacets error:", err);
    return sendErr(res, 500, "Failed to fetch facets.");
  }
};

/* ----------------------------- transfer / bulk / duplicate ------------------------------ */

/** PATCH /admissions/:id/transfer  (move to another degree/semester/course/year) */
exports.transferAdmission = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const { degree, semester, course, academicYear } = req.body || {};

    const updates = {};
    if (degree) {
      const degreeId = toObjectId(degree);
      if (!degreeId || !(await Degree.exists({ _id: degreeId })))
        return sendErr(res, 400, "Target degree not found.");
      updates["intendedEnrollment.degree"] = degreeId;
    }
    if (semester) {
      const semId = toObjectId(semester);
      if (!semId || !(await mongoose.model(SemesterModelName).exists({ _id: semId })))
        return sendErr(res, 400, "Target semester not found.");
      updates["intendedEnrollment.semester"] = semId;
    }
    if (course) {
      const courseId = toObjectId(course);
      if (!courseId || !(await Course.exists({ _id: courseId })))
        return sendErr(res, 400, "Target course not found.");
      updates["intendedEnrollment.course"] = courseId;
    }
    if (typeof academicYear !== "undefined") {
      updates["intendedEnrollment.academicYear"] = String(academicYear);
    }

    session.startTransaction();

    const current = await StudentAdmission.findById(id).session(session);
    if (!current) {
      await session.abortTransaction();
      return sendErr(res, 404, "Admission not found.");
    }

    // Duplicate guard after applying intended updates
    const finalDegree = updates["intendedEnrollment.degree"] || current.intendedEnrollment?.degree;
    const finalYear = updates["intendedEnrollment.academicYear"] || current.intendedEnrollment?.academicYear;

    if (finalDegree && finalYear) {
      const dup = await findDuplicateAdmission({
        userId: current.user,
        degreeId: finalDegree,
        academicYear: finalYear,
        excludeId: current._id,
      });
      if (dup) {
        await session.abortTransaction();
        return sendErr(res, 409, "A target admission already exists for this user, degree, and academic year.");
      }
    }

    Object.assign(current, updates, { updatedAt: new Date() });
    await current.save({ session });

    const populated = await StudentAdmission.findById(current._id)
      .populate(POPULATE)
      .lean()
      .session(session);

    await session.commitTransaction();
    return sendOk(res, populated);
  } catch (err) {
    console.error("transferAdmission error:", err);
    try { await session.abortTransaction(); } catch {}
    return sendErr(res, 500, "Failed to transfer admission.");
  } finally {
    session.endSession();
  }
};

/** POST /admissions/bulk/status  { ids:[], status } */
exports.bulkSetStatus = async (req, res) => {
  try {
    const { ids = [], status } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return sendErr(res, 400, "ids[] is required.");
    if (!status) return sendErr(res, 400, "status is required.");

    const filter = { _id: { $in: ids.filter(looksLikeId).map(toObjectId) } };
    const upd = { applicationStatus: status, updatedAt: new Date() };
    if (status === "withdrawn") Object.assign(upd, { isDeleted: true, deletedAt: new Date() });

    const out = await StudentAdmission.updateMany(filter, { $set: upd });
    return sendOk(res, { matched: out.matchedCount ?? out.n, modified: out.modifiedCount ?? out.nModified });
  } catch (err) {
    console.error("bulkSetStatus error:", err);
    return sendErr(res, 500, "Failed to update statuses.");
  }
};

/** POST /admissions/bulk/delete  { ids:[] } */
exports.bulkDelete = async (req, res) => {
  try {
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return sendErr(res, 400, "ids[] is required.");
    const out = await StudentAdmission.deleteMany({ _id: { $in: ids.filter(looksLikeId).map(toObjectId) } });
    return sendOk(res, { deleted: out.deletedCount });
  } catch (err) {
    console.error("bulkDelete error:", err);
    return sendErr(res, 500, "Failed to delete admissions.");
  }
};

/** POST /admissions/bulk/cancel  { ids:[] } */
exports.bulkCancel = async (req, res) => {
  try {
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return sendErr(res, 400, "ids[] is required.");
    const out = await StudentAdmission.updateMany(
      { _id: { $in: ids.filter(looksLikeId).map(toObjectId) } },
      { $set: { applicationStatus: "withdrawn", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );
    return sendOk(res, { matched: out.matchedCount ?? out.n, modified: out.modifiedCount ?? out.nModified });
  } catch (err) {
    console.error("bulkCancel error:", err);
    return sendErr(res, 500, "Failed to cancel admissions.");
  }
};

/** POST /admissions/bulk/transfer  { ids:[], degree, semester?, course?, academicYear? } */
exports.bulkTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { ids = [], degree, semester, course, academicYear } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return sendErr(res, 400, "ids[] is required.");
    if (!degree) return sendErr(res, 400, "target degree is required.");

    const degreeId = toObjectId(degree);
    if (!degreeId || !(await Degree.exists({ _id: degreeId }))) return sendErr(res, 400, "Target degree not found.");

    let semId = null;
    if (semester) {
      semId = toObjectId(semester);
      if (!semId || !(await mongoose.model(SemesterModelName).exists({ _id: semId })))
        return sendErr(res, 400, "Target semester not found.");
    }

    let courseId = null;
    if (course) {
      courseId = toObjectId(course);
      if (!courseId || !(await Course.exists({ _id: courseId })))
        return sendErr(res, 400, "Target course not found.");
    }

    session.startTransaction();

    const idsObj = ids.filter(looksLikeId).map(toObjectId);
    const items = await StudentAdmission.find({ _id: { $in: idsObj } }).session(session);

    let skipped = 0;
    for (const it of items) {
      const finalYear = academicYear || it.intendedEnrollment?.academicYear;
      const dup = await findDuplicateAdmission({
        userId: it.user,
        degreeId,
        academicYear: finalYear,
        excludeId: it._id,
      });
      if (dup) {
        skipped++;
        continue; // skip duplicates silently; or collect and report
      }
      if (degreeId) it.intendedEnrollment.degree = degreeId;
      if (semId) it.intendedEnrollment.semester = semId;
      if (courseId) it.intendedEnrollment.course = courseId;
      if (academicYear) it.intendedEnrollment.academicYear = String(academicYear);
      it.updatedAt = new Date();
      await it.save({ session });
    }

    await session.commitTransaction();
    return sendOk(res, { moved: items.length - skipped, skipped });
  } catch (err) {
    console.error("bulkTransfer error:", err);
    try { await session.abortTransaction(); } catch {}
    return sendErr(res, 500, "Failed to bulk transfer.");
  } finally {
    session.endSession();
  }
};

/** POST /admissions/:id/duplicate  (replicate record to another degree/year/semester/course) */
exports.duplicateAdmission = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");

    const { degree, semester, course, academicYear, status = "submitted" } = req.body || {};
    const base = await StudentAdmission.findById(id).lean();
    if (!base) return sendErr(res, 404, "Base admission not found.");

    const degreeId = degree ? toObjectId(degree) : base.intendedEnrollment?.degree;
    const semesterId = semester ? toObjectId(semester) : base.intendedEnrollment?.semester;
    const courseId = course ? toObjectId(course) : base.intendedEnrollment?.course;
    const year = typeof academicYear !== "undefined" ? String(academicYear) : base.intendedEnrollment?.academicYear;

    if (!degreeId || !year) return sendErr(res, 400, "Target degree and academicYear are required to duplicate.");

    const dup = await findDuplicateAdmission({
      userId: base.user,
      degreeId,
      academicYear: year,
    });
    if (dup) return sendErr(res, 409, "A target admission already exists for this user, degree, and academic year.");

    const clone = await StudentAdmission.create({
      ...base,
      _id: undefined,
      isNew: true,
      applicationStatus: status,
      submittedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
      rejectionReason: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      intendedEnrollment: {
        academicYear: year,
        degree: degreeId,
        semester: semesterId || undefined,
        course: courseId || undefined,
        preferredBatch: base.intendedEnrollment?.preferredBatch,
      },
    });

    const populated = await StudentAdmission.findById(clone._id).populate(POPULATE).lean();
    return sendCreated(res, populated);
  } catch (err) {
    console.error("duplicateAdmission error:", err);
    return sendErr(res, 500, "Failed to duplicate admission.");
  }
};

/* ----------------------------- convenience actions ------------------------------ */

/** POST /admissions/:id/submit */
exports.submit = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const doc = await StudentAdmission.findById(id);
    if (!doc) return sendErr(res, 404, "Admission not found.");
    doc.submit();
    await doc.save();
    const populated = await StudentAdmission.findById(id).populate(POPULATE).lean();
    return sendOk(res, populated);
  } catch (err) {
    console.error("submit error:", err);
    return sendErr(res, 500, "Failed to submit admission.");
  }
};

/** POST /admissions/:id/approve */
exports.approve = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const doc = await StudentAdmission.findById(id);
    if (!doc) return sendErr(res, 404, "Admission not found.");
    doc.approve();
    await doc.save();
    const populated = await StudentAdmission.findById(id).populate(POPULATE).lean();
    return sendOk(res, populated);
  } catch (err) {
    console.error("approve error:", err);
    return sendErr(res, 500, "Failed to approve admission.");
  }
};

/** POST /admissions/:id/reject  { reason } */
exports.reject = async (req, res) => {
  try {
    const id = req.params.id;
    if (!looksLikeId(id)) return sendErr(res, 400, "Invalid id.");
    const { reason = "" } = req.body || {};
    const doc = await StudentAdmission.findById(id);
    if (!doc) return sendErr(res, 404, "Admission not found.");
    doc.reject(reason);
    await doc.save();
    const populated = await StudentAdmission.findById(id).populate(POPULATE).lean();
    return sendOk(res, populated);
  } catch (err) {
    console.error("reject error:", err);
    return sendErr(res, 500, "Failed to reject admission.");
  }
};

/** GET /admissions/export.csv (basic CSV export) */
exports.exportCsv = async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const rows = await StudentAdmission.find(filters)
      .select("firstName lastName email phone applicationStatus intendedEnrollment createdAt")
      .populate([
        { path: "intendedEnrollment.degree", select: "name code" },
        { path: "intendedEnrollment.semester", select: "semester_name semNumber", model: SemesterModelName },
        { path: "intendedEnrollment.course", select: "title code" },
      ])
      .sort({ createdAt: -1 })
      .lean();

    const head = ["First Name","Last Name","Email","Phone","Status","Academic Year","Degree","Semester","Course","Created At"];
    const csvRows = [
      head.join(","),
      ...rows.map(r => [
        JSON.stringify(r.firstName || ""),
        JSON.stringify(r.lastName || ""),
        JSON.stringify(r.email || ""),
        JSON.stringify(r.phone || ""),
        JSON.stringify(r.applicationStatus || ""),
        JSON.stringify(r.intendedEnrollment?.academicYear || ""),
        JSON.stringify(r.intendedEnrollment?.degree?.name || ""),
        JSON.stringify(r.intendedEnrollment?.semester?.semester_name || ""),
        JSON.stringify(r.intendedEnrollment?.course?.title || ""),
        JSON.stringify(r.createdAt ? new Date(r.createdAt).toISOString() : ""),
      ].join(",")),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="admissions.csv"`);
    return res.status(200).send(csvRows.join("\n"));
  } catch (err) {
    console.error("exportCsv error:", err);
    return sendErr(res, 500, "Failed to export CSV.");
  }
};
