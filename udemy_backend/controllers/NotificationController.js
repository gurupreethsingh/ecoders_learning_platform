const mongoose = require("mongoose");
const {
  Notification,
  NotificationDelivery,
} = require("../models/NotificationModel.js");
const User = require("../models/UserModel.js");

/* ---------------------------------------
 * Helpers
 * -------------------------------------*/
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const requireSuperadmin = (req) => {
  if (!req.user || req.user.role !== "superadmin") {
    const err = new Error("Only superadmin is allowed to perform this action.");
    err.status = 403;
    throw err;
  }
};

const toObjectId = (id) =>
  typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;

const assertMeOr401 = (req) => {
  if (!req.user || !req.user._id) {
    const err = new Error("Unauthorized: missing or invalid token");
    err.status = 401;
    throw err;
  }
  return toObjectId(req.user._id);
};

/**
 * Try to run `work(session)` inside a Mongo transaction.
 * If the Mongo server is standalone (no replica set), fall back to running
 * the same work without a session/transaction.
 */
async function runWithOptionalTxn(work) {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const out = await work(session);
    await session.commitTransaction();
    return out;
  } catch (err) {
    // Fallback if transactions aren't supported on this server
    const msg = String(err?.message || "");
    const notReplica =
      /Transaction numbers are only allowed on a replica set member or mongos/i.test(
        msg
      );
    if (notReplica) {
      try {
        if (session?.inTransaction()) await session.abortTransaction();
      } catch (_) {}
      try {
        session?.endSession();
      } catch (_) {}
      // Re-run the same logic WITHOUT a transaction/session
      return work(null);
    }
    // Other errors: clean up and rethrow
    try {
      if (session?.inTransaction()) await session.abortTransaction();
    } catch (_) {}
    try {
      session?.endSession();
    } catch (_) {}
    throw err;
  } finally {
    try {
      session?.endSession();
    } catch (_) {}
  }
}

/** Build a flexible filter from query params for Notification find() */
function buildNotificationFilter(q = {}) {
  const filter = {};

  if (q.q) {
    filter.$or = [
      { title: { $regex: q.q, $options: "i" } },
      { message: { $regex: q.q, $options: "i" } },
      { tags: { $regex: q.q, $options: "i" } },
    ];
  }

  if (q.status) filter.status = { $in: String(q.status).split(",") };
  if (q.category) filter.category = { $in: String(q.category).split(",") };
  if (q.priority) filter.priority = { $in: String(q.priority).split(",") };
  if (q.audienceType)
    filter.audienceType = { $in: String(q.audienceType).split(",") };
  if (q.channel) filter.channels = { $in: String(q.channel).split(",") };
  if (q.roles) filter.roles = { $in: String(q.roles).split(",") };
  if (q.tag) filter.tags = { $in: String(q.tag).split(",") };

  // date ranges
  const dateRange = {};
  if (q.since) dateRange.$gte = new Date(q.since);
  if (q.until) dateRange.$lte = new Date(q.until);
  if (Object.keys(dateRange).length) {
    const dateField = q.dateField || "createdAt"; // createdAt | scheduledAt | sentAt | expiresAt
    filter[dateField] = dateRange;
  }

  // contextual targeting filters (exact matches)
  if (q.context_degree) filter["context.degree"] = toObjectId(q.context_degree);
  if (q.context_semester)
    filter["context.semester"] = toObjectId(q.context_semester);
  if (q.context_course) filter["context.course"] = toObjectId(q.context_course);
  if (q.context_offering)
    filter["context.offering"] = toObjectId(q.context_offering);
  if (q.context_section) filter["context.section"] = q.context_section;
  if (q.context_batchYear) filter["context.batchYear"] = q.context_batchYear;

  return filter;
}

/** Build sort spec: ?sort=-createdAt,priority (minus = desc) */
function parseSort(sortStr) {
  if (!sortStr) return { createdAt: -1 };
  const parts = String(sortStr).split(",");
  const sort = {};
  parts.forEach((p) => {
    p = p.trim();
    if (!p) return;
    if (p.startsWith("-")) sort[p.slice(1)] = -1;
    else sort[p] = 1;
  });
  return sort;
}

