// controllers/QuizController.js
const mongoose = require("mongoose");
const Quiz = require("../models/QuizModel");
const Course = require("../models/CourseModel"); // optional validation when course is provided

/* ------------------------ small utils ------------------------ */
const toInt = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
};
const boolLike = (v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "string")
    return ["true", "1", "yes"].includes(v.toLowerCase());
  return undefined;
};
const cleanSort = (sortBy = "createdAt", sortOrder = "desc") => {
  const allowed = new Set([
    "createdAt",
    "updatedAt",
    "quizName",
    "quizCode",
    "quizDurationMinutes",
    "passPercentage",
    "totalMarks",
    "startTime",
    "endTime",
    "difficulty",
    "isPublished",
    "isPaid",
  ]);
  const field = allowed.has(sortBy) ? sortBy : "createdAt";
  const order = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
  return { [field]: order };
};
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ------------------------ create ------------------------ */
exports.createQuiz = async (req, res) => {
  try {
    const payload = { ...req.body };

    // course is OPTIONAL now. If provided, validate it.
    if (payload.course != null && payload.course !== "") {
      if (!isValidObjectId(payload.course)) {
        return res.status(400).json({ error: "Invalid course id." });
      }
      const course = await Course.findById(payload.course).select("_id");
      if (!course) return res.status(404).json({ error: "Course not found." });
    } else {
      // allow standalone quizzes
      delete payload.course;
    }

    // Enforce unique quizCode at app level too (schema also enforces)
    if (payload.quizCode) {
      const existing = await Quiz.findOne({ quizCode: payload.quizCode });
      if (existing) {
        return res.status(409).json({ error: "quizCode already exists." });
      }
    }

    // creator fallback
    if (!payload.createdBy && req.user?._id) {
      payload.createdBy = req.user._id;
    }

    const quiz = await Quiz.create(payload);
    return res.status(201).json({ data: quiz });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to create quiz." });
  }
};

/* ------------------------ read one ------------------------ */
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid quiz id." });

    const quiz = await Quiz.findById(id).populate("course", "title slug _id");
    if (!quiz) return res.status(404).json({ error: "Quiz not found." });

    return res.status(200).json({ data: quiz });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to get quiz." });
  }
};

/* ------------------------ list (filters + sort + pagination) ------------------------ */
/**
 * Query params supported:
 * - page, limit
 * - sortBy, sortOrder
 * - course (ObjectId)
 * - difficulty (basic|intermediate|advanced)
 * - isPublished (true/false)
 * - isPaid (true/false)
 * - startFrom, startTo  (ISO date strings: filter startTime window)
 * - endFrom, endTo      (ISO date strings: filter endTime window)
 * - q (search quizName/quizCode/subject/tags)
 */
exports.listQuizzes = async (req, res) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const {
      course,
      difficulty,
      startFrom,
      startTo,
      endFrom,
      endTo,
      sortBy,
      sortOrder,
      q,
    } = req.query;

    const filters = {};

    const isPublished = boolLike(req.query.isPublished);
    if (typeof isPublished === "boolean") filters.isPublished = isPublished;

    const isPaid = boolLike(req.query.isPaid);
    if (typeof isPaid === "boolean") filters.isPaid = isPaid;

    if (course && isValidObjectId(course)) filters.course = course;
    if (difficulty) filters.difficulty = { $in: String(difficulty).split(",") };

    // time windows
    if (startFrom || startTo) {
      filters.startTime = {};
      if (startFrom) filters.startTime.$gte = new Date(startFrom);
      if (startTo) filters.startTime.$lte = new Date(startTo);
    }
    if (endFrom || endTo) {
      filters.endTime = {};
      if (endFrom) filters.endTime.$gte = new Date(endFrom);
      if (endTo) filters.endTime.$lte = new Date(endTo);
    }

    // text search
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim(), "i");
      filters.$or = [
        { quizName: rx },
        { quizCode: rx },
        { subject: rx },
        { tags: rx },
      ];
    }

    const sort = cleanSort(sortBy, sortOrder);

    const [items, total] = await Promise.all([
      Quiz.find(filters)
        .populate("course", "title slug _id")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Quiz.countDocuments(filters),
    ]);

    return res.status(200).json({
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        sort,
        filters,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list quizzes." });
  }
};

