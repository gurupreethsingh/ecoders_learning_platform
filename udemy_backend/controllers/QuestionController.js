// controllers/QuestionController.js
const mongoose = require("mongoose");
const Question = require("../models/QuestionModel");

const { isValidObjectId, Types } = mongoose;
const toObjectId = (v) =>
  isValidObjectId(v) ? new Types.ObjectId(String(v)) : null;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

// -------------------------
// Populate configuration
// -------------------------
const defaultPopulate = [
  { path: "degree", select: "name title shortName code" },
  { path: "semester", select: "title semister_name semNumber code" },
  { path: "course", select: "title name code slug" },
  { path: "exam", select: "title examName examCode sectionRules" },
  { path: "quiz", select: "title quizCode visibility" },
  { path: "createdBy", select: "name fullName email" },
  { path: "updatedBy", select: "name fullName email" },
];

// -------------------------
// Response helpers
// -------------------------
const ok = (res, data, meta) =>
  res.status(200).json(meta ? { data, meta } : { data });
const created = (res, data) => res.status(201).json({ data });
const notFound = (res, msg = "Not found") =>
  res.status(404).json({ message: msg });
const bad = (res, msg) => res.status(400).json({ message: String(msg) });
const fail = (res, e, status = 500) =>
  res
    .status(status)
    .json({ message: e?.message || "Internal Server Error", stack: e?.stack });

