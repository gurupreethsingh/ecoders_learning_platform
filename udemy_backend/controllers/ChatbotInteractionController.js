// controllers/ChatbotInteractionController.js

const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");
const {
  ChatbotInteraction,
  RESPONSE_STATUS,
  CHANNEL,
} = require("../models/ChatbotInteractionModel");

const { Types } = mongoose;

/* -------------------------------------------------------------------------- */
/*                               Helper Utilities                             */
/* -------------------------------------------------------------------------- */

const ok = (res, data, meta = {}) => res.json({ ok: true, data, meta });
const bad = (res, message, code = "BAD_REQUEST", status = 400, extra = {}) =>
  res.status(status).json({ ok: false, code, message, ...extra });

const isNonEmpty = (v) =>
  v !== undefined && v !== null && String(v).trim() !== "";

const toObjectId = (v) => {
  try {
    if (!v) return null;
    return Types.ObjectId.isValid(String(v)) ? new Types.ObjectId(v) : null;
  } catch {
    return null;
  }
};

const boolFrom = (v, def = undefined) => {
  if (v === undefined) return def;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};

const numFrom = (v, def = undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const pick = (obj, keys) => {
  const o = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
  });
  return o;
};

function parsePaging(q) {
  const page = Math.max(1, numFrom(q.page, 1));
  const limit = Math.min(200, Math.max(1, numFrom(q.limit, 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function getSessionId(req) {
  // Try common places you may store it (customize as needed)
  return (
    req.headers["x-session-id"] ||
    req.cookies?.sessionId ||
    req.query?.sessionId ||
    req.body?.sessionId ||
    undefined
  );
}

function getChannel(req) {
  const ch = req.headers["x-channel"] || req.query.channel || "widget";
  return CHANNEL.includes(ch) ? ch : "widget";
}

function safeSort(q) {
  // Whitelist: add more fields if needed
  const whitelist = new Set([
    "createdAt",
    "updatedAt",
    "askedAt",
    "respondedAt",
    "responseTimeMs",
    "response.status",
    "isResolved",
    "isEscalated",
  ]);
  const sort = {};
  const sortParam = q.sort || "-createdAt";
  const parts = String(sortParam).split(",");
  for (const p of parts) {
    const key = p.startsWith("-") ? p.slice(1) : p;
    if (whitelist.has(key)) {
      sort[key] = p.startsWith("-") ? -1 : 1;
    }
  }
  if (Object.keys(sort).length === 0) sort.createdAt = -1;
  return sort;
}

function buildFilter(q) {
  const f = {};

  // Text search
  if (isNonEmpty(q.q)) {
    f.$text = { $search: String(q.q) };
  }

  // IDs / user
  if (isNonEmpty(q.user)) {
    const uid = toObjectId(q.user);
    if (uid) f.user = uid;
    else f.user = null; // allow filtering guests explicitly: user=null
  }

  // Booleans
  const auth = boolFrom(q.isAuthenticated);
  if (auth !== undefined) f.isAuthenticated = auth;

  const isResolved = boolFrom(q.isResolved);
  if (isResolved !== undefined) f.isResolved = isResolved;

  const isEscalated = boolFrom(q.isEscalated);
  if (isEscalated !== undefined) f.isEscalated = isEscalated;

  // Status, role, channel
  if (isNonEmpty(q.status) && RESPONSE_STATUS.includes(q.status))
    f["response.status"] = q.status;

  if (isNonEmpty(q.userRole)) f.userRole = String(q.userRole);
  if (isNonEmpty(q.channel) && CHANNEL.includes(q.channel))
    f["meta.channel"] = q.channel;

  // Latency filters (ms)
  const minLat = numFrom(q.minLatencyMs);
  const maxLat = numFrom(q.maxLatencyMs);
  if (minLat !== undefined || maxLat !== undefined) {
    f["response.latencyMs"] = {};
    if (minLat !== undefined) f["response.latencyMs"].$gte = minLat;
    if (maxLat !== undefined) f["response.latencyMs"].$lte = maxLat;
  }

  // Date range filters (UTC ISO strings)
  const after = isNonEmpty(q.after) ? new Date(q.after) : null;
  const before = isNonEmpty(q.before) ? new Date(q.before) : null;
  if (after || before) {
    f.createdAt = {};
    if (after) f.createdAt.$gte = after;
    if (before) f.createdAt.$lte = before;
  }

  // Has feedback?
  const hasFeedback = q.hasFeedback;
  if (hasFeedback !== undefined) {
    const b = boolFrom(hasFeedback);
    if (b === true) {
      f.$or = [
        { "feedback.thumb": { $ne: "none" } },
        { "feedback.comment": { $exists: true, $ne: "" } },
      ];
    } else if (b === false) {
      f["feedback.thumb"] = "none";
      f.$or = [{ "feedback.comment": { $exists: false } }, { "feedback.comment": "" }];
    }
  }

  return f;
}

function getClientIp(req) {
  // Trust upstream proxy only if your app is configured with `app.set('trust proxy', true)`
  const xff = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.ip || req.connection?.remoteAddress || undefined;
}

/* -------------------------------------------------------------------------- */
/*                               Core Operations                              */
/* -------------------------------------------------------------------------- */

/**
 * Log a new interaction in one go (question + response).
 * Use this endpoint after your AI has responded, or when you already have the response on hand.
 * Handles logged-in and guest users seamlessly.
 */
async function logInteraction(req, res) {
  try {
    const userId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    const isAuthenticated = Boolean(req.user?._id);
    const sessionId = getSessionId(req);
    const channel = getChannel(req);
    const ipHash = ChatbotInteraction.hashIp(getClientIp(req));

    const {
      // Question
      questionText,
      questionLanguage = "en",
      questionContentType = "text",
      questionTags = [],

      // Response
      responseText = "",
      responseContentType = "text",
      responseStatus, // "good" | "average" | ...
      model,
      modelVersion,
      promptTokens,
      completionTokens,
      totalTokens,

      // flags
      isResolved = false,
      isEscalated = false,
      escalatedTo,
      escalationNotes,

      // optional times, otherwise computed in pre-save
      askedAt,
      respondedAt,

      // meta
      pageUrl,
      referrer,
      pathname,
      userAgent,
      locale,
      appVersion,
      extras,
      userRole,
    } = req.body || {};

    if (!isNonEmpty(questionText)) {
      return bad(res, "questionText is required");
    }

    const doc = new ChatbotInteraction({
      user: userId || null,
      userRole: userRole || undefined,
      isAuthenticated,

      question: {
        text: String(questionText),
        language: String(questionLanguage || "en"),
        contentType: questionContentType,
        tags: Array.isArray(questionTags) ? questionTags : [],
      },

      response: {
        text: String(responseText || ""),
        contentType: responseContentType,
        status: responseStatus, // pre-save hooks will default if missing
        model,
        modelVersion,
        promptTokens: numFrom(promptTokens),
        completionTokens: numFrom(completionTokens),
        totalTokens: numFrom(totalTokens),
      },

      askedAt: askedAt ? new Date(askedAt) : undefined,
      respondedAt: respondedAt ? new Date(respondedAt) : undefined,

      isResolved: Boolean(isResolved),
      isEscalated: Boolean(isEscalated),
      escalatedTo: toObjectId(escalatedTo),
      escalationNotes,

      meta: {
        sessionId,
        channel,
        pageUrl,
        referrer,
        pathname,
        userAgent: userAgent || req.headers["user-agent"],
        locale,
        ipHash,
        appVersion,
        extras,
      },
    });

    await doc.save();
    return ok(res, doc);
  } catch (err) {
    console.error("logInteraction error:", err);
    return bad(res, err.message || "Failed to log interaction", "LOG_FAIL", 500);
  }
}

/**
 * Start an interaction (question only). Returns interaction _id.
 * Later, call `attachResponse` with that _id to complete it.
 */
async function startInteraction(req, res) {
  try {
    const userId = req.user?._id ? new Types.ObjectId(req.user._id) : null;
    const isAuthenticated = Boolean(req.user?._id);
    const sessionId = getSessionId(req);
    const channel = getChannel(req);
    const ipHash = ChatbotInteraction.hashIp(getClientIp(req));

    const { questionText, questionLanguage = "en", questionContentType = "text", questionTags = [], userRole } =
      req.body || {};

    if (!isNonEmpty(questionText)) return bad(res, "questionText is required");

    const doc = new ChatbotInteraction({
      user: userId || null,
      userRole,
      isAuthenticated,
      question: {
        text: String(questionText),
        language: String(questionLanguage || "en"),
        contentType: questionContentType,
        tags: Array.isArray(questionTags) ? questionTags : [],
      },
      askedAt: new Date(),
      meta: {
        sessionId,
        channel,
        pageUrl: req.body?.pageUrl,
        referrer: req.body?.referrer,
        pathname: req.body?.pathname,
        userAgent: req.headers["user-agent"],
        locale: req.body?.locale,
        ipHash,
        appVersion: req.body?.appVersion,
        extras: req.body?.extras,
      },
    });

    await doc.save();
    return ok(res, { _id: doc._id, askedAt: doc.askedAt });
  } catch (err) {
    console.error("startInteraction error:", err);
    return bad(res, err.message || "Failed to start interaction", "START_FAIL", 500);
  }
}

/**
 * Attach/Update the AI response on an existing interaction.
 */
async function attachResponse(req, res) {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return bad(res, "Invalid interaction id");

    const {
      responseText = "",
      responseContentType = "text",
      responseStatus,
      model,
      modelVersion,
      promptTokens,
      completionTokens,
      totalTokens,
      respondedAt, // optional override
      isResolved,
      isEscalated,
      escalatedTo,
      escalationNotes,
    } = req.body || {};

    const doc = await ChatbotInteraction.findById(id);
    if (!doc) return bad(res, "Interaction not found", "NOT_FOUND", 404);

    doc.response = {
      ...(doc.response || {}),
      text: String(responseText || ""),
      contentType: responseContentType,
      status: responseStatus || doc.response?.status,
      model: model ?? doc.response?.model,
      modelVersion: modelVersion ?? doc.response?.modelVersion,
      promptTokens: numFrom(promptTokens, doc.response?.promptTokens),
      completionTokens: numFrom(completionTokens, doc.response?.completionTokens),
      totalTokens: numFrom(totalTokens, doc.response?.totalTokens),
    };

    if (!doc.respondedAt) doc.respondedAt = respondedAt ? new Date(respondedAt) : new Date();
    if (isResolved !== undefined) doc.isResolved = Boolean(isResolved);
    if (isEscalated !== undefined) doc.isEscalated = Boolean(isEscalated);
    if (escalatedTo !== undefined) doc.escalatedTo = toObjectId(escalatedTo);
    if (escalationNotes !== undefined) doc.escalationNotes = escalationNotes;

    await doc.save();
    return ok(res, doc);
  } catch (err) {
    console.error("attachResponse error:", err);
    return bad(res, err.message || "Failed to attach response", "ATTACH_FAIL", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                             Query / Read Operations                        */
/* -------------------------------------------------------------------------- */

async function getById(req, res) {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await ChatbotInteraction.findById(id);
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    console.error("getById error:", err);
    return bad(res, err.message || "Failed to fetch", "READ_FAIL", 500);
  }
}

async function list(req, res) {
  try {
    const filter = buildFilter(req.query);
    const sort = safeSort(req.query);
    const { limit, skip, page } = parsePaging(req.query);

    const [items, total] = await Promise.all([
      ChatbotInteraction.find(filter).sort(sort).skip(skip).limit(limit),
      ChatbotInteraction.countDocuments(filter),
    ]);

    return ok(res, items, { total, page, limit });
  } catch (err) {
    console.error("list error:", err);
    return bad(res, err.message || "Failed to list", "LIST_FAIL", 500);
  }
}

async function textSearch(req, res) {
  try {
    if (!isNonEmpty(req.query.q)) return bad(res, "q is required");
    const filter = buildFilter(req.query); // already uses $text
    const { limit, skip, page } = parsePaging(req.query);
    const sort = safeSort(req.query);

    const items = await ChatbotInteraction.find(filter, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" }, ...sort })
      .skip(skip)
      .limit(limit);

    const total = await ChatbotInteraction.countDocuments(filter);
    return ok(res, items, { total, page, limit });
  } catch (err) {
    console.error("textSearch error:", err);
    return bad(res, err.message || "Search failed", "SEARCH_FAIL", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Analytics / Counts                           */
/* -------------------------------------------------------------------------- */

async function countByStatus(req, res) {
  try {
    const filter = buildFilter(req.query);
    const agg = await ChatbotInteraction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$response.status",
          count: { $sum: 1 },
          avgLatency: { $avg: "$response.latencyMs" },
        },
      },
      { $project: { status: "$_id", count: 1, avgLatency: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    return ok(res, agg);
  } catch (err) {
    console.error("countByStatus error:", err);
    return bad(res, err.message || "Failed", "COUNT_FAIL", 500);
  }
}

async function countDaily(req, res) {
  try {
    const filter = buildFilter(req.query);
    const tz = req.query.tz || "UTC"; // optional, for $dateTrunc
    const field = req.query.field === "respondedAt" ? "$respondedAt" : "$askedAt";

    const agg = await ChatbotInteraction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            day: { $dateTrunc: { date: field, unit: "day", timezone: tz } },
          },
          total: { $sum: 1 },
          avgLatency: { $avg: "$response.latencyMs" },
        },
      },
      { $project: { date: "$_id.day", total: 1, avgLatency: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
    return ok(res, agg);
  } catch (err) {
    console.error("countDaily error:", err);
    return bad(res, err.message || "Failed", "COUNT_FAIL", 500);
  }
}

async function countByChannel(req, res) {
  try {
    const filter = buildFilter(req.query);
    const agg = await ChatbotInteraction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$meta.channel",
          count: { $sum: 1 },
        },
      },
      { $project: { channel: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    return ok(res, agg);
  } catch (err) {
    console.error("countByChannel error:", err);
    return bad(res, err.message || "Failed", "COUNT_FAIL", 500);
  }
}

async function avgResponseTime(req, res) {
  try {
    const filter = buildFilter(req.query);
    const agg = await ChatbotInteraction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgLatency: { $avg: "$response.latencyMs" },
          p50: { $percentile: { p: [0.5], input: "$response.latencyMs" } },
          p90: { $percentile: { p: [0.9], input: "$response.latencyMs" } },
          p99: { $percentile: { p: [0.99], input: "$response.latencyMs" } },
          total: { $sum: 1 },
        },
      },
    ]);
    return ok(res, agg[0] || { avgLatency: 0, total: 0 });
  } catch (err) {
    console.error("avgResponseTime error:", err);
    return bad(res, err.message || "Failed", "COUNT_FAIL", 500);
  }
}

async function topQuestions(req, res) {
  try {
    const filter = buildFilter(req.query);
    const limit = Math.min(100, Math.max(1, numFrom(req.query.limit, 20)));
    const agg = await ChatbotInteraction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$question.text",
          count: { $sum: 1 },
          lastAt: { $max: "$createdAt" },
          avgLatency: { $avg: "$response.latencyMs" },
        },
      },
      { $sort: { count: -1, lastAt: -1 } },
      { $limit: limit },
      {
        $project: {
          question: "$_id",
          count: 1,
          lastAt: 1,
          avgLatency: 1,
          _id: 0,
        },
      },
    ]);
    return ok(res, agg);
  } catch (err) {
    console.error("topQuestions error:", err);
    return bad(res, err.message || "Failed", "COUNT_FAIL", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                          Feedback / Moderation Actions                      */
/* -------------------------------------------------------------------------- */

async function rateInteraction(req, res) {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");

    const rating = numFrom(req.body.rating);
    if (!(rating >= 1 && rating <= 5)) return bad(res, "rating must be 1..5");

    const thumb = req.body.thumb; // "up" | "down" | "none"
    const comment = req.body.comment;

    const update = {};
    if (!update.feedback) update.feedback = {};
    update.feedback = {
      thumb: ["up", "down", "none"].includes(thumb) ? thumb : "none",
      comment: comment || "",
    };

    const doc = await ChatbotInteraction.findByIdAndUpdate(
      id,
      { $set: { "response.rating": rating, feedback: update.feedback } },
      { new: true }
    );

    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    console.error("rateInteraction error:", err);
    return bad(res, err.message || "Failed", "RATE_FAIL", 500);
  }
}

async function markResolved(req, res) {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const doc = await ChatbotInteraction.findByIdAndUpdate(
      id,
      { $set: { isResolved: true } },
      { new: true }
    );
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    console.error("markResolved error:", err);
    return bad(res, err.message || "Failed", "RESOLVE_FAIL", 500);
  }
}

async function escalate(req, res) {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return bad(res, "Invalid id");
    const { escalatedTo, escalationNotes } = req.body || {};
    const doc = await ChatbotInteraction.findByIdAndUpdate(
      id,
      {
        $set: {
          isEscalated: true,
          escalatedTo: toObjectId(escalatedTo),
          escalationNotes,
        },
      },
      { new: true }
    );
    if (!doc) return bad(res, "Not found", "NOT_FOUND", 404);
    return ok(res, doc);
  } catch (err) {
    console.error("escalate error:", err);
    return bad(res, err.message || "Failed", "ESCALATE_FAIL", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                                Bulk Operations                             */
/* -------------------------------------------------------------------------- */

async function bulkUpdateStatus(req, res) {
  try {
    const ids = (req.body.ids || []).map(toObjectId).filter(Boolean);
    if (!ids.length) return bad(res, "ids[] required");
    const status = req.body.status;
    if (!RESPONSE_STATUS.includes(status)) return bad(res, "Invalid status");
    const r = await ChatbotInteraction.updateMany(
      { _id: { $in: ids } },
      { $set: { "response.status": status } }
    );
    return ok(res, { matched: r.matchedCount ?? r.nMatched, modified: r.modifiedCount ?? r.nModified });
  } catch (err) {
    console.error("bulkUpdateStatus error:", err);
    return bad(res, err.message || "Failed", "BULK_FAIL", 500);
  }
}

async function bulkDelete(req, res) {
  try {
    const ids = (req.body.ids || []).map(toObjectId).filter(Boolean);
    if (!ids.length) return bad(res, "ids[] required");
    const r = await ChatbotInteraction.deleteMany({ _id: { $in: ids } });
    return ok(res, { deleted: r.deletedCount || 0 });
  } catch (err) {
    console.error("bulkDelete error:", err);
    return bad(res, err.message || "Failed", "BULK_FAIL", 500);
  }
}

async function bulkSetResolved(req, res) {
  try {
    const ids = (req.body.ids || []).map(toObjectId).filter(Boolean);
    if (!ids.length) return bad(res, "ids[] required");
    const r = await ChatbotInteraction.updateMany(
      { _id: { $in: ids } },
      { $set: { isResolved: true } }
    );
    return ok(res, { matched: r.matchedCount ?? r.nMatched, modified: r.modifiedCount ?? r.nModified });
  } catch (err) {
    console.error("bulkSetResolved error:", err);
    return bad(res, err.message || "Failed", "BULK_FAIL", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */

async function exportCSV(req, res) {
  try {
    const filter = buildFilter(req.query);

    // Optional field customization: ?fields=_id,createdAt,question.text,response.text
    const fields =
      isNonEmpty(req.query.fields) && Array.isArray(req.query.fields.split(","))
        ? req.query.fields.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

    // If limit is provided for safety (large exports -> file streaming)
    const limit = numFrom(req.query.limit);
    const options = {};
    if (fields) options.fields = fields;
    if (limit) options.limit = limit;

    // Choose strategy: stream to temp file, then pipe to client
    const tmpDir = path.join(os.tmpdir(), "chatbot-exports");
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileName = `chatbot_export_${Date.now()}.csv`;
    const filePath = path.join(tmpDir, fileName);

    const result = await ChatbotInteraction.exportToCSVFile(filePath, filter, options);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const readStream = fs.createReadStream(result.path, { encoding: "utf8" });
    readStream.on("error", (err) => {
      console.error("exportCSV read error:", err);
      return bad(res, "Failed to read export file", "EXPORT_READ_FAIL", 500);
    });
    readStream.pipe(res);
  } catch (err) {
    console.error("exportCSV error:", err);
    return bad(res, err.message || "Export failed", "EXPORT_FAIL", 500);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */
/* Example Express routes mapping (put this in your routes file):
   const ctrl = require("../controllers/ChatbotInteractionController");
   router.post("/chatbot/log", ctrl.logInteraction);                   // log question + response at once
   router.post("/chatbot/start", ctrl.startInteraction);               // create question-only record
   router.post("/chatbot/:id/attach-response", ctrl.attachResponse);   // attach/update response
   router.get("/chatbot/:id", ctrl.getById);
   router.get("/chatbot", ctrl.list);                                  // filters/sort/paging
   router.get("/chatbot/search", ctrl.textSearch);                     // text search
   router.get("/chatbot/count/status", ctrl.countByStatus);
   router.get("/chatbot/count/daily", ctrl.countDaily);
   router.get("/chatbot/count/channel", ctrl.countByChannel);
   router.get("/chatbot/metrics/latency", ctrl.avgResponseTime);
   router.get("/chatbot/top-questions", ctrl.topQuestions);
   router.post("/chatbot/:id/rate", ctrl.rateInteraction);
   router.post("/chatbot/:id/resolve", ctrl.markResolved);
   router.post("/chatbot/:id/escalate", ctrl.escalate);
   router.post("/chatbot/bulk/status", ctrl.bulkUpdateStatus);
   router.post("/chatbot/bulk/resolve", ctrl.bulkSetResolved);
   router.post("/chatbot/bulk/delete", ctrl.bulkDelete);
   router.get("/chatbot/export.csv", ctrl.exportCSV);
*/

module.exports = {
  // create / update
  logInteraction,
  startInteraction,
  attachResponse,

  // read / search
  getById,
  list,
  textSearch,

  // analytics
  countByStatus,
  countDaily,
  countByChannel,
  avgResponseTime,
  topQuestions,

  // feedback / moderation
  rateInteraction,
  markResolved,
  escalate,

  // bulk ops
  bulkUpdateStatus,
  bulkDelete,
  bulkSetResolved,

  // export
  exportCSV,
};