/** Resolve audience to a set of userIds based on the notification doc */
async function resolveAudienceUsers(notification) {
  const exclude = new Set((notification.excludeUsers || []).map(String));

  if (notification.audienceType === "all") {
    const users = await User.find({}, { _id: 1 }).lean();
    return users.map((u) => u._id).filter((id) => !exclude.has(String(id)));
  }

  if (notification.audienceType === "roles") {
    if (!notification.roles?.length) return [];
    const users = await User.find(
      { role: { $in: notification.roles } },
      { _id: 1 }
    ).lean();
    return users.map((u) => u._id).filter((id) => !exclude.has(String(id)));
  }

  if (notification.audienceType === "users") {
    return (notification.users || []).filter((id) => !exclude.has(String(id)));
  }

  if (notification.audienceType === "contextual") {
    const users = await resolveContextUsers(notification.context || {});
    return users.filter((id) => !exclude.has(String(id)));
  }

  return [];
}

/** Example contextual audience resolver. Adjust to your User schema. */
async function resolveContextUsers(context) {
  const filter = {};
  if (context.degree) filter["degree"] = toObjectId(context.degree);
  if (context.semester) filter["semester"] = toObjectId(context.semester);
  if (context.course) filter["course"] = toObjectId(context.course);
  if (context.section) filter["section"] = context.section;
  if (context.batchYear) filter["batchYear"] = context.batchYear;

  if (!Object.keys(filter).length) return [];
  const users = await User.find(filter, { _id: 1 }).lean();
  return users.map((u) => u._id);
}

/** Upsert NotificationDelivery docs for provided userIds */
async function ensureDeliveries(notificationId, userIds, session = null) {
  if (!userIds?.length) return { upserted: 0, existing: 0 };

  const ops = userIds.map((uid) => ({
    updateOne: {
      filter: { notification: notificationId, user: uid },
      update: { $setOnInsert: { notification: notificationId, user: uid } },
      upsert: true,
    },
  }));

  const result = await NotificationDelivery.bulkWrite(ops, { session });
  const upserted = result?.upsertedCount || 0;
  const existing = userIds.length - upserted;
  return { upserted, existing };
}

/* ---------------------------------------
 * CRUD
 * -------------------------------------*/
exports.create = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const payload = { ...req.body };
  delete payload.resendOf;
  if (!payload.status) payload.status = "draft";
  const doc = await Notification.create(payload);
  res.status(201).json({ data: doc });
});

exports.getById = asyncHandler(async (req, res) => {
  const doc = await Notification.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ data: doc });
});

exports.update = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const doc = await Notification.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const changes = { ...req.body };
  if (doc.status === "sent") {
    const allowed = ["tags", "attachments", "priority", "expiresAt"];
    const safe = {};
    for (const k of allowed) if (k in changes) safe[k] = changes[k];
    Object.assign(doc, safe);
  } else {
    Object.assign(doc, changes);
  }
  await doc.save();
  res.json({ data: doc });
});

exports.remove = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const id = req.params.id;
  await Notification.findByIdAndDelete(id);
  await NotificationDelivery.deleteMany({ notification: id });
  res.json({ ok: true });
});

exports.list = asyncHandler(async (req, res) => {
  const filter = buildNotificationFilter(req.query);
  const sort = parseSort(req.query.sort);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10), 1),
    200
  );

  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/* ---------------------------------------
 * Counts & analytics
 * -------------------------------------*/
exports.countAll = asyncHandler(async (_req, res) => {
  const total = await Notification.countDocuments();
  res.json({ total });
});

exports.countByStatus = asyncHandler(async (_req, res) => {
  const agg = await Notification.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $project: { status: "$_id", count: 1, _id: 0 } },
  ]);
  res.json({ data: agg });
});

exports.countByCategory = asyncHandler(async (_req, res) => {
  const agg = await Notification.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $project: { category: "$_id", count: 1, _id: 0 } },
  ]);
  res.json({ data: agg });
});

exports.seenStats = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const notification = toObjectId(req.params.id);
  const agg = await NotificationDelivery.aggregate([
    { $match: { notification } },
    { $group: { _id: "$seen", count: { $sum: 1 } } },
  ]);
  const counts = { seen: 0, unseen: 0 };
  agg.forEach((r) => {
    if (r._id) counts.seen = r.count;
    else counts.unseen = r.count;
  });
  res.json({ data: counts });
});

exports.unseenCountForMe = asyncHandler(async (req, res) => {
  const me = assertMeOr401(req);
  const total = await NotificationDelivery.countDocuments({
    user: me,
    seen: false,
  });
  res.json({ unseen: total });
});

/* ---------------------------------------
 * Send / Schedule / Resend flows
 * -------------------------------------*/
exports.schedule = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;
  const { scheduledAt } = req.body;
  const doc = await Notification.findById(id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  if (doc.status !== "draft" && doc.status !== "scheduled") {
    return res
      .status(400)
      .json({ error: "Only draft/scheduled notifications can be scheduled" });
  }

  doc.scheduledAt = scheduledAt ? new Date(scheduledAt) : new Date();
  doc.status = "scheduled";
  await doc.save();
  res.json({ data: doc });
});