/* ------------------------ update ------------------------ */
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid quiz id." });

    const payload = { ...req.body };
    const update = { ...payload };
    const unset = {};

    // Make course OPTIONAL and allow detaching (course: null / "")
    if ("course" in payload) {
      if (payload.course == null || payload.course === "") {
        unset.course = "";
        delete update.course;
      } else {
        if (!isValidObjectId(payload.course)) {
          return res.status(400).json({ error: "Invalid course id." });
        }
        const exists = await Course.findById(payload.course).select("_id");
        if (!exists)
          return res.status(404).json({ error: "Course not found." });
      }
    }

    // Protect unique quizCode collisions
    if (payload.quizCode) {
      const clash = await Quiz.findOne({
        quizCode: payload.quizCode,
        _id: { $ne: id },
      });
      if (clash)
        return res.status(409).json({ error: "quizCode already in use." });
    }

    const updateDoc =
      Object.keys(unset).length > 0 ? { $set: update, $unset: unset } : update;

    const updated = await Quiz.findByIdAndUpdate(id, updateDoc, {
      new: true,
      runValidators: true,
    }).populate("course", "title slug _id");

    if (!updated) return res.status(404).json({ error: "Quiz not found." });
    return res.status(200).json({ data: updated });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to update quiz." });
  }
};

/* ------------------------ delete ------------------------ */
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ error: "Invalid quiz id." });

    const deleted = await Quiz.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Quiz not found." });

    return res
      .status(200)
      .json({ data: { _id: id }, message: "Quiz deleted." });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to delete quiz." });
  }
};

/* ------------------------ publish / unpublish ------------------------ */
exports.publishQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByIdAndUpdate(
      id,
      { isPublished: true },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found." });
    return res.status(200).json({ data: quiz });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to publish quiz." });
  }
};
exports.unpublishQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findByIdAndUpdate(
      id,
      { isPublished: false },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found." });
    return res.status(200).json({ data: quiz });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to unpublish quiz." });
  }
};

/* ------------------------ duplicate (copy) ------------------------ */
exports.duplicateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await Quiz.findById(id);
    if (!original) return res.status(404).json({ error: "Quiz not found." });

    const copy = original.toObject();
    delete copy._id;
    copy.quizName = `${original.quizName} (Copy)`;
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    copy.quizCode = `${original.quizCode}-${suffix}`;
    copy.isPublished = false;
    copy.createdAt = undefined;
    copy.updatedAt = undefined;

    const duplicated = await Quiz.create(copy);
    return res.status(201).json({ data: duplicated });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to duplicate quiz." });
  }
};

/* ------------------------ counts ------------------------ */
exports.countQuizzes = async (_req, res) => {
  try {
    const total = await Quiz.countDocuments({});
    return res.status(200).json({ data: { total } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to count quizzes." });
  }
};
exports.countByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ error: "Invalid course id." });
    }
    const total = await Quiz.countDocuments({ course: courseId });
    return res.status(200).json({ data: { courseId, total } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to count by course." });
  }
};
exports.countByDifficulty = async (_req, res) => {
  try {
    const rows = await Quiz.aggregate([
      { $group: { _id: "$difficulty", total: { $sum: 1 } } },
    ]);
    const result = rows.reduce((acc, r) => {
      acc[r._id || "unknown"] = r.total;
      return acc;
    }, {});
    return res.status(200).json({ data: result });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to count by difficulty." });
  }
};
exports.countPublished = async (_req, res) => {
  try {
    const total = await Quiz.countDocuments({ isPublished: true });
    return res.status(200).json({ data: { total } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to count published quizzes." });
  }
};
exports.countPaid = async (_req, res) => {
  try {
    const totalPaid = await Quiz.countDocuments({ isPaid: true });
    const totalFree = await Quiz.countDocuments({ isPaid: false });
    return res.status(200).json({ data: { paid: totalPaid, free: totalFree } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to count paid/free quizzes." });
  }
};

/* ------------------------ convenience lists ------------------------ */
exports.listActiveQuizzes = async (_req, res) => {
  try {
    const now = new Date();
    const filters = {
      isPublished: true,
      $and: [
        {
          $or: [
            { startTime: { $exists: false } },
            { startTime: { $lte: now } },
          ],
        },
        { $or: [{ endTime: { $exists: false } }, { endTime: { $gte: now } }] },
      ],
    };
    const items = await Quiz.find(filters)
      .populate("course", "title slug _id")
      .sort({ startTime: 1 });
    return res.status(200).json({ data: items, meta: { now } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list active quizzes." });
  }
};

exports.listUpcomingQuizzes = async (_req, res) => {
  try {
    const now = new Date();
    const items = await Quiz.find({
      isPublished: true,
      startTime: { $exists: true, $gt: now },
    })
      .populate("course", "title slug _id")
      .sort({ startTime: 1 });
    return res.status(200).json({ data: items, meta: { now } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list upcoming quizzes." });
  }
};

exports.listQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ error: "Invalid course id." });
    }
    const sort = cleanSort(req.query.sortBy, req.query.sortOrder);
    const items = await Quiz.find({ course: courseId }).sort(sort);
    return res.status(200).json({ data: items, meta: { sort, courseId } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list by course." });
  }
};

/* ------------------------ bulk ops ------------------------ */
exports.bulkPublish = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: "ids[] required." });

    const result = await Quiz.updateMany(
      { _id: { $in: ids.map(String).filter(isValidObjectId) } },
      { $set: { isPublished: true } }
    );
    return res.status(200).json({ data: result });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed bulk publish." });
  }
};
exports.bulkDelete = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: "ids[] required." });

    const result = await Quiz.deleteMany({
      _id: { $in: ids.map(String).filter(isValidObjectId) },
    });
    return res.status(200).json({ data: result });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed bulk delete." });
  }
};

