// controllers/ExamController.js
const mongoose = require("mongoose");
const Exam = require("../models/ExamModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Whitelist for safe sorting
const SAFE_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "examName",
  "examCode",
  "examType",
  "passPercentage",
  "examDurationMinutes",
  "totalMarks",
  "difficultyLevel",
  "isPublished",
  "isPaid",
  "examDate",
  "startTime",
  "endTime",
  // relational text fields won't be used directly, but keep list explicit
]);

function parseListParams(q = {}) {
  const page = Math.max(parseInt(q.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(q.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;

  let sort = "-createdAt";
  if (q.sort) {
    const requested = String(q.sort)
      .split(",")
      .map((s) => s.trim());
    const safe = [];
    for (const token of requested) {
      const field = token.replace(/^-/, "");
      if (SAFE_SORT_FIELDS.has(field)) safe.push(token);
    }
    if (safe.length) sort = safe.join(" ");
  }
  const populate = String(q.populate || "true").toLowerCase() !== "false";
  return { page, limit, skip, sort, populate };
}

function buildFilters(q = {}) {
  const f = {};

  // exact matches
  const exactFields = [
    "examType",
    "difficultyLevel",
    "isPublished",
    "isPaid",
    "examCode",
    "subject",
  ];
  exactFields.forEach((k) => {
    if (q[k] !== undefined && q[k] !== "") {
      if (k === "isPublished" || k === "isPaid") {
        const v = String(q[k]).toLowerCase();
        f[k] = v === "true" ? true : v === "false" ? false : q[k];
      } else {
        f[k] = q[k];
      }
    }
  });

  // numeric ranges
  const numericRange = [
    ["passPercentage", "passMin", "passMax"],
    ["examDurationMinutes", "durMin", "durMax"],
    ["totalMarks", "marksMin", "marksMax"],
  ];
  for (const [field, minKey, maxKey] of numericRange) {
    const min = q[minKey] !== undefined ? Number(q[minKey]) : undefined;
    const max = q[maxKey] !== undefined ? Number(q[maxKey]) : undefined;
    if (!isNaN(min) || !isNaN(max)) {
      f[field] = {};
      if (!isNaN(min)) f[field].$gte = min;
      if (!isNaN(max)) f[field].$lte = max;
    }
  }

  // date/time ranges
  const datePairs = [
    ["examDate", "examDateFrom", "examDateTo"],
    ["startTime", "startFrom", "startTo"],
    ["endTime", "endFrom", "endTo"],
  ];
  for (const [field, fromKey, toKey] of datePairs) {
    const from = q[fromKey] ? new Date(q[fromKey]) : undefined;
    const to = q[toKey] ? new Date(q[toKey]) : undefined;
    if (from || to) {
      f[field] = {};
      if (from) f[field].$gte = from;
      if (to) f[field].$lte = to;
    }
  }

  // relations: degree, semester, course
  if (q.degree && isValidObjectId(q.degree)) f.degree = q.degree;
  if (q.semester && isValidObjectId(q.semester)) f.semester = q.semester;
  if (q.course && isValidObjectId(q.course)) f.course = q.course;

  // tags / allowedLanguages
  if (q.tags) {
    const tags = String(q.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length) f.tags = { $in: tags };
  }
  if (q.allowedLanguages) {
    const langs = String(q.allowedLanguages)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (langs.length) f.allowedLanguages = { $in: langs };
  }

  // fuzzy text
  const likeFields = ["examName", "subject", "instructions", "syllabusOutline"];
  likeFields.forEach((k) => {
    if (q[k]) f[k] = { $regex: String(q[k]).trim(), $options: "i" };
  });

  return f;
}

function validateDateTimeFields(payload) {
  const errors = [];
  const { startTime, endTime, examDurationMinutes } = payload || {};
  if (startTime && endTime) {
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      errors.push("Invalid startTime or endTime date.");
    } else if (s >= e) {
      errors.push("endTime must be after startTime.");
    }
    if (examDurationMinutes && !isNaN(Number(examDurationMinutes))) {
      const diffMin = Math.floor((e - s) / 60000);
      if (diffMin > 0 && Number(examDurationMinutes) > diffMin + 5) {
        errors.push(
          `examDurationMinutes (${examDurationMinutes}) exceeds window (${diffMin} min).`
        );
      }
    }
  }
  return errors;
}

// ---------- CRUD ----------

exports.createExam = async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.createdBy || !isValidObjectId(payload.createdBy)) {
      return res
        .status(400)
        .json({ error: "createdBy (valid user id) is required." });
    }
    if (!payload.degree || !isValidObjectId(payload.degree)) {
      return res.status(400).json({ error: "degree (valid id) is required." });
    }
    if (!payload.semester || !isValidObjectId(payload.semester)) {
      return res
        .status(400)
        .json({ error: "semester (valid id) is required." });
    }
    // NEW: course required
    if (!payload.course || !isValidObjectId(payload.course)) {
      return res.status(400).json({ error: "course (valid id) is required." });
    }

    const errors = validateDateTimeFields(payload);
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    if (payload.examCode) {
      const exists = await Exam.findOne({ examCode: payload.examCode });
      if (exists)
        return res
          .status(409)
          .json({ error: "An exam with this examCode already exists." });
    }

    const exam = await Exam.create(payload);
    return res.status(201).json(exam);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid exam id." });

    const { populate = "true" } = req.query;
    const q = Exam.findById(id);
    if (String(populate).toLowerCase() !== "false") {
      q.populate("degree")
        .populate("semester")
        .populate("course")
        .populate("createdBy", "name email role");
    }
    const exam = await q.exec();
    if (!exam) return res.status(404).json({ error: "Exam not found." });
    return res.json(exam);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.updateExamById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid exam id." });

    const payload = req.body || {};

    // If course is provided, validate it
    if (payload.course && !isValidObjectId(payload.course)) {
      return res.status(400).json({ error: "course must be a valid id." });
    }
    if (payload.degree && !isValidObjectId(payload.degree)) {
      return res.status(400).json({ error: "degree must be a valid id." });
    }
    if (payload.semester && !isValidObjectId(payload.semester)) {
      return res.status(400).json({ error: "semester must be a valid id." });
    }

    const errors = validateDateTimeFields(payload);
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    if (payload.examCode) {
      const dup = await Exam.findOne({
        examCode: payload.examCode,
        _id: { $ne: id },
      });
      if (dup)
        return res
          .status(409)
          .json({ error: "Another exam with this examCode already exists." });
    }

    const exam = await Exam.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("degree")
      .populate("semester")
      .populate("course")
      .populate("createdBy", "name email role");

    if (!exam) return res.status(404).json({ error: "Exam not found." });
    return res.json(exam);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.deleteExamById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid exam id." });

    const deleted = await Exam.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Exam not found." });
    return res.json({ success: true, message: "Exam deleted." });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

// ---------- Listing / Search ----------
exports.listExams = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const sortBy = (req.query.sortBy || "createdAt").toString();
    const sortDirRaw = (req.query.sortDir || req.query.sortOrder || "desc")
      .toString()
      .toLowerCase();
    const sort = { [sortBy]: sortDirRaw === "asc" ? 1 : -1 };

    // Filters
    const q = {};
    if (req.query.degree) q.degree = req.query.degree;
    if (req.query.semester || req.query.semester)
      q.semester = req.query.semester || req.query.semester;
    if (req.query.course) q.course = req.query.course;

    if (req.query.search) {
      const rx = new RegExp(req.query.search.trim(), "i");
      q.$or = [
        { examName: rx },
        { examCode: rx },
        { subject: rx },
        { tags: rx },
        { difficultyLevel: rx },
        { examType: rx },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Exam.find(q)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("degree", "name title")
        .populate("semester", "title semister_name semNumber")
        .populate("course", "title name code")
        .lean(),
      Exam.countDocuments(q),
    ]);

    res.json({
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error("listExams error:", err);
    res.status(500).json({ message: "Failed to list exams." });
  }
};

// ---------- Counts ----------

exports.countAll = async (_req, res) => {
  try {
    const total = await Exam.countDocuments({});
    return res.json({ total });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.countBy = async (req, res) => {
  try {
    const { field, value } = req.query;
    if (!field) return res.status(400).json({ error: "field is required." });

    const match = {};
    if (value !== undefined) {
      if (value === "true" || value === "false") {
        match[field] = value === "true";
      } else match[field] = value;
    } else {
      const result = await Exam.aggregate([
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $project: { _id: 0, [field]: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]);
      return res.json(result);
    }

    const count = await Exam.countDocuments(match);
    return res.json({ field, value, count });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

// ---------- Free-form search ----------

exports.searchExams = async (req, res) => {
  try {
    const { q, fields } = req.query;
    if (!q) return res.status(400).json({ error: "q (query) is required." });

    const { page, limit, skip, sort, populate } = parseListParams(req.query);

    const fieldList = (
      fields
        ? String(fields)
            .split(",")
            .map((s) => s.trim())
        : [
            "examName",
            "examCode",
            "subject",
            "instructions",
            "syllabusOutline",
            "tags",
            "allowedLanguages",
            "examType",
            "difficultyLevel",
          ]
    ).filter(Boolean);

    const regex = { $regex: String(q).trim(), $options: "i" };
    const or = fieldList.map((f) => ({ [f]: regex }));

    let query = Exam.find({ $or: or });

    if (populate) {
      query = query
        .populate("degree")
        .populate("semester")
        .populate("course")
        .populate("createdBy", "name email role");
    }

    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit).exec(),
      Exam.countDocuments({ $or: or }),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
      searchedFields: fieldList,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

// ---------- Degree + Semester + Course helpers ----------

// NEW: require all three for this helper
exports.getByDegreeSemesterCourse = async (req, res) => {
  try {
    const { degreeId, semesterId, courseId } = req.params;
    if (
      !isValidObjectId(degreeId) ||
      !isValidObjectId(semesterId) ||
      !isValidObjectId(courseId)
    ) {
      return res.status(400).json({
        error: "Invalid degreeId, semesterId, or courseId.",
      });
    }

    const exams = await Exam.find({
      degree: degreeId,
      semester: semesterId,
      course: courseId,
    })
      .populate("degree")
      .populate("semester")
      .populate("course")
      .populate("createdBy", "name email role")
      .sort("-createdAt");

    return res.json(exams);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

// Handy for the UI “after selecting degree/semester/course, show available exams to do”
exports.getPublishedByDegreeSemesterCourse = async (req, res) => {
  try {
    const { degreeId, semesterId, courseId } = req.params;
    if (
      !isValidObjectId(degreeId) ||
      !isValidObjectId(semesterId) ||
      !isValidObjectId(courseId)
    ) {
      return res.status(400).json({
        error: "Invalid degreeId, semesterId, or courseId.",
      });
    }

    const now = new Date();
    const exams = await Exam.find({
      degree: degreeId,
      semester: semesterId,
      course: courseId,
      isPublished: true,
      $or: [
        { examDate: { $exists: false } }, // open exams without fixed date
        { examDate: { $gte: now } }, // upcoming today/future
        { startTime: { $lte: now }, endTime: { $gte: now } }, // active window
      ],
    })
      .populate("degree")
      .populate("semester")
      .populate("course")
      .populate("createdBy", "name email role")
      .sort({ examDate: 1, startTime: 1, createdAt: -1 });

    return res.json(exams);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

// ---------- Status (with optional DSC filters via query) ----------

exports.upcomingExams = async (req, res) => {
  try {
    const now = new Date();
    const { page, limit, skip, sort, populate } = parseListParams(req.query);

    const base = {
      $or: [{ examDate: { $gte: now } }, { startTime: { $gte: now } }],
    };

    // Optional degree/semester/course filters
    if (req.query.degree && isValidObjectId(req.query.degree))
      base.degree = req.query.degree;
    if (req.query.semester && isValidObjectId(req.query.semester))
      base.semester = req.query.semester;
    if (req.query.course && isValidObjectId(req.query.course))
      base.course = req.query.course;

    let q = Exam.find(base);
    if (populate)
      q = q
        .populate("degree")
        .populate("semester")
        .populate("course")
        .populate("createdBy", "name email role");

    const [items, total] = await Promise.all([
      q.sort(sort).skip(skip).limit(limit).exec(),
      Exam.countDocuments(base),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.pastExams = async (req, res) => {
  try {
    const now = new Date();
    const { page, limit, skip, sort, populate } = parseListParams(req.query);

    const base = {
      $or: [{ examDate: { $lt: now } }, { endTime: { $lt: now } }],
    };

    // Optional degree/semester/course filters
    if (req.query.degree && isValidObjectId(req.query.degree))
      base.degree = req.query.degree;
    if (req.query.semester && isValidObjectId(req.query.semester))
      base.semester = req.query.semester;
    if (req.query.course && isValidObjectId(req.query.course))
      base.course = req.query.course;

    let q = Exam.find(base);
    if (populate)
      q = q
        .populate("degree")
        .populate("semester")
        .populate("course")
        .populate("createdBy", "name email role");

    const [items, total] = await Promise.all([
      q.sort(sort).skip(skip).limit(limit).exec(),
      Exam.countDocuments(base),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

// ---------- Publish / Attempts / Stats ----------

exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid exam id." });

    const exam = await Exam.findById(id);
    if (!exam) return res.status(404).json({ error: "Exam not found." });

    exam.isPublished = !exam.isPublished;
    await exam.save();
    return res.json({ id: exam._id, isPublished: exam.isPublished });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.incrementAttemptCount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid exam id." });

    const exam = await Exam.findByIdAndUpdate(
      id,
      { $inc: { attemptCount: 1 } },
      { new: true }
    );
    if (!exam) return res.status(404).json({ error: "Exam not found." });
    return res.json({ id: exam._id, attemptCount: exam.attemptCount });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

exports.stats = async (_req, res) => {
  try {
    const [byType, byDifficulty, paidVsFree, publishedVsDraft] =
      await Promise.all([
        Exam.aggregate([{ $group: { _id: "$examType", count: { $sum: 1 } } }]),
        Exam.aggregate([
          { $group: { _id: "$difficultyLevel", count: { $sum: 1 } } },
        ]),
        Exam.aggregate([{ $group: { _id: "$isPaid", count: { $sum: 1 } } }]),
        Exam.aggregate([
          { $group: { _id: "$isPublished", count: { $sum: 1 } } },
        ]),
      ]);

    return res.json({
      byType: byType.map((x) => ({ examType: x._id, count: x.count })),
      byDifficulty: byDifficulty.map((x) => ({
        difficultyLevel: x._id,
        count: x.count,
      })),
      paidVsFree: paidVsFree.map((x) => ({ isPaid: !!x._id, count: x.count })),
      publishedVsDraft: publishedVsDraft.map((x) => ({
        isPublished: !!x._id,
        count: x.count,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
