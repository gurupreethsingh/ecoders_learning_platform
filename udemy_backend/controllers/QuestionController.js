// controllers/QuestionController.js
const mongoose = require("mongoose");
const Question = require("../models/QuestionModel");

const { isValidObjectId, Types } = mongoose;
const toObjectId = (v) =>
  isValidObjectId(v) ? new Types.ObjectId(String(v)) : null;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

// Fields you may want populated in responses
const defaultPopulate = [
  { path: "degree", select: "name title" },
  {
    path: "semister",
    select: "title semister_name semNumber",
  },
  { path: "course", select: "title name code" },
  { path: "exam", select: "examName examCode" },
  { path: "createdBy", select: "name fullName email" },
  { path: "updatedBy", select: "name fullName email" },
];

const ok = (res, data, meta) =>
  res.status(200).json(meta ? { data, meta } : { data });
const created = (res, data) => res.status(201).json({ data });
const notFound = (res, msg = "Not found") =>
  res.status(404).json({ message: msg });
const bad = (res, msg) => res.status(400).json({ message: msg });
const fail = (res, e, status = 500) =>
  res
    .status(status)
    .json({ message: e?.message || "Internal Server Error", stack: e?.stack });

/** Build filter object from query string */
function buildFilters(q = {}) {
  const filter = {};

  // relations (accept either "semester" or "semister" in queries; model is "semister")
  if (q.degree && toObjectId(q.degree)) filter.degree = toObjectId(q.degree);
  const semId =
    (q.semester && toObjectId(q.semester)) ||
    (q.semister && toObjectId(q.semister));
  if (semId) filter.semister = semId;
  if (q.course && toObjectId(q.course)) filter.course = toObjectId(q.course);
  if (q.exam && toObjectId(q.exam)) filter.exam = toObjectId(q.exam);

  // enums / booleans
  if (q.question_type)
    filter.question_type = String(q.question_type).toLowerCase();
  if (q.difficultyLevel)
    filter.difficultyLevel = String(q.difficultyLevel).toLowerCase();
  if (q.status) filter.status = String(q.status).toLowerCase();
  if (q.isActive !== undefined)
    filter.isActive = ["true", "1", true, 1, "on"].includes(q.isActive);

  // sections / order
  if (q.section) filter.section = q.section;

  // texty filters
  if (q.topic) filter.topic = new RegExp(String(q.topic).trim(), "i");
  if (q.subtopic) filter.subtopic = new RegExp(String(q.subtopic).trim(), "i");
  if (q.chapter) filter.chapter = new RegExp(String(q.chapter).trim(), "i");
  if (q.language) filter.language = new RegExp(String(q.language).trim(), "i");

  // tags (comma or array)
  if (q.tags) {
    const tagsArr = Array.isArray(q.tags)
      ? q.tags
      : String(q.tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
    if (tagsArr.length) filter.tags = { $in: tagsArr };
  }

  // text search across text index (question_text, tags, topic, subtopic, chapter)
  if (q.search) {
    filter.$text = { $search: String(q.search).trim() };
  }

  // date windows (createdAt / updatedAt)
  if (q.createdFrom || q.createdTo) {
    filter.createdAt = {};
    if (q.createdFrom) filter.createdAt.$gte = new Date(q.createdFrom);
    if (q.createdTo) filter.createdAt.$lte = new Date(q.createdTo);
  }
  if (q.updatedFrom || q.updatedTo) {
    filter.updatedAt = {};
    if (q.updatedFrom) filter.updatedAt.$gte = new Date(q.updatedFrom);
    if (q.updatedTo) filter.updatedAt.$lte = new Date(q.updatedTo);
  }

  return filter;
}

function buildSort(q = {}) {
  const sortBy = q.sortBy || (q.search ? "score" : "createdAt");
  const sortDir = String(q.sortDir || "desc").toLowerCase() === "asc" ? 1 : -1;

  // If using $text score
  if (q.search && sortBy === "score") {
    return { score: { $meta: "textScore" }, createdAt: -1 };
  }
  return { [sortBy]: sortDir };
}

function buildPagination(q = {}) {
  const page = Math.max(1, parseInt(q.page || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(q.limit || `${DEFAULT_LIMIT}`, 10))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/** Helper: compute next order value within an exam/section */
async function nextOrder(examId, section) {
  if (!toObjectId(examId)) return 0;
  const filter = { exam: toObjectId(examId) };
  if (section) filter.section = section;
  const last = await Question.find(filter)
    .sort({ order: -1 })
    .select("order")
    .lean();
  return last?.[0]?.order >= 0 ? last[0].order + 1 : 0;
}

/* ======================
   CONTROLLERS
   ====================== */

// Create a single question
exports.createQuestion = async (req, res) => {
  try {
    const payload = req.body || {};
    // Ensure required relations exist (model also enforces)
    const required = [
      "degree",
      "semister",
      "course",
      "exam",
      "question_type",
      "question_text",
    ];
    for (const f of required) {
      if (!payload[f]) return bad(res, `Field "${f}" is required.`);
    }

    // Ensure MCQ opt count if mcq
    if (payload.question_type === "mcq") {
      if (!Array.isArray(payload.options) || payload.options.length !== 4) {
        return bad(res, "MCQ must include exactly 4 options.");
      }
      if (
        typeof payload.correctOptionIndex !== "number" ||
        payload.correctOptionIndex < 0 ||
        payload.correctOptionIndex > 3
      ) {
        return bad(res, "MCQ requires correctOptionIndex (0..3).");
      }
    }

    // Auto order if not provided
    if (payload.order == null) {
      payload.order = await nextOrder(payload.exam, payload.section);
    }

    payload.createdBy = payload.createdBy || req.user?._id; // if you set req.user
    const doc = await Question.create(payload);
    const saved = await Question.findById(doc._id)
      .populate(defaultPopulate)
      .lean();
    return created(res, saved);
  } catch (e) {
    return fail(res, e);
  }
};

// Bulk create questions (e.g., add many to an exam)
exports.bulkCreateQuestions = async (req, res) => {
  try {
    const list = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (!list.length) return bad(res, "Provide questions: []");

    const examId = req.body.exam || list[0]?.exam;
    if (!examId) return bad(res, "Exam is required for bulk create.");

    let baseOrder = await nextOrder(examId, req.body.section);

    const docs = list.map((q) => {
      const payload = { ...q };
      if (payload.order == null) {
        payload.order = baseOrder++;
      }
      payload.createdBy = payload.createdBy || req.user?._id;
      return payload;
    });

    const inserted = await Question.insertMany(docs, { ordered: false });
    const ids = inserted.map((d) => d._id);
    const rows = await Question.find({ _id: { $in: ids } })
      .populate(defaultPopulate)
      .lean();
    return created(res, rows);
  } catch (e) {
    // ordered:false => may throw MongoBulkWriteError but still insert some
    return fail(res, e);
  }
};

// Get single by id
exports.getQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!toObjectId(id)) return bad(res, "Invalid id.");
    const doc = await Question.findById(id).populate(defaultPopulate).lean();
    if (!doc) return notFound(res, "Question not found.");
    return ok(res, doc);
  } catch (e) {
    return fail(res, e);
  }
};

