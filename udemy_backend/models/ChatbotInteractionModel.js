// models/ChatbotModel.js
// Mongoose schema for storing chatbot Q&A sessions + CSV export helper

const mongoose = require("mongoose");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { Schema, Types } = mongoose;

/* ------------------------------ Enums/Consts ------------------------------ */
const RESPONSE_STATUS = Object.freeze([
  "good",
  "average",
  "bad",
  "no_response",
  "escalated",
  "fallback",
]);

const CHANNEL = Object.freeze(["web", "mobile", "api", "widget"]);
const CONTENT_TYPE = Object.freeze(["text", "markdown", "html"]);

/* ------------------------------ Sub-schemas ------------------------------- */
const QuestionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    language: { type: String, trim: true, default: "en" },
    contentType: { type: String, enum: CONTENT_TYPE, default: "text" },
    tags: [{ type: String, trim: true }], // optional topic tags inferred on ingest
  },
  { _id: false }
);

const ResponseSchema = new Schema(
  {
    text: { type: String, trim: true, default: "" },
    contentType: { type: String, enum: CONTENT_TYPE, default: "text" },
    status: { type: String, enum: RESPONSE_STATUS, default: "no_response", index: true },
    // Model/LLM telemetry (optional)
    model: { type: String, trim: true }, // e.g., "gpt-5"
    modelVersion: { type: String, trim: true }, // e.g., "2025-09-01"
    promptTokens: { type: Number, min: 0 },
    completionTokens: { type: Number, min: 0 },
    totalTokens: { type: Number, min: 0 },
    // Timing
    latencyMs: { type: Number, min: 0 }, // computed from askedAt/respondedAt
    // Quality signals
    sentiment: { type: String, trim: true }, // "pos/neg/neu" (posthoc)
    rating: { type: Number, min: 1, max: 5 }, // optional user rating
    errorCode: { type: String, trim: true }, // if failed (timeouts, 5xx, etc)
    errorMessage: { type: String, trim: true },
  },
  { _id: false }
);