// -------------------------
// Filter / Sort / Pagination
// -------------------------
function buildFilters(q = {}) {
  const filter = {};

  // Relations (all optional)
  if (q.degree && toObjectId(q.degree)) filter.degree = toObjectId(q.degree);
  const semId =
    (q.semester && toObjectId(q.semester)) ||
    (q.semester && toObjectId(q.semester));
  if (semId) filter.semester = semId;
  if (q.course && toObjectId(q.course)) filter.course = toObjectId(q.course);
  if (q.exam && toObjectId(q.exam)) filter.exam = toObjectId(q.exam);
  if (q.quiz && toObjectId(q.quiz)) filter.quiz = toObjectId(q.quiz);

  // Types / flags
  if (q.question_type)
    filter.question_type = String(q.question_type).toLowerCase();
  if (q.difficultyLevel)
    filter.difficultyLevel = String(q.difficultyLevel).toLowerCase();
  if (q.status) filter.status = String(q.status).toLowerCase();
  if (q.isActive !== undefined) {
    filter.isActive = ["true", "1", true, 1, "on"].includes(q.isActive);
  }

  // Section
  if (q.section) filter.section = String(q.section);

  // Texty filters
  if (q.topic) filter.topic = new RegExp(String(q.topic).trim(), "i");
  if (q.subtopic) filter.subtopic = new RegExp(String(q.subtopic).trim(), "i");
  if (q.chapter) filter.chapter = new RegExp(String(q.chapter).trim(), "i");
  if (q.language) filter.language = new RegExp(String(q.language).trim(), "i");

  // Tags: comma list or array
  if (q.tags) {
    const tagsArr = Array.isArray(q.tags)
      ? q.tags
      : String(q.tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
    if (tagsArr.length) filter.tags = { $in: tagsArr };
  }

  // Full text search
  if (q.search) filter.$text = { $search: String(q.search).trim() };

  // Numeric ranges
  if (q.marksMin !== undefined || q.marksMax !== undefined) {
    filter.marks_alloted = {};
    if (q.marksMin !== undefined)
      filter.marks_alloted.$gte = Number(q.marksMin);
    if (q.marksMax !== undefined)
      filter.marks_alloted.$lte = Number(q.marksMax);
  }
  if (q.timeLimitMin !== undefined || q.timeLimitMax !== undefined) {
    filter.timeLimitSeconds = {};
    if (q.timeLimitMin !== undefined)
      filter.timeLimitSeconds.$gte = Number(q.timeLimitMin);
    if (q.timeLimitMax !== undefined)
      filter.timeLimitSeconds.$lte = Number(q.timeLimitMax);
  }

  // Date ranges
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

  if (q.search && sortBy === "score") {
    // Primary by textScore, then newest first
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

// -------------------------
// Helpers
// -------------------------
/** Compute next order within a container (exam or quiz) + optional section */
async function nextOrder({ examId, quizId, section }) {
  const filter = {};
  if (toObjectId(examId)) filter.exam = toObjectId(examId);
  if (toObjectId(quizId)) filter.quiz = toObjectId(quizId);
  if (section) filter.section = section;

  if (!filter.exam && !filter.quiz) return 0; // unattached => start at 0

  const last = await Question.find(filter)
    .sort({ order: -1 })
    .select("order")
    .lean();
  return last?.[0]?.order >= 0 ? last[0].order + 1 : 0;
}

/** Normalize and validate question-type specific payload bits */
function normalizePayloadByType(payload = {}) {
  const qt = String(payload.question_type || "").toLowerCase();

  if (qt === "mcq") {
    if (!Array.isArray(payload.options) || payload.options.length !== 4) {
      throw new Error("MCQ must include exactly 4 options.");
    }
    if (
      typeof payload.correctOptionIndex !== "number" ||
      payload.correctOptionIndex < 0 ||
      payload.correctOptionIndex > 3
    ) {
      throw new Error("MCQ requires correctOptionIndex (0..3).");
    }
    // Clean non-MCQ fields
    delete payload.correctBoolean;
    delete payload.theory_answer;
    delete payload.rubric;
    payload.maxWords = payload.maxWords || 0;
    delete payload.programming_language;
    delete payload.starterCode;
    delete payload.testcases;
    delete payload.direct_answer;
  }

  if (qt === "true_false") {
    if (typeof payload.correctBoolean !== "boolean") {
      throw new Error("True/False requires correctBoolean.");
    }
    // Clean other
    delete payload.options;
    delete payload.correctOptionIndex;
    delete payload.theory_answer;
    delete payload.rubric;
    payload.maxWords = payload.maxWords || 0;
    delete payload.programming_language;
    delete payload.starterCode;
    delete payload.testcases;
    delete payload.direct_answer;
  }

  if (qt === "theory") {
    delete payload.options;
    delete payload.correctOptionIndex;
    delete payload.correctBoolean;
    delete payload.programming_language;
    delete payload.starterCode;
    delete payload.testcases;
    delete payload.direct_answer;
  }

  if (qt === "programming") {
    delete payload.options;
    delete payload.correctOptionIndex;
    delete payload.correctBoolean;
    delete payload.theory_answer;
    delete payload.rubric;
    payload.maxWords = payload.maxWords || 0;
    delete payload.direct_answer;
  }

  if (qt === "direct") {
    delete payload.options;
    delete payload.correctOptionIndex;
    delete payload.correctBoolean;
    delete payload.theory_answer;
    delete payload.rubric;
    payload.maxWords = payload.maxWords || 0;
    delete payload.programming_language;
    delete payload.starterCode;
    delete payload.testcases;
  }

  return payload;
}

/** Build a safe $in ObjectId array */
function toObjectIdArray(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map(String)
    .filter(isValidObjectId)
    .map((x) => new Types.ObjectId(x));
}

/** Swap order between two questions (same container+section) */
async function swapOrders(a, b) {
  await Question.updateOne({ _id: a._id }, { $set: { order: b.order } });
  await Question.updateOne({ _id: b._id }, { $set: { order: a.order } });
}

// -------------------------
// CONTROLLERS
// -------------------------

// Create one
exports.createQuestion = async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };

    // Required base fields
    const required = ["question_text", "question_type"];
    for (const f of required) {
      if (!payload[f]) return bad(res, `Field "${f}" is required.`);
    }

    // Normalize by type (enforce logical correctness)
    try {
      normalizePayloadByType(payload);
    } catch (e) {
      return bad(res, e.message);
    }

    // Auto order if attached to exam/quiz and no order provided
    if (payload.order == null && (payload.exam || payload.quiz)) {
      payload.order = await nextOrder({
        examId: payload.exam,
        quizId: payload.quiz,
        section: payload.section,
      });
    }

    payload.createdBy = payload.createdBy || req.user?._id;

    const doc = await Question.create(payload);
    const row = await Question.findById(doc._id)
      .populate(defaultPopulate)
      .lean();
    return created(res, row);
  } catch (e) {
    return fail(res, e);
  }
};