/* ------------------------ import / export (JSON) ------------------------ */
exports.exportQuizzes = async (req, res) => {
  try {
    // Build filters (same as listQuizzes) but without pagination
    const { course, difficulty, startFrom, startTo, endFrom, endTo, q } =
      req.query;

    const filters = {};
    const isPublished = boolLike(req.query.isPublished);
    if (typeof isPublished === "boolean") filters.isPublished = isPublished;
    const isPaid = boolLike(req.query.isPaid);
    if (typeof isPaid === "boolean") filters.isPaid = isPaid;
    if (course && isValidObjectId(course)) filters.course = course;
    if (difficulty) filters.difficulty = { $in: String(difficulty).split(",") };
    if (startFrom || startTo) {
      filters.startTime = {};
      if (startFrom) filters.startTime.$gte = new Date(startFrom);
      if (startTo) filters.startTime.$lte = new Date(startTo);
    }
    if (endFrom || endTo) {
      filters.endTime = {};
      if (endFrom) filters.endTime.$gte = new Date(endFrom);
      if (endTo) filters.endTime.$lte = new Date(endTo);
    }
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim(), "i");
      filters.$or = [
        { quizName: rx },
        { quizCode: rx },
        { subject: rx },
        { tags: rx },
      ];
    }

    const data = await Quiz.find(filters).lean();
    return res
      .status(200)
      .json({ data, meta: { count: data.length, filters } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to export quizzes." });
  }
};

exports.importQuizzes = async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.data) ? req.body.data : [];
    if (!rows.length)
      return res.status(400).json({ error: "data[] required." });

    // OPTIONAL course check: only validate provided, ObjectId-looking course ids
    const courseIds = [
      ...new Set(rows.map((r) => String(r.course)).filter(isValidObjectId)),
    ];
    if (courseIds.length) {
      const courses = await Course.find({ _id: { $in: courseIds } }).select(
        "_id"
      );
      const courseSet = new Set(courses.map((c) => String(c._id)));
      const invalidCourses = courseIds.filter((id) => !courseSet.has(id));
      if (invalidCourses.length) {
        return res
          .status(400)
          .json({ error: "Some course ids are invalid.", invalidCourses });
      }
    }

    // Ensure unique quizCode
    const codes = rows.map((r) => r.quizCode).filter(Boolean);
    if (codes.length) {
      const existing = await Quiz.find({ quizCode: { $in: codes } }).select(
        "quizCode"
      );
      const clash = new Set(existing.map((x) => x.quizCode));
      const withConflicts = rows.filter((r) => clash.has(r.quizCode));
      if (withConflicts.length) {
        return res.status(409).json({
          error: "Duplicate quizCode(s) detected.",
          duplicates: withConflicts.map((r) => r.quizCode),
        });
      }
    }

    const created = await Quiz.insertMany(rows, { ordered: false });
    return res
      .status(201)
      .json({ data: created, meta: { inserted: created.length } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to import quizzes." });
  }
};