const FeedbackSchema = new Schema(
  {
    // user feedback (optional, can be filled later from UI)
    thumb: { type: String, enum: ["up", "down", "none"], default: "none" },
    comment: { type: String, trim: true },
    correctedAnswer: { type: String, trim: true }, // optional human correction
    reviewedBy: { type: Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: false }
);

const MetaSchema = new Schema(
  {
    sessionId: { type: String, index: true }, // per-visitor session or per-login
    channel: { type: String, enum: CHANNEL, default: "widget", index: true },
    pageUrl: { type: String, trim: true },
    referrer: { type: String, trim: true },
    pathname: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    locale: { type: String, trim: true }, // e.g., "en-IN"
    // To stay privacy-friendly, store only a salted hash of IP (do NOT store raw IP)
    ipHash: { type: String, index: true },
    // App versioning
    appVersion: { type: String, trim: true },
    // Arbitrary extra context
    extras: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/* --------------------------------- Main ---------------------------------- */
const ChatbotInteractionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", index: true, default: null }, // nullable (guest)
    userRole: { type: String, trim: true }, // store role string for analytics (e.g., "student", "admin")
    isAuthenticated: { type: Boolean, default: false },

    question: { type: QuestionSchema, required: true },
    response: { type: ResponseSchema, default: () => ({}) },

    // Timestamps for the interaction lifecycle
    askedAt: { type: Date, default: Date.now, index: true },
    respondedAt: { type: Date }, // set when response.text is available

    // Persisted response time (ms). Also computed if missing.
    responseTimeMs: { type: Number, min: 0 },

    // Resolution/escalation
    isResolved: { type: Boolean, default: false, index: true },
    isEscalated: { type: Boolean, default: false, index: true },
    escalatedTo: { type: Types.ObjectId, ref: "User", default: null },
    escalationNotes: { type: String, trim: true },

    // Post-conversation feedback
    feedback: { type: FeedbackSchema, default: () => ({}) },

    // Meta / analytics / privacy-friendly context
    meta: { type: MetaSchema, default: () => ({}) },
  },
  {
    timestamps: true, // createdAt / updatedAt
    collection: "chatbot_interactions",
  }
);

/* --------------------------------- Indexes -------------------------------- */
ChatbotInteractionSchema.index({ "question.text": "text", "response.text": "text" }, { name: "chatbot_text_index" });
ChatbotInteractionSchema.index({ createdAt: -1 });
ChatbotInteractionSchema.index({ isResolved: 1, updatedAt: -1 });
ChatbotInteractionSchema.index({ "response.status": 1, createdAt: -1 });

/* ------------------------------- Middleware -------------------------------- */
// Compute response timing + default status if not provided
ChatbotInteractionSchema.pre("save", function (next) {
  try {
    // default status if missing and no response text
    if (!this.response || !this.response.status) {
      this.response = this.response || {};
      this.response.status = this.response.text ? "good" : "no_response";
    }

    // Ensure respondedAt if we have a response text but no respondedAt
    if (this.response && this.response.text && !this.respondedAt) {
      this.respondedAt = new Date();
    }

    // Compute latency
    const start = this.askedAt ? new Date(this.askedAt).getTime() : null;
    const end = this.respondedAt ? new Date(this.respondedAt).getTime() : null;
    if (start && end && end >= start) {
      const latency = end - start;
      this.responseTimeMs = typeof this.responseTimeMs === "number" ? this.responseTimeMs : latency;
      if (!this.response.latencyMs) this.response.latencyMs = latency;
    }

    next();
  } catch (err) {
    next(err);
  }
});

/* --------------------------------- Methods -------------------------------- */
// Privacy-safe IP hashing helper (you can call this before save)
ChatbotInteractionSchema.statics.hashIp = function hashIp(ip) {
  if (!ip) return undefined;
  const salt = process.env.CHATBOT_IP_SALT || "rotate-this-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
};

// Stream/large-safe CSV exporter (writes file to disk)
// Usage: await Chatbot.exportToCSVFile("./exports/chatbot_logs.csv", { isEscalated: false })
ChatbotInteractionSchema.statics.exportToCSVFile = async function exportToCSVFile(
  filePath,
  filter = {},
  options = {}
) {
  const Chatbot = this;
  const limit = options.limit || 100000; // safety cap
  const projection = options.projection || null;
  const delimiter = options.delimiter || ",";

  // Default fields (add/remove as you like)
  const fields = options.fields || [
    "_id",
    "createdAt",
    "updatedAt",
    "user",
    "userRole",
    "isAuthenticated",
    "question.text",
    "question.language",
    "question.contentType",
    "response.text",
    "response.contentType",
    "response.status",
    "response.model",
    "response.modelVersion",
    "response.promptTokens",
    "response.completionTokens",
    "response.totalTokens",
    "response.latencyMs",
    "askedAt",
    "respondedAt",
    "responseTimeMs",
    "isResolved",
    "isEscalated",
    "escalatedTo",
    "feedback.thumb",
    "feedback.comment",
    "meta.sessionId",
    "meta.channel",
    "meta.pageUrl",
    "meta.referrer",
    "meta.pathname",
    "meta.userAgent",
    "meta.locale",
    "meta.ipHash",
    "meta.appVersion",
  ];

  // Ensure directory exists
  const absPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });

  const writeStream = fs.createWriteStream(absPath, { encoding: "utf8" });

  // Write header
  writeStream.write(fields.join(delimiter) + "\n");

  // Cursor for memory-safe export
  const cursor = Chatbot.find(filter, projection).sort({ _id: 1 }).limit(limit).cursor();

  let count = 0;
  for await (const doc of cursor) {
    const row = fields.map((f) => {
      const val = getDeep(doc, f);
      return csvEscape(val, delimiter);
    });
    writeStream.write(row.join(delimiter) + "\n");
    count++;
  }

  await new Promise((res, rej) => {
    writeStream.end(() => res());
    writeStream.on("error", rej);
  });

  return { path: absPath, rows: count, fields };
};

// Simple helper: export as CSV string (small datasets)
ChatbotInteractionSchema.statics.exportToCSVString = async function exportToCSVString(
  filter = {},
  options = {}
) {
  const Chatbot = this;
  const delimiter = options.delimiter || ",";
  const fields = options.fields || [
    "_id",
    "createdAt",
    "updatedAt",
    "user",
    "userRole",
    "isAuthenticated",
    "question.text",
    "response.text",
    "response.status",
    "response.latencyMs",
    "response.totalTokens",
    "askedAt",
    "respondedAt",
    "responseTimeMs",
    "isResolved",
    "isEscalated",
    "meta.pageUrl",
    "meta.sessionId",
  ];

  const docs = await Chatbot.find(filter).limit(options.limit || 5000).lean();
  const header = fields.join(delimiter);
  const lines = docs.map((d) => fields.map((f) => csvEscape(getDeep(d, f), delimiter)).join(delimiter));
  return [header].concat(lines).join("\n");
};

/* ------------------------------ Util functions ---------------------------- */
function getDeep(obj, pathStr) {
  try {
    return pathStr.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  } catch {
    return undefined;
  }
}

function csvEscape(value, delimiter) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  const needsQuote = s.includes(delimiter) || s.includes("\n") || s.includes("\r") || s.includes('"');
  if (needsQuote) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* --------------------------------- Export --------------------------------- */
const ChatbotInteraction = mongoose.model("ChatbotInteraction", ChatbotInteractionSchema);

module.exports = {
  ChatbotInteraction,
  RESPONSE_STATUS,
  CHANNEL,
  CONTENT_TYPE,
};