// Replace one (PUT-style full body)
exports.replaceQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!toObjectId(id)) return bad(res, "Invalid id.");

    const payload = { ...(req.body || {}) };
    const required = ["question_text", "question_type"];
    for (const f of required) {
      if (!payload[f]) return bad(res, `Field "${f}" is required.`);
    }
    try {
      normalizePayloadByType(payload);
    } catch (e) {
      return bad(res, e.message);
    }
    payload.updatedBy = req.user?._id;

    const doc = await Question.findOneAndReplace({ _id: id }, payload, {
      upsert: false,
      returnDocument: "after",
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

// Bulk create
// body: { questions: [...], exam?, quiz?, section? }
exports.bulkCreateQuestions = async (req, res) => {
  try {
    const list = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (!list.length) return bad(res, "Provide questions: []");

    const examId = req.body.exam;
    const quizId = req.body.quiz;
    const section = req.body.section;

    let orderBase = await nextOrder({ examId, quizId, section });

    const docs = list.map((q) => {
      const payload = { ...q };
      try {
        normalizePayloadByType(payload);
      } catch (e) {
        throw new Error(`Invalid question in bulkCreate: ${e.message}`);
      }
      if (examId && !payload.exam) payload.exam = examId;
      if (quizId && !payload.quiz) payload.quiz = quizId;
      if (section && !payload.section) payload.section = section;

      if (payload.order == null && (payload.exam || payload.quiz)) {
        payload.order = orderBase++;
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
    return fail(res, e);
  }
};

// Bulk update (generic $set on many ids)
exports.bulkUpdateQuestions = async (req, res) => {
  try {
    const ids = toObjectIdArray(req.body?.ids);
    const set = req.body?.set || {};
    if (!ids.length) return bad(res, "Provide ids:[]");
    if (!set || typeof set !== "object")
      return bad(res, "Provide set:{} payload");

    // If changing question_type, validate per type
    if (set.question_type) {
      try {
        normalizePayloadByType(set);
      } catch (e) {
        return bad(res, e.message);
      }
    }

    set.updatedBy = req.user?._id;
    const r = await Question.updateMany(
      { _id: { $in: ids } },
      { $set: set },
      { runValidators: true }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// Bulk set section
exports.bulkSetSection = async (req, res) => {
  try {
    const ids = toObjectIdArray(req.body?.ids);
    const section = req.body?.section || "";
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.updateMany(
      { _id: { $in: ids } },
      { $set: { section, updatedBy: req.user?._id } }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// Bulk set marks_alloted
exports.bulkSetMarks = async (req, res) => {
  try {
    const ids = toObjectIdArray(req.body?.ids);
    const marks = Number(req.body?.marks_alloted);
    if (!ids.length) return bad(res, "Provide ids:[]");
    if (!Number.isFinite(marks) || marks < 0)
      return bad(res, "marks_alloted must be >= 0");

    const r = await Question.updateMany(
      { _id: { $in: ids } },
      { $set: { marks_alloted: marks, updatedBy: req.user?._id } }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// Get one
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

// List
exports.listQuestions = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    const sort = buildSort(req.query);
    const { page, limit, skip } = buildPagination(req.query);

    const cursor = Question.find(filter).sort(sort).skip(skip).limit(limit);

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

// Count (same filters)
exports.countQuestions = async (req, res) => {
  try {
    const filter = buildFilters(req.query);
    const total = await Question.countDocuments(filter);
    return ok(res, { total });
  } catch (e) {
    return fail(res, e);
  }
};

// Update one (PATCH)
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!toObjectId(id)) return bad(res, "Invalid id.");

    const payload = { ...(req.body || {}) };
    if (payload.question_type) {
      try {
        normalizePayloadByType(payload);
      } catch (e) {
        return bad(res, e.message);
      }
    }
    payload.updatedBy = req.user?._id;

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

// Delete one
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
    const ids = toObjectIdArray(req.body?.ids);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.deleteMany({ _id: { $in: ids } });
    return ok(res, { deletedCount: r.deletedCount });
  } catch (e) {
    return fail(res, e);
  }
};

// -------------------------
// Exam / Quiz association ops
// -------------------------

/** Add EXISTING question ids to an EXAM (re-associate & set order/section) */
exports.addExistingToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");

    const ids = toObjectIdArray(req.body?.ids);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const section = req.body?.section || undefined;
    let orderVal = await nextOrder({ examId, section });

    const bulk = ids.map((_id) => ({
      updateOne: {
        filter: { _id },
        update: {
          $set: {
            exam: toObjectId(examId),
            quiz: undefined,
            ...(section ? { section } : {}),
            order: orderVal++,
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

/** Add EXISTING question ids to a QUIZ (re-associate & set order/section) */
exports.addExistingToQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    if (!toObjectId(quizId)) return bad(res, "Invalid quizId.");

    const ids = toObjectIdArray(req.body?.ids);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const section = req.body?.section || undefined;
    let orderVal = await nextOrder({ quizId, section });

    const bulk = ids.map((_id) => ({
      updateOne: {
        filter: { _id },
        update: {
          $set: {
            quiz: toObjectId(quizId),
            exam: undefined,
            ...(section ? { section } : {}),
            order: orderVal++,
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

/** Remove questions from an exam by DELETING them */
exports.removeFromExamAndDelete = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");

    const ids = toObjectIdArray(req.body?.ids);
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

/** Remove questions from a quiz by DELETING them */
exports.removeFromQuizAndDelete = async (req, res) => {
  try {
    const { quizId } = req.params;
    if (!toObjectId(quizId)) return bad(res, "Invalid quizId.");

    const ids = toObjectIdArray(req.body?.ids);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.deleteMany({
      _id: { $in: ids },
      quiz: toObjectId(quizId),
    });
    return ok(res, { deletedCount: r.deletedCount });
  } catch (e) {
    return fail(res, e);
  }
};

/** Detach (keep question, just remove association) */
exports.detachFromExam = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");

    const ids = toObjectIdArray(req.body?.ids);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.updateMany(
      { _id: { $in: ids }, exam: toObjectId(examId) },
      {
        $set: {
          exam: undefined,
          section: undefined,
          order: 0,
          updatedBy: req.user?._id,
        },
      }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

exports.detachFromQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    if (!toObjectId(quizId)) return bad(res, "Invalid quizId.");

    const ids = toObjectIdArray(req.body?.ids);
    if (!ids.length) return bad(res, "Provide ids:[]");

    const r = await Question.updateMany(
      { _id: { $in: ids }, quiz: toObjectId(quizId) },
      {
        $set: {
          quiz: undefined,
          section: undefined,
          order: 0,
          updatedBy: req.user?._id,
        },
      }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

/** Move questions between exams */
exports.moveQuestionsToExam = async (req, res) => {
  try {
    const { fromExamId, toExamId, section } = req.body || {};
    const ids = toObjectIdArray(req.body?.ids);

    if (!toObjectId(fromExamId) || !toObjectId(toExamId))
      return bad(res, "Invalid fromExamId/toExamId.");
    if (!ids.length) return bad(res, "Provide ids:[]");

    let orderVal = await nextOrder({ examId: toExamId, section });

    const r = await Question.updateMany(
      { _id: { $in: ids }, exam: toObjectId(fromExamId) },
      {
        $set: {
          exam: toObjectId(toExamId),
          quiz: undefined,
          ...(section ? { section } : {}),
          order: orderVal,
          updatedBy: req.user?._id,
        },
      }
    );

    // Reassign unique orders deterministically
    const moved = await Question.find({ _id: { $in: ids } })
      .sort({ createdAt: 1 })
      .lean();
    const bulk = moved.map((m) => ({
      updateOne: {
        filter: { _id: m._id },
        update: { $set: { order: orderVal++ } },
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

/** Move questions between quizzes */
exports.moveQuestionsToQuiz = async (req, res) => {
  try {
    const { fromQuizId, toQuizId, section } = req.body || {};
    const ids = toObjectIdArray(req.body?.ids);

    if (!toObjectId(fromQuizId) || !toObjectId(toQuizId))
      return bad(res, "Invalid fromQuizId/toQuizId.");
    if (!ids.length) return bad(res, "Provide ids:[]");

    let orderVal = await nextOrder({ quizId: toQuizId, section });

    const r = await Question.updateMany(
      { _id: { $in: ids }, quiz: toObjectId(fromQuizId) },
      {
        $set: {
          quiz: toObjectId(toQuizId),
          exam: undefined,
          ...(section ? { section } : {}),
          order: orderVal,
          updatedBy: req.user?._id,
        },
      }
    );

    const moved = await Question.find({ _id: { $in: ids } })
      .sort({ createdAt: 1 })
      .lean();
    const bulk = moved.map((m) => ({
      updateOne: {
        filter: { _id: m._id },
        update: { $set: { order: orderVal++ } },
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

/** Reorder within an exam (and optional section) – bulk set explicit orders */
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
          update: {
            $set: { order: Number(it.order) || 0, updatedBy: req.user?._id },
          },
        },
      }));
    if (!bulk.length) return bad(res, "No valid items.");

    await Question.bulkWrite(bulk, { ordered: false });
    return ok(res, { updated: bulk.length });
  } catch (e) {
    return fail(res, e);
  }
};

/** Reorder within a quiz (and optional section) – bulk set explicit orders */
exports.reorderWithinQuiz = async (req, res) => {
  try {
    const { items, quizId, section } = req.body || {};
    if (!toObjectId(quizId)) return bad(res, "Invalid quizId.");

    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return bad(res, "Provide items: [{id, order}]");

    const bulk = arr
      .filter((it) => isValidObjectId(it.id))
      .map((it) => ({
        updateOne: {
          filter: {
            _id: toObjectId(it.id),
            quiz: toObjectId(quizId),
            ...(section ? { section } : {}),
          },
          update: {
            $set: { order: Number(it.order) || 0, updatedBy: req.user?._id },
          },
        },
      }));
    if (!bulk.length) return bad(res, "No valid items.");

    await Question.bulkWrite(bulk, { ordered: false });
    return ok(res, { updated: bulk.length });
  } catch (e) {
    return fail(res, e);
  }
};

// ---- Single-step move up/down (swap with neighbor) ----
exports.moveUpInExam = async (req, res) => {
  try {
    const { id, examId } = req.body || {};
    const section = req.body?.section;
    if (!toObjectId(id) || !toObjectId(examId))
      return bad(res, "Invalid id/examId.");

    const current = await Question.findOne({
      _id: toObjectId(id),
      exam: toObjectId(examId),
      ...(section ? { section } : {}),
    }).lean();
    if (!current)
      return notFound(res, "Question not found in this exam/section.");

    const prev = await Question.findOne({
      exam: toObjectId(examId),
      ...(section ? { section } : {}),
      order: { $lt: current.order },
    })
      .sort({ order: -1 })
      .lean();

    if (!prev) return ok(res, { message: "Already at top." });

    await swapOrders(current, prev);
    const row = await Question.findById(id).populate(defaultPopulate).lean();
    return ok(res, row);
  } catch (e) {
    return fail(res, e);
  }
};

exports.moveDownInExam = async (req, res) => {
  try {
    const { id, examId } = req.body || {};
    const section = req.body?.section;
    if (!toObjectId(id) || !toObjectId(examId))
      return bad(res, "Invalid id/examId.");

    const current = await Question.findOne({
      _id: toObjectId(id),
      exam: toObjectId(examId),
      ...(section ? { section } : {}),
    }).lean();
    if (!current)
      return notFound(res, "Question not found in this exam/section.");

    const next = await Question.findOne({
      exam: toObjectId(examId),
      ...(section ? { section } : {}),
      order: { $gt: current.order },
    })
      .sort({ order: 1 })
      .lean();

    if (!next) return ok(res, { message: "Already at bottom." });

    await swapOrders(current, next);
    const row = await Question.findById(id).populate(defaultPopulate).lean();
    return ok(res, row);
  } catch (e) {
    return fail(res, e);
  }
};

exports.moveUpInQuiz = async (req, res) => {
  try {
    const { id, quizId } = req.body || {};
    const section = req.body?.section;
    if (!toObjectId(id) || !toObjectId(quizId))
      return bad(res, "Invalid id/quizId.");

    const current = await Question.findOne({
      _id: toObjectId(id),
      quiz: toObjectId(quizId),
      ...(section ? { section } : {}),
    }).lean();
    if (!current)
      return notFound(res, "Question not found in this quiz/section.");

    const prev = await Question.findOne({
      quiz: toObjectId(quizId),
      ...(section ? { section } : {}),
      order: { $lt: current.order },
    })
      .sort({ order: -1 })
      .lean();

    if (!prev) return ok(res, { message: "Already at top." });

    await swapOrders(current, prev);
    const row = await Question.findById(id).populate(defaultPopulate).lean();
    return ok(res, row);
  } catch (e) {
    return fail(res, e);
  }
};

exports.moveDownInQuiz = async (req, res) => {
  try {
    const { id, quizId } = req.body || {};
    const section = req.body?.section;
    if (!toObjectId(id) || !toObjectId(quizId))
      return bad(res, "Invalid id/quizId.");

    const current = await Question.findOne({
      _id: toObjectId(id),
      quiz: toObjectId(quizId),
      ...(section ? { section } : {}),
    }).lean();
    if (!current)
      return notFound(res, "Question not found in this quiz/section.");

    const next = await Question.findOne({
      quiz: toObjectId(quizId),
      ...(section ? { section } : {}),
      order: { $gt: current.order },
    })
      .sort({ order: 1 })
      .lean();

    if (!next) return ok(res, { message: "Already at bottom." });

    await swapOrders(current, next);
    const row = await Question.findById(id).populate(defaultPopulate).lean();
    return ok(res, row);
  } catch (e) {
    return fail(res, e);
  }
};

// -------------------------
// Utilities: toggle, status, attachments, duplicate, random, stats
// -------------------------

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
    const allowed = ["draft", "published", "archived"];
    if (!allowed.includes(String(status)))
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

exports.bulkSetStatus = async (req, res) => {
  try {
    const ids = toObjectIdArray(req.body?.ids);
    const status = String(req.body?.status || "").toLowerCase();
    const allowed = ["draft", "published", "archived"];
    if (!ids.length) return bad(res, "Provide ids:[]");
    if (!allowed.includes(status)) return bad(res, "Invalid status.");

    const r = await Question.updateMany(
      { _id: { $in: ids } },
      { $set: { status, updatedBy: req.user?._id } }
    );
    return ok(res, { modifiedCount: r.modifiedCount });
  } catch (e) {
    return fail(res, e);
  }
};

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

exports.duplicateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const copies = Math.max(1, Number(req.body?.copies || 1));
    if (!toObjectId(id)) return bad(res, "Invalid id.");

    const orig = await Question.findById(id).lean();
    if (!orig) return notFound(res, "Question not found.");

    // For each copy, increment order within same container (exam/quiz)
    let orderVal = await nextOrder({
      examId: orig.exam,
      quizId: orig.quiz,
      section: orig.section,
    });

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

/** Random sample by filters (default size=10) */
exports.randomSample = async (req, res) => {
  try {
    const { size = 10 } = req.query;
    const filter = buildFilters(req.query);
    const n = Math.max(1, Math.min(Number(size) || 10, 200));

    const pipeline = [{ $match: filter }, { $sample: { size: n } }];
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

// -------------------------
// Stats
// -------------------------

exports.examStats = async (req, res) => {
  try {
    const { examId } = req.params;
    if (!toObjectId(examId)) return bad(res, "Invalid examId.");

    // by type
    const byType = await Question.aggregate([
      { $match: { exam: toObjectId(examId) } },
      { $group: { _id: "$question_type", count: { $sum: 1 } } },
    ]);

    // by difficulty
    const byDiff = await Question.aggregate([
      { $match: { exam: toObjectId(examId) } },
      { $group: { _id: "$difficultyLevel", count: { $sum: 1 } } },
    ]);

    // totals
    const totals = await Question.aggregate([
      { $match: { exam: toObjectId(examId) } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          totalMarks: { $sum: "$marks_alloted" },
        },
      },
    ]);

    // per section rollup
    const bySection = await Question.aggregate([
      { $match: { exam: toObjectId(examId) } },
      {
        $group: {
          _id: { section: "$section" },
          questions: { $sum: 1 },
          marks: { $sum: "$marks_alloted" },
        },
      },
      { $sort: { "_id.section": 1 } },
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
      bySection: bySection.map((s) => ({
        section: s._id.section || "",
        questions: s.questions,
        marks: s.marks,
      })),
    };
    return ok(res, out);
  } catch (e) {
    return fail(res, e);
  }
};

exports.quizStats = async (req, res) => {
  try {
    const { quizId } = req.params;
    if (!toObjectId(quizId)) return bad(res, "Invalid quizId.");

    const byType = await Question.aggregate([
      { $match: { quiz: toObjectId(quizId) } },
      { $group: { _id: "$question_type", count: { $sum: 1 } } },
    ]);

    const byDiff = await Question.aggregate([
      { $match: { quiz: toObjectId(quizId) } },
      { $group: { _id: "$difficultyLevel", count: { $sum: 1 } } },
    ]);

    const totals = await Question.aggregate([
      { $match: { quiz: toObjectId(quizId) } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          totalMarks: { $sum: "$marks_alloted" },
        },
      },
    ]);

    const bySection = await Question.aggregate([
      { $match: { quiz: toObjectId(quizId) } },
      {
        $group: {
          _id: { section: "$section" },
          questions: { $sum: 1 },
          marks: { $sum: "$marks_alloted" },
        },
      },
      { $sort: { "_id.section": 1 } },
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
      bySection: bySection.map((s) => ({
        section: s._id.section || "",
        questions: s.questions,
        marks: s.marks,
      })),
    };
    return ok(res, out);
  } catch (e) {
    return fail(res, e);
  }
};