/**
 * NEW: sendNow that uses a transaction if supported, otherwise falls back.
 */
exports.sendNow = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;

  const result = await runWithOptionalTxn(async (session) => {
    // Use the session if present; otherwise normal operations
    const query = Notification.findById(id);
    if (session) query.session(session);
    const doc = await query;
    if (!doc) return { http: 404, body: { error: "Not found" } };

    if (doc.status === "sent") {
      return { http: 400, body: { error: "Already sent" } };
    }

    // mark as sending
    await doc.updateOne(
      { $set: { status: "sending" } },
      session ? { session } : {}
    );

    // resolve audience and upsert deliveries
    const userIds = await resolveAudienceUsers(doc);
    const { upserted, existing } = await ensureDeliveries(
      doc._id,
      userIds,
      session || null
    );

    // finalize
    await Notification.updateOne(
      { _id: doc._id },
      { $set: { status: "sent", sentAt: new Date() } },
      session ? { session } : {}
    );

    // read back final doc for response (optional)
    const readBackQ = Notification.findById(doc._id);
    if (session) readBackQ.session(session);
    const finalDoc = await readBackQ.lean();

    return {
      http: 200,
      body: {
        data: finalDoc,
        deliveries: {
          totalRecipients: userIds.length,
          created: upserted,
          existing,
        },
      },
    };
  });

  return res.status(result.http).json(result.body);
});

exports.cancel = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const doc = await Notification.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (doc.status === "sent")
    return res.status(400).json({ error: "Cannot cancel a sent notification" });
  doc.status = "canceled";
  await doc.save();
  res.json({ data: doc });
});

exports.duplicate = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const src = await Notification.findById(req.params.id).lean();
  if (!src) return res.status(404).json({ error: "Not found" });

  const clone = await Notification.create({
    title: src.title + " (copy)",
    message: src.message,
    html: src.html,
    category: src.category,
    priority: src.priority,
    channels: src.channels,
    resendOf: src._id,
    audienceType: src.audienceType,
    roles: src.roles,
    users: src.users,
    context: src.context,
    excludeUsers: src.excludeUsers,
    status: "draft",
    attachments: src.attachments,
    ctas: src.ctas,
    tags: src.tags,
  });

  res.status(201).json({ data: clone });
});

exports.resendToUser = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id, userId } = req.params;
  const notification = await Notification.findById(id);
  if (!notification)
    return res.status(404).json({ error: "Notification not found" });

  const delivery = await NotificationDelivery.findOneAndUpdate(
    { notification: id, user: userId },
    {
      $setOnInsert: { notification: id, user: userId },
      $set: { lastResentAt: new Date() },
    },
    { upsert: true, new: true }
  );

  res.json({ data: delivery });
});

exports.resendToRole = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: "role is required" });

  const users = await User.find({ role }, { _id: 1 }).lean();
  const userIds = users.map((u) => u._id);

  const { upserted } = await ensureDeliveries(id, userIds);
  await NotificationDelivery.updateMany(
    { notification: id, user: { $in: userIds } },
    { $set: { lastResentAt: new Date() } }
  );

  res.json({ ok: true, upserted, total: userIds.length });
});

exports.resendToUsers = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;
  const userIds = (req.body.userIds || []).map(toObjectId);
  const { upserted } = await ensureDeliveries(id, userIds);
  await NotificationDelivery.updateMany(
    { notification: id, user: { $in: userIds } },
    { $set: { lastResentAt: new Date() } }
  );
  res.json({ ok: true, upserted, total: userIds.length });
});

/* ---------------------------------------
 * Deliveries
 * -------------------------------------*/
exports.listDeliveries = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;

  const filter = { notification: toObjectId(id) };
  if (req.query.seen === "true") filter.seen = true;
  if (req.query.seen === "false") filter.seen = false;
  if (req.query.user) filter.user = toObjectId(req.query.user);

  const sort = parseSort(req.query.sort);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "50", 10), 1),
    500
  );

  const [rows, total] = await Promise.all([
    NotificationDelivery.find(filter)
      .populate("user", "name email role")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    NotificationDelivery.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.markSeenForMe = asyncHandler(async (req, res) => {
  const me = assertMeOr401(req);
  const { id } = req.params;
  const delivery = await NotificationDelivery.findOne({ _id: id, user: me });
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });
  await delivery.markSeen();
  res.json({ data: delivery });
});

