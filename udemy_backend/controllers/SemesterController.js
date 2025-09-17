// controllers/SemesterController.js
const mongoose = require("mongoose");
const Semester = require("../models/SemesterModel");

const { Types } = mongoose;

// ----------------- helpers -----------------

const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const boolFrom = (v) =>
  typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);

const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string")
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  return v ? [v] : [];
};

const toObjectId = (v) => {
  try {
    return new Types.ObjectId(v);
  } catch {
    return null;
  }
};

const normalizeSemesterInput = (payload = {}) => {
  const out = {};

  if (payload.degree !== undefined) {
    const id = toObjectId(payload.degree);
    if (id) out.degree = id;
  }

  if (payload.semNumber !== undefined) {
    const n = Number(payload.semNumber);
    if (Number.isInteger(n)) out.semNumber = n;
  }

  if (payload.semester_name !== undefined)
    out.semester_name = String(payload.semester_name).trim();

  if (payload.semester_code !== undefined)
    out.semester_code = String(payload.semester_code).trim();

  if (payload.slug !== undefined) {
    out.slug = String(payload.slug)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }

  if (payload.description !== undefined)
    out.description = String(payload.description);

  if (payload.academicYear !== undefined)
    out.academicYear = String(payload.academicYear).trim();

  if (payload.startDate !== undefined) {
    const d = payload.startDate ? new Date(payload.startDate) : null;
    if (d && !isNaN(d)) out.startDate = d;
    else if (payload.startDate === null) out.startDate = null;
  }

  if (payload.endDate !== undefined) {
    const d = payload.endDate ? new Date(payload.endDate) : null;
    if (d && !isNaN(d)) out.endDate = d;
    else if (payload.endDate === null) out.endDate = null;
  }

  if (payload.totalCredits !== undefined) {
    const n = Number(payload.totalCredits);
    if (!Number.isNaN(n)) out.totalCredits = n;
  }

  if (payload.totalCoursesPlanned !== undefined) {
    const n = Number(payload.totalCoursesPlanned);
    if (Number.isInteger(n)) out.totalCoursesPlanned = n;
  }

  if (payload.isActive !== undefined) out.isActive = boolFrom(payload.isActive);

  if (payload.metadata !== undefined) {
    if (typeof payload.metadata === "string") {
      try {
        out.metadata = JSON.parse(payload.metadata);
      } catch {
        out.metadata = { raw: payload.metadata };
      }
    } else {
      out.metadata = payload.metadata;
    }
  }

  return out;
};

const buildFilter = (q) => {
  const {
    search,
    degree, // single id or csv of ids
    isActive, // true/false
    minSem,
    maxSem, // semNumber range
    academicYear, // string or csv
    startFrom,
    startTo, // startDate range
    endFrom,
    endTo, // endDate range
    minCredits,
    maxCredits,
    minCourses,
    maxCourses,
    from,
    to, // createdAt range
  } = q || {};

  const filter = {};

  if (degree) {
    const ids = toArray(degree).map(toObjectId).filter(Boolean);
    if (ids.length) filter.degree = { $in: ids };
  }

  if (search) {
    const needle = new RegExp(escapeRegExp(String(search).trim()), "i");
    filter.$or = [
      { semester_name: needle },
      { semester_code: needle },
      { slug: needle },
      { description: needle },
      { academicYear: needle },
    ];
  }

  if (isActive !== undefined) {
    filter.isActive = boolFrom(isActive);
  }

  const semRange = {};
  const sMin = Number(minSem);
  const sMax = Number(maxSem);
  if (!Number.isNaN(sMin)) semRange.$gte = sMin;
  if (!Number.isNaN(sMax)) semRange.$lte = sMax;
  if (Object.keys(semRange).length) filter.semNumber = semRange;

  if (academicYear) {
    const arr = toArray(academicYear);
    if (arr.length) filter.academicYear = { $in: arr };
  }

  // startDate range
  if (startFrom || startTo) {
    filter.startDate = {};
    if (startFrom) filter.startDate.$gte = new Date(startFrom);
    if (startTo) filter.startDate.$lte = new Date(startTo);
  }

  // endDate range
  if (endFrom || endTo) {
    filter.endDate = {};
    if (endFrom) filter.endDate.$gte = new Date(endFrom);
    if (endTo) filter.endDate.$lte = new Date(endTo);
  }

  const credits = {};
  const cMin = Number(minCredits);
  const cMax = Number(maxCredits);
  if (!Number.isNaN(cMin)) credits.$gte = cMin;
  if (!Number.isNaN(cMax)) credits.$lte = cMax;
  if (Object.keys(credits).length) filter.totalCredits = credits;

  const courses = {};
  const crMin = Number(minCourses);
  const crMax = Number(maxCourses);
  if (!Number.isNaN(crMin)) courses.$gte = crMin;
  if (!Number.isNaN(crMax)) courses.$lte = crMax;
  if (Object.keys(courses).length) filter.totalCoursesPlanned = courses;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  return filter;
};