// List with filters + pagination + sorting
exports.listQuestions = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    const sort = buildSort(req.query);
    const { page, limit, skip } = buildPagination(req.query);

    const cursor = Question.find(filter).sort(sort).skip(skip).limit(limit);

    // text score projection if using $text
    if (filter.$text) cursor.select({ score: { $meta: "textScore" } });

    const [rows, total] = await Promise.all([
      cursor.populate(defaultPopulate).lean(),
      Question.countDocuments(filter),
    ]);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    return ok(res, rows, meta);
  } catch (e) {
    return fail(res, e);
  }
};

// Count only (same filters)
exports.countQuestions = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    const total = await Question.countDocuments(filter);
    return ok(res, { total });
  } catch (e) {
    return fail(res, e);
  }
};

// Update (PATCH)
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!toObjectId(id)) return bad(res, "Invalid id.");
    const payload = { ...req.body, updatedBy: req.user?._id };

    // Protect some fields if needed (example: marks_scored/answer_status are attempt-level)
    // delete payload.marks_scored;
    // delete payload.answer_status;

    const doc = await Question.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate(defaultPopulate)
      .lean();

    if (!doc) return notFound(res, "Question not found.");
    return ok(res, doc);
  } catch (e) {
    return fail(res, e);
  }
};

// Delete single
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!toObjectId(id)) return bad(res, "Invalid id.");
    const doc = await Question.findByIdAndDelete(id).lean();
    if (!doc) return notFound(res, "Question not found.");
    return ok(res, { deletedId: id });
  } catch (e) {
    return fail(res, e);
  }
};

