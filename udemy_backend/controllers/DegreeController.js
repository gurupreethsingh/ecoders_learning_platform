// controllers/DegreeController.js
const mongoose = require("mongoose");
const Degree = require("../models/DegreeModel");

const { Types } = mongoose;

// -------------- helpers --------------

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

const normalizeDegreeInput = (payload = {}) => {
  const out = {};

  if (payload.name !== undefined) out.name = String(payload.name).trim();

  if (payload.code !== undefined) {
    out.code = String(payload.code).trim().toUpperCase();
  }

  // If slug provided explicitly, normalize; otherwise model pre-validate will derive from name
  if (payload.slug !== undefined) {
    out.slug = String(payload.slug)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }

  if (payload.description !== undefined)
    out.description = String(payload.description);

  if (payload.level !== undefined) out.level = String(payload.level);

  if (payload.durationYears !== undefined) {
    const n = Number(payload.durationYears);
    if (!Number.isNaN(n)) out.durationYears = n;
  }

  if (payload.totalSemesters !== undefined) {
    const n = Number(payload.totalSemesters);
    if (Number.isInteger(n)) out.totalSemesters = n;
  }

  if (payload.department !== undefined)
    out.department = String(payload.department).trim();

  if (payload.awardingBody !== undefined)
    out.awardingBody = String(payload.awardingBody).trim();

  if (payload.accreditation !== undefined) {
    const acc = toArray(payload.accreditation);
    out.accreditation = acc;
  }

  if (payload.isActive !== undefined) out.isActive = boolFrom(payload.isActive);

  if (payload.coordinators !== undefined) {
    const ids = toArray(payload.coordinators).map((id) => {
      try {
        return new Types.ObjectId(id);
      } catch {
        return null;
      }
    });
    out.coordinators = ids.filter(Boolean);
  }

  // assets
  if (payload.assets || payload.logoUrl || payload.brochureUrl) {
    out.assets = {
      ...(payload.assets || {}),
    };
    if (payload.logoUrl !== undefined) out.assets.logoUrl = payload.logoUrl;
    if (payload.brochureUrl !== undefined)
      out.assets.brochureUrl = payload.brochureUrl;
  }

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
    level,
    department,
    active,
    coordinator,
    minSemesters,
    maxSemesters,
    minYears,
    maxYears,
    accreditation, // csv
    from, // createdAt >= from
    to, // createdAt <= to
  } = q || {};

  const filter = {};

  if (search) {
    const needle = new RegExp(escapeRegExp(String(search).trim()), "i");
    filter.$or = [
      { name: needle },
      { code: needle },
      { slug: needle },
      { department: needle },
      { awardingBody: needle },
      { description: needle },
      { accreditation: needle },
    ];
  }

  if (level) {
    const arr = toArray(level);
    if (arr.length) filter.level = { $in: arr };
  }

  if (department) {
    const arr = toArray(department);
    if (arr.length) filter.department = { $in: arr };
  }

  if (active !== undefined) {
    filter.isActive = boolFrom(active);
  }

  if (coordinator) {
    const ids = toArray(coordinator)
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (ids.length) filter.coordinators = { $in: ids };
  }

  const sem = {};
  const minS = Number(minSemesters);
  const maxS = Number(maxSemesters);
  if (!Number.isNaN(minS)) sem.$gte = minS;
  if (!Number.isNaN(maxS)) sem.$lte = maxS;
  if (Object.keys(sem).length) filter.totalSemesters = sem;

  const yrs = {};
  const minY = Number(minYears);
  const maxY = Number(maxYears);
  if (!Number.isNaN(minY)) yrs.$gte = minY;
  if (!Number.isNaN(maxY)) yrs.$lte = maxY;
  if (Object.keys(yrs).length) filter.durationYears = yrs;

  if (accreditation) {
    const set = toArray(accreditation);
    if (set.length) filter.accreditation = { $in: set };
  }

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
  name: { name: 1 },
  code: { code: 1 },
  totalSemesters: { totalSemesters: 1 },
  durationYears: { durationYears: 1 },
  department: { department: 1 },
};

const applySort = (sortBy = "createdAt", dir = "desc") => {
  const base = sortMap[sortBy] || sortMap.createdAt;
  const mult = dir === "asc" ? 1 : -1;
  const result = {};
  for (const k of Object.keys(base)) result[k] = base[k] * mult;
  return result;
};

// -------------- controllers --------------