exports.dismissForMe = asyncHandler(async (req, res) => {
  const me = assertMeOr401(req);
  const { id } = req.params;
  const delivery = await NotificationDelivery.findOneAndUpdate(
    { _id: id, user: me },
    { $set: { dismissedAt: new Date() } },
    { new: true }
  );
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });
  res.json({ data: delivery });
});

/* ---------------------------------------
 * Bulk operations
 * -------------------------------------*/
exports.bulkDelete = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const ids = (req.body.ids || []).map(toObjectId);
  await Notification.deleteMany({ _id: { $in: ids } });
  await NotificationDelivery.deleteMany({ notification: { $in: ids } });
  res.json({ ok: true, deleted: ids.length });
});

exports.bulkStatus = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const ids = (req.body.ids || []).map(toObjectId);
  const { status } = req.body;
  const allowed = ["draft", "scheduled", "canceled"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status for bulk update" });
  const result = await Notification.updateMany(
    { _id: { $in: ids } },
    { $set: { status } }
  );
  res.json({
    ok: true,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
});

exports.bulkDuplicate = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const ids = (req.body.ids || []).map(toObjectId);
  const srcs = await Notification.find({ _id: { $in: ids } }).lean();
  const payloads = srcs.map((src) => ({
    title: src.title + " (copy)",
    message: src.message,
    html: src.html,
    category: src.category,
    priority: src.priority,
    channels: src.channels,
    resendOf: src._id,
    audienceType: src.audienceType,
    roles: src.roles,
    users: src.users,
    context: src.context,
    excludeUsers: src.excludeUsers,
    status: "draft",
    attachments: src.attachments,
    ctas: src.ctas,
    tags: src.tags,
  }));
  const inserted = await Notification.insertMany(payloads);
  res.json({ ok: true, created: inserted.length, data: inserted });
});

/* ---------------------------------------
 * Filters (POST)
 * -------------------------------------*/
exports.filter = asyncHandler(async (req, res) => {
  const filter = buildNotificationFilter(req.body || {});
  const sort = parseSort(req.body?.sort);
  const page = Math.max(parseInt(req.body?.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.body?.limit || "20", 10), 1),
    200
  );

  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  res.json({
    data: rows,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/* ---------------------------------------
 * CSV export
 * -------------------------------------*/
exports.exportDeliveriesCsv = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;
  const deliveries = await NotificationDelivery.find({ notification: id })
    .populate("user", "name email role")
    .lean();

  const lines = [];
  lines.push(
    "user_name,user_email,user_role,seen,seenAt,dismissedAt,lastSentAt,lastResentAt"
  );
  deliveries.forEach((d) => {
    const name = (d.user && d.user.name) || "";
    const email = (d.user && d.user.email) || "";
    const role = (d.user && d.user.role) || "";
    const seen = d.seen ? "true" : "false";
    const seenAt = d.seenAt ? new Date(d.seenAt).toISOString() : "";
    const dismissedAt = d.dismissedAt
      ? new Date(d.dismissedAt).toISOString()
      : "";
    const lastSentAt = d.lastSentAt ? new Date(d.lastSentAt).toISOString() : "";
    const lastResentAt = d.lastResentAt
      ? new Date(d.lastResentAt).toISOString()
      : "";
    lines.push(
      [name, email, role, seen, seenAt, dismissedAt, lastSentAt, lastResentAt]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    );
  });

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="notification_${id}_deliveries.csv"`
  );
  res.status(200).send(csv);
});

/* ---------------------------------------
 * Convenience feed for the current user
 * -------------------------------------*/
exports.myFeed = asyncHandler(async (req, res) => {
  const me = assertMeOr401(req);
  const sort = parseSort(req.query.sort);
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10), 1),
    200
  );

  const now = new Date();
  const rows = await NotificationDelivery.find({ user: me })
    .populate({
      path: "notification",
      match: {
        status: "sent",
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }],
      },
    })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const data = rows.filter((r) => r.notification);
  res.json({ data, meta: { page, limit, total: data.length } });
});

/* ---------------------------------------
 * Admin: force mark delivery seen/unseen
 * -------------------------------------*/
exports.adminMarkSeen = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;
  const delivery = await NotificationDelivery.findById(id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  delivery.seen = true;
  delivery.seenAt = new Date();
  await delivery.save();
  res.json({ data: delivery });
});

exports.adminMarkUnseen = asyncHandler(async (req, res) => {
  requireSuperadmin(req);
  const { id } = req.params;
  const delivery = await NotificationDelivery.findById(id);
  if (!delivery) return res.status(404).json({ error: "Delivery not found" });

  delivery.seen = false;
  delivery.seenAt = undefined;
  await delivery.save();
  res.json({ data: delivery });
});