// Bulk delete
exports.bulkDeleteQuestions = async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map(String)
      .filter(isValidObjectId);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.deleteMany({ _id: { $in: ids } });
    return ok(res, { deletedCount: r.deletedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// Add EXISTING question ids to an exam (re-associate & set order/section)
// Useful when selecting from bank
exports.addExistingToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map(String)
      .filter(isValidObjectId);

    if (!toObjectId(examId)) return bad(res, "Invalid examId.");
    if (!ids.length) return bad(res, "Provide ids:[]");

    const section = req.body?.section || undefined;
    let order = await nextOrder(examId, section);

    const bulk = ids.map((id) => ({
      updateOne: {
        filter: { _id: toObjectId(id) },
        update: {
          $set: {
            exam: toObjectId(examId),
            ...(section ? { section } : {}),
            order: order++,
            updatedBy: req.user?._id,
          },
        },
      },
    }));

    await Question.bulkWrite(bulk, { ordered: false });
    const rows = await Question.find({ _id: { $in: ids } })
      .populate(defaultPopulate)
      .lean();
    return ok(res, rows);
  } catch (e) {
    return fail(res, e);
  }
};

// Remove questions from an exam by DELETING them (since exam is required in model)
exports.removeFromExamAndDelete = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map(String)
      .filter(isValidObjectId);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.deleteMany({
      _id: { $in: ids },
      exam: toObjectId(examId),
    });
    return ok(res, { deletedCount: r.deletedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// Move questions between exams (keep everything else)
exports.moveQuestionsToExam = async (req, res) => {
  try {
    const { fromExamId, toExamId } = req.body || {};
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map(String)
      .filter(isValidObjectId);

    if (!toObjectId(fromExamId) || !toObjectId(toExamId))
      return bad(res, "Invalid fromExamId/toExamId.");
    if (!ids.length) return bad(res, "Provide ids:[]");

    let order = await nextOrder(toExamId, req.body?.section);
    const section = req.body?.section || undefined;

    const r = await Question.updateMany(
      { _id: { $in: ids }, exam: toObjectId(fromExamId) },
      {
        $set: {
          exam: toObjectId(toExamId),
          ...(section ? { section } : {}),
          order: order, // set same order temporarily
          updatedBy: req.user?._id,
        },
      }
    );

    // Re-fetch and re-assign unique orders if needed
    const moved = await Question.find({ _id: { $in: ids } })
      .sort({ createdAt: 1 })
      .lean();

    const bulk = moved.map((m) => ({
      updateOne: {
        filter: { _id: m._id },
        update: { $set: { order: order++ } },
      },
    }));
    if (bulk.length) await Question.bulkWrite(bulk, { ordered: false });

    const rows = await Question.find({ _id: { $in: ids } })
      .populate(defaultPopulate)
      .lean();

    return ok(res, { updatedCount: r.modifiedCount, rows });
  } catch (e) {
    return fail(res, e);
  }
};

// Reorder within an exam/section
// body: { items: [{ id, order }], examId, section? }
exports.reorderWithinExam = async (req, res) => {
  try {
    const { items, examId, section } = req.body || {};
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return bad(res, "Provide items: [{id, order}]");

    const bulk = arr
      .filter((it) => isValidObjectId(it.id))
      .map((it) => ({
        updateOne: {
          filter: {
            _id: toObjectId(it.id),
            exam: toObjectId(examId),
            ...(section ? { section } : {}),
          },
          update: { $set: { order: Number(it.order) || 0 } },
        },
      }));
    if (!bulk.length) return bad(res, "No valid items.");

    await Question.bulkWrite(bulk, { ordered: false });
    return ok(res, { updated: bulk.length });
  } catch (e) {
    return fail(res, e);
  }
};

// Duplicate a question (or multiple copies)
exports.duplicateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const copies = Math.max(1, Number(req.body?.copies || 1));
    if (!toObjectId(id)) return bad(res, "Invalid id.");

    const orig = await Question.findById(id).lean();
    if (!orig) return notFound(res, "Question not found.");

    let orderVal = await nextOrder(orig.exam, orig.section);
    const docs = [];
    for (let i = 0; i < copies; i++) {
      const clone = { ...orig };
      delete clone._id;
      delete clone.createdAt;
      delete clone.updatedAt;
      clone.order = orderVal++;
      clone.version = (clone.version || 1) + 1;
      clone.createdBy = req.user?._id;
      clone.updatedBy = undefined;
      docs.push(clone);
    }

    const inserted = await Question.insertMany(docs, { ordered: false });
    const ids = inserted.map((d) => d._id);
    const rows = await Question.find({ _id: { $in: ids } })
      .populate(defaultPopulate)
      .lean();
    return created(res, rows);
  } catch (e) {
    return fail(res, e);
  }
};