exports.createDegree = async (req, res) => {
  try {
    const data = normalizeDegreeInput(req.body);
    const doc = await Degree.create(data);
    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) {
      // duplicate key error for unique fields (code/slug)
      const fields = Object.keys(err.keyPattern || {});
      return res
        .status(409)
        .json({ message: `Duplicate value for: ${fields.join(", ")}` });
    }
    console.error("createDegree error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listDegrees = async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const sortBy = String(req.query.sortBy || "createdAt");
    const sortDir = String(req.query.sortDir || "desc");
    const sort = applySort(sortBy, sortDir);

    const [rows, total] = await Promise.all([
      Degree.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Degree.countDocuments(filter),
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
    console.error("listDegrees error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /degrees/:id
 */
exports.getDegreeById = async (req, res) => {
  try {
    const doc = await Degree.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Degree not found" });
    res.json(doc);
  } catch (err) {
    console.error("getDegreeById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /degrees/slug/:slug
 */
exports.getDegreeBySlug = async (req, res) => {
  try {
    const doc = await Degree.findOne({ slug: req.params.slug }).lean();
    if (!doc) return res.status(404).json({ message: "Degree not found" });
    res.json(doc);
  } catch (err) {
    console.error("getDegreeBySlug error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /degrees/:id
 * Body: same as create; partial updates supported
 */
exports.updateDegree = async (req, res) => {
  try {
    const data = normalizeDegreeInput(req.body);
    const updated = await Degree.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Degree not found" });
    res.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      const fields = Object.keys(err.keyPattern || {});
      return res
        .status(409)
        .json({ message: `Duplicate value for: ${fields.join(", ")}` });
    }
    console.error("updateDegree error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /degrees/:id
 * (Hard delete. If you prefer soft delete, flip to isActive=false instead.)
 */
exports.deleteDegree = async (req, res) => {
  try {
    const deleted = await Degree.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Degree not found" });
    res.json({ message: "Degree deleted", id: deleted._id });
  } catch (err) {
    console.error("deleteDegree error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /degrees/:id/toggle-active
 * Body: { isActive: true|false } (if omitted, toggles current value)
 */
exports.toggleActive = async (req, res) => {
  try {
    const doc = await Degree.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Degree not found" });

    if (typeof req.body.isActive === "boolean") {
      doc.isActive = req.body.isActive;
    } else if (typeof req.body.isActive === "string") {
      doc.isActive = boolFrom(req.body.isActive);
    } else {
      doc.isActive = !doc.isActive; // toggle
    }
    await doc.save();
    res.json({ id: doc._id, isActive: doc.isActive });
  } catch (err) {
    console.error("toggleActive error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------- counts & analytics --------------

/**
 * GET /degrees/counts/summary
 * -> { total, active, inactive }
 */
exports.countsSummary = async (req, res) => {
  try {
    const [total, active] = await Promise.all([
      Degree.countDocuments(),
      Degree.countDocuments({ isActive: true }),
    ]);
    res.json({ total, active, inactive: Math.max(0, total - active) });
  } catch (err) {
    console.error("countsSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /degrees/counts/by-level
 * -> [{ _id: "undergraduate", count: 12 }, ...]
 */
exports.countsByLevel = async (_req, res) => {
  try {
    const rows = await Degree.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByLevel error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /degrees/counts/by-department
 * Optional query: ?limit=50 (defaults unlimited)
 */
exports.countsByDepartment = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: { $ifNull: ["$department", "Unspecified"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ];

    let rows = await Degree.aggregate(pipeline);
    const limit = parseInt(req.query.limit || "0", 10);
    if (limit > 0) rows = rows.slice(0, limit);

    res.json(rows);
  } catch (err) {
    console.error("countsByDepartment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /degrees/facets
 * -> distinct values to build filters on frontend
 * returns: { departments: [...], accreditations: [...], coordinators: [ids], levels: [...] }
 */
exports.getFacets = async (_req, res) => {
  try {
    const [departments, acc, coordinators] = await Promise.all([
      Degree.distinct("department"),
      Degree.distinct("accreditation"),
      Degree.distinct("coordinators"),
    ]);

    res.json({
      departments: departments.filter(Boolean).sort(),
      accreditations: acc.filter(Boolean).sort(),
      coordinators: coordinators.filter(Boolean),
      // mirror enum used in model for convenience
      levels: [
        "certificate",
        "diploma",
        "undergraduate",
        "postgraduate",
        "doctorate",
      ],
    });
  } catch (err) {
    console.error("getFacets error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
