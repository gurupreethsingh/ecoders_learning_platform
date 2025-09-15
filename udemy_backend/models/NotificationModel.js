// udemy_backend/models/NotificationModel.js
const mongoose = require("mongoose");
const { Schema, model } = mongoose;

/**
 * Notification data model (no createdBy)
 * - Audience can be: all, roles, users, contextual
 * - Per-user deliveries tracked in NotificationDelivery
 */

const NOTIFY_STATUS = ["draft", "scheduled", "sending", "sent", "canceled"];
const PRIORITY = ["low", "normal", "high", "urgent"];
const CHANNELS = ["inapp", "email", "sms"];

const CATEGORIES = [
  "general",
  "exam",
  "result",
  "fees",
  "events",
  "attendance",
  "assignment",
  "system",
];

const AUDIENCE_TYPE = ["all", "roles", "users", "contextual"];

/** Contextual audience (use your own model names) */
const AudienceContextSchema = new Schema(
  {
    degree: { type: Schema.Types.ObjectId, ref: "Degree" },
    // Your code uses "Semester" elsewhere, keep that spelling here:
    semester: { type: Schema.Types.ObjectId, ref: "Semester" },
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    offering: { type: Schema.Types.ObjectId, ref: "CourseOffering" },
    section: { type: String },
    batchYear: { type: String },
  },
  { _id: false }
);

/** CTA buttons for in-app/email */
const CtaSchema = new Schema(
  {
    label: { type: String },
    url: { type: String },
  },
  { _id: false }
);

/** Main notification (NO createdBy) */
const NotificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true }, // plain text / markdown
    html: { type: String }, // optional rich HTML (email)

    category: {
      type: String,
      enum: CATEGORIES,
      default: "general",
      index: true,
    },
    priority: { type: String, enum: PRIORITY, default: "normal", index: true },
    channels: [{ type: String, enum: CHANNELS, default: "inapp" }],

    // If this is created by duplicating another
    resendOf: { type: Schema.Types.ObjectId, ref: "Notification" },

    // Audience
    audienceType: {
      type: String,
      enum: AUDIENCE_TYPE,
      required: true,
      index: true,
    },
    roles: [{ type: String, index: true }], // for audienceType="roles"
    users: [{ type: Schema.Types.ObjectId, ref: "User", index: true }], // for audienceType="users"
    context: AudienceContextSchema, // for audienceType="contextual"
    excludeUsers: [{ type: Schema.Types.ObjectId, ref: "User" }], // optional exclusions

    // Lifecycle
    status: {
      type: String,
      enum: NOTIFY_STATUS,
      default: "draft",
      index: true,
    },
    scheduledAt: { type: Date, index: true },
    sentAt: { type: Date, index: true },
    expiresAt: { type: Date, index: true },

    // Attachments (optional)
    attachments: [
      { name: String, url: String, mimeType: String, size: Number },
    ],

    // Action buttons
    ctas: [CtaSchema],

    // Tags for search
    tags: [{ type: String, index: true }],
  },
  { timestamps: true }
);

/** Helpful indexes */
NotificationSchema.index({ audienceType: 1, status: 1, scheduledAt: 1 });
NotificationSchema.index({ category: 1, priority: 1, createdAt: -1 });

/** Quick helper: is it currently visible in app feed? */
NotificationSchema.methods.isActiveForInApp = function () {
  if (this.status !== "sent") return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

/* ------------------------------------------------------------------ */
/* Per-user deliveries (receipts & channel state)                      */
/* ------------------------------------------------------------------ */

const DeliveryChannelState = new Schema(
  {
    channel: { type: String, enum: CHANNELS, required: true },
    deliveredAt: Date,
    failedAt: Date,
    failureReason: String,
  },
  { _id: false }
);

const NotificationDeliverySchema = new Schema(
  {
    notification: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // in-app read/dismiss
    seen: { type: Boolean, default: false, index: true },
    seenAt: { type: Date },
    dismissedAt: { type: Date },

    // email/sms channel states
    channels: [DeliveryChannelState],

    // audit
    lastSentAt: { type: Date },
    lastResentAt: { type: Date },
  },
  { timestamps: true }
);

// one doc per (notification,user)
NotificationDeliverySchema.index(
  { notification: 1, user: 1 },
  { unique: true }
);

NotificationDeliverySchema.methods.markSeen = function () {
  this.seen = true;
  this.seenAt = new Date();
  return this.save();
};

NotificationDeliverySchema.methods.markChannelDelivery = function (
  channel,
  ok,
  reason = null
) {
  const now = new Date();
  let entry = this.channels.find((c) => c.channel === channel);
  if (!entry) {
    entry = { channel };
    this.channels.push(entry);
  }
  if (ok) {
    entry.deliveredAt = now;
    entry.failedAt = undefined;
    entry.failureReason = undefined;
    this.lastSentAt = now;
  } else {
    entry.failedAt = now;
    entry.failureReason = reason || "Unknown";
  }
  return this.save();
};

const Notification = model("Notification", NotificationSchema);
const NotificationDelivery = model(
  "NotificationDelivery",
  NotificationDeliverySchema
);

module.exports = { Notification, NotificationDelivery };