// Toggle flags
exports.toggleActive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!toObjectId(id)) return bad(res, "Invalid id.");
    const doc = await Question.findById(id);
    if (!doc) return notFound(res, "Question not found.");
    doc.isActive = !doc.isActive;
    doc.updatedBy = req.user?._id;
    await doc.save();
    const row = await Question.findById(id).populate(defaultPopulate).lean();
    return ok(res, row);
  } catch (e) {
    return fail(res, e);
  }
};

exports.setStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!toObjectId(id)) return bad(res, "Invalid id.");
    if (!["draft", "published", "archived"].includes(String(status)))
      return bad(res, "Invalid status. Use draft/published/archived.");
    const doc = await Question.findByIdAndUpdate(
      id,
      { $set: { status, updatedBy: req.user?._id } },
      { new: true, runValidators: true }
    )
      .populate(defaultPopulate)
      .lean();
    if (!doc) return notFound(res, "Question not found.");
    return ok(res, doc);
  } catch (e) {
    return fail(res, e);
  }
};

// Stats for an exam (overview)
exports.examStats = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");

    const [byType, byDiff, totals] = await Promise.all([
      Question.aggregate([
        { $match: { exam: toObjectId(examId) } },
        { $group: { _id: "$question_type", count: { $sum: 1 } } },
      ]),
      Question.aggregate([
        { $match: { exam: toObjectId(examId) } },
        { $group: { _id: "$difficultyLevel", count: { $sum: 1 } } },
      ]),
      Question.aggregate([
        { $match: { exam: toObjectId(examId) } },
        {
          $group: {
            _id: null,
            totalQuestions: { $sum: 1 },
            totalMarks: { $sum: "$marks_alloted" },
          },
        },
      ]),
    ]);

    const out = {
      byType: byType.reduce(
        (m, x) => ((m[x._id || "unknown"] = x.count), m),
        {}
      ),
      byDifficulty: byDiff.reduce(
        (m, x) => ((m[x._id || "unknown"] = x.count), m),
        {}
      ),
      totals: totals[0] || { totalQuestions: 0, totalMarks: 0 },
    };
    return ok(res, out);
  } catch (e) {
    return fail(res, e);
  }
};

// Random sample (e.g., build a random section)
exports.randomSample = async (req, res) => {
  try {
    const { size = 10 } = req.query;
    const filter = buildFilters(req.query);
    const n = Math.max(1, Math.min(Number(size) || 10, 200));

    const pipeline = [{ $match: filter }, { $sample: { size: n } }];
    // project minimal fields to speed up, then populate via follow-up
    const sampled = await Question.aggregate(pipeline);
    const ids = sampled.map((d) => d._id);
    const rows = await Question.find({ _id: { $in: ids } })
      .populate(defaultPopulate)
      .lean();
    return ok(res, rows);
  } catch (e) {
    return fail(res, e);
  }
};

// Soft-archive or restore many
exports.bulkSetStatus = async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [])
      .map(String)
      .filter(isValidObjectId);
    const status = String(req.body?.status || "").toLowerCase();
    if (!ids.length) return bad(res, "Provide ids:[]");
    if (!["draft", "published", "archived"].includes(status))
      return bad(res, "Invalid status.");
    const r = await Question.updateMany(
      { _id: { $in: ids } },
      { $set: { status, updatedBy: req.user?._id } }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// Attach / replace media on a question (optional utility)
exports.setAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const attachments = Array.isArray(req.body?.attachments)
      ? req.body.attachments
      : [];
    if (!toObjectId(id)) return bad(res, "Invalid id.");
    const doc = await Question.findByIdAndUpdate(
      id,
      { $set: { attachments, updatedBy: req.user?._id } },
      { new: true, runValidators: true }
    )
      .populate(defaultPopulate)
      .lean();
    if (!doc) return notFound(res, "Question not found.");
    return ok(res, doc);
  } catch (e) {
    return fail(res, e);
  }
};