const sortMap = {
  createdAt: { createdAt: -1 },
  updatedAt: { updatedAt: -1 },
  semNumber: { semNumber: 1 },
  semester_name: { semester_name: 1 },
  academicYear: { academicYear: 1 },
  startDate: { startDate: 1 },
  endDate: { endDate: 1 },
  totalCredits: { totalCredits: 1 },
  totalCoursesPlanned: { totalCoursesPlanned: 1 },
};

const applySort = (sortBy = "createdAt", dir = "desc") => {
  const base = sortMap[sortBy] || sortMap.createdAt;
  const mult = dir === "asc" ? 1 : -1;
  const result = {};
  for (const k of Object.keys(base)) result[k] = base[k] * mult;
  return result;
};

// ----------------- controllers -----------------

// Create one semester
exports.createSemester = async (req, res) => {
  try {
    const data = normalizeSemesterInput(req.body);
    // degree and semNumber are required; let Mongoose enforce
    const doc = await Semester.create(data);
    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) {
      // Unique conflicts: (degree, semNumber) or (degree, slug)
      return res.status(409).json({
        message:
          "Duplicate semester for the same degree (semNumber or slug already exists).",
        keyValue: err.keyValue,
      });
    }
    console.error("createSemester error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// List with filtering/pagination/sorting
// GET /semesters?degree=...&search=...&page=1&limit=20&sortBy=semNumber&sortDir=asc ...
exports.listSemesters = async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(
      1,
      Math.min(200, parseInt(req.query.limit || "20", 10))
    );
    const skip = (page - 1) * limit;

    const sortBy = String(req.query.sortBy || "createdAt");
    const sortDir = String(req.query.sortDir || "desc");
    const sort = applySort(sortBy, sortDir);

    const [rows, total] = await Promise.all([
      Semester.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Semester.countDocuments(filter),
    ]);

    res.json({
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        sortBy,
        sortDir,
        filter,
      },
    });
  } catch (err) {
    console.error("listSemesters error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get by id
exports.getSemesterById = async (req, res) => {
  try {
    const doc = await Semester.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Semester not found" });
    res.json(doc);
  } catch (err) {
    console.error("getSemesterById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get by slug (slug is unique per degree)
// GET /semesters/by-slug/:degreeId/:slug
exports.getSemesterBySlug = async (req, res) => {
  try {
    const degreeId = toObjectId(req.params.degreeId);
    if (!degreeId)
      return res.status(400).json({ message: "Invalid degree id" });

    const doc = await Semester.findOne({
      degree: degreeId,
      slug: req.params.slug,
    }).lean();

    if (!doc) return res.status(404).json({ message: "Semester not found" });
    res.json(doc);
  } catch (err) {
    console.error("getSemesterBySlug error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update (partial)
exports.updateSemester = async (req, res) => {
  try {
    const data = normalizeSemesterInput(req.body);
    const updated = await Semester.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ message: "Semester not found" });
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message:
          "Duplicate semester for the same degree (semNumber or slug already exists).",
        keyValue: err.keyValue,
      });
    }
    console.error("updateSemester error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete (hard delete)
exports.deleteSemester = async (req, res) => {
  try {
    const deleted = await Semester.findByIdAndDelete(req.params.id).lean();
    if (!deleted)
      return res.status(404).json({ message: "Semester not found" });
    res.json({ message: "Semester deleted", id: deleted._id });
  } catch (err) {
    console.error("deleteSemester error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle active
exports.toggleActive = async (req, res) => {
  try {
    const doc = await Semester.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Semester not found" });

    if (typeof req.body.isActive === "boolean") {
      doc.isActive = req.body.isActive;
    } else if (typeof req.body.isActive === "string") {
      doc.isActive = boolFrom(req.body.isActive);
    } else {
      doc.isActive = !doc.isActive;
    }
    await doc.save();
    res.json({ id: doc._id, isActive: doc.isActive });
  } catch (err) {
    console.error("toggleActive error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------- counts & facets -----------------

// Summary counts
exports.countsSummary = async (_req, res) => {
  try {
    const [total, active] = await Promise.all([
      Semester.countDocuments(),
      Semester.countDocuments({ isActive: true }),
    ]);
    res.json({ total, active, inactive: Math.max(0, total - active) });
  } catch (err) {
    console.error("countsSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Count by degree
exports.countsByDegree = async (_req, res) => {
  try {
    const rows = await Semester.aggregate([
      { $group: { _id: "$degree", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByDegree error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Count by academic year
exports.countsByAcademicYear = async (_req, res) => {
  try {
    const rows = await Semester.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$academicYear", "Unspecified"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByAcademicYear error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Distinct facets for UI filters
exports.getFacets = async (_req, res) => {
  try {
    const [degrees, years] = await Promise.all([
      Semester.distinct("degree"),
      Semester.distinct("academicYear"),
    ]);

    res.json({
      degrees: degrees.filter(Boolean),
      academicYears: years.filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("getFacets error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------- bulk / advanced ops -----------------

// Bulk activate/deactivate a set of semesters
// POST body: { ids: [..], isActive: true/false }
exports.bulkToggleActive = async (req, res) => {
  try {
    const ids = toArray(req.body.ids).map(toObjectId).filter(Boolean);
    if (!ids.length)
      return res.status(400).json({ message: "No valid ids provided" });

    const isActive =
      typeof req.body.isActive === "boolean"
        ? req.body.isActive
        : boolFrom(req.body.isActive);

    const r = await Semester.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive } }
    );
    res.json({
      matched: r.matchedCount ?? r.n,
      modified: r.modifiedCount ?? r.nModified,
    });
  } catch (err) {
    console.error("bulkToggleActive error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Move a semester to another degree
// PATCH /semesters/:id/move-degree  body: { degreeId }
exports.moveToDegree = async (req, res) => {
  try {
    const degreeId = toObjectId(req.body.degreeId);
    if (!degreeId)
      return res.status(400).json({ message: "Invalid degree id" });

    const updated = await Semester.findByIdAndUpdate(
      req.params.id,
      { $set: { degree: degreeId } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ message: "Semester not found" });
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message:
          "Cannot move: target degree already has this semNumber or slug.",
      });
    }
    console.error("moveToDegree error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Change the semNumber of a semester (renumber)
// PATCH /semesters/:id/renumber  body: { semNumber }
exports.renumber = async (req, res) => {
  try {
    const n = Number(req.body.semNumber);
    if (!Number.isInteger(n) || n < 1)
      return res.status(400).json({ message: "Invalid semNumber" });

    const updated = await Semester.findByIdAndUpdate(
      req.params.id,
      { $set: { semNumber: n } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ message: "Semester not found" });
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "Duplicate semNumber within the same degree.",
      });
    }
    console.error("renumber error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reorder multiple semesters within a degree by assigning explicit semNumbers
// PATCH /semesters/reorder  body: { degreeId, order: [{ id, semNumber }, ...] }
exports.reorderWithinDegree = async (req, res) => {
  const degreeId = toObjectId(req.body.degreeId);
  const order = Array.isArray(req.body.order) ? req.body.order : [];

  if (!degreeId) {
    return res.status(400).json({ message: "Invalid degree id" });
  }
  if (!order.length) {
    return res.status(400).json({ message: "No reorder data provided" });
  }

  try {
    // Basic validation: unique semNumbers in payload
    const nums = new Set();
    for (const item of order) {
      const n = Number(item.semNumber);
      if (!Number.isInteger(n) || n < 1)
        return res.status(400).json({ message: "Invalid semNumber in order" });
      if (nums.has(n))
        return res
          .status(400)
          .json({ message: "Duplicate semNumber in order payload" });
      nums.add(n);
    }

    // Bulk write updates
    const ops = order.map((item) => ({
      updateOne: {
        filter: { _id: toObjectId(item.id), degree: degreeId },
        update: { $set: { semNumber: Number(item.semNumber) } },
      },
    }));

    const result = await Semester.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, result });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message:
          "Reorder conflict: some semNumbers already exist within this degree.",
      });
    }
    console.error("reorderWithinDegree error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Clone a semester (or template body) to multiple degrees
// POST /semesters/bulk/clone-to-degrees
// body: { degrees: [degreeId1, degreeId2, ...], template: { ...semesterFieldsExceptDegree } }
exports.cloneToDegrees = async (req, res) => {
  try {
    const degreeIds = toArray(req.body.degrees).map(toObjectId).filter(Boolean);
    if (!degreeIds.length) {
      return res.status(400).json({ message: "No valid degree ids provided" });
    }

    const template = normalizeSemesterInput(req.body.template || {});
    // Remove any incoming degree; we will apply each degreeId
    delete template.degree;

    if (template.semNumber == null) {
      return res
        .status(400)
        .json({ message: "template.semNumber is required" });
    }

    const created = [];
    const skipped = [];

    for (const did of degreeIds) {
      try {
        const doc = await Semester.create({ ...template, degree: did });
        created.push({ degree: did, id: doc._id });
      } catch (e) {
        // likely duplicate (degree, semNumber) or (degree, slug)
        skipped.push({
          degree: did,
          error: e?.code === 11000 ? "duplicate" : "error",
        });
      }
    }

    res.json({ created, skipped });
  } catch (err) {
    console.error("cloneToDegrees error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listByDegree = async (req, res) => {
  try {
    const { degreeId } = req.params;
    const list = await Semester.find({ degree: degreeId }).sort({
      semNumber: 1,
    });
    res.json({ success: true, data: list });
  } catch (e) {
    res
      .status(500)
      .json({
        success: false,
        message: e.message || "Failed to list semesters",
      });
  }
};
