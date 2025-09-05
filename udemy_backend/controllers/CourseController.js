// controllers/CourseController.js
const mongoose = require("mongoose");
const Course = require("../models/CourseModel");

const { Types } = mongoose;

/* ----------------------------- helpers ------------------------------ */

const toObjectId = (v) => {
  try {
    if (!v) return null;
    return new Types.ObjectId(v);
  } catch {
    return null;
  }
};

const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const boolFrom = (v) =>
  typeof v === "string" ? v.toLowerCase() === "true" : Boolean(v);

const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return v
      .split(",")
      .map((x) => String(x).trim())
      .filter(Boolean);
  }
  return v ? [v] : [];
};

const parseJSON = (v) => {
  if (v == null) return v;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
};

const toNumber = (v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const toDate = (v) => {
  if (v === "" || v == null) return undefined;
  const d = new Date(v);
  return isNaN(d) ? undefined : d;
};

const normalizeString = (v) => (v == null ? undefined : String(v).trim());

const normalizeStringArray = (v) => {
  const arr = toArray(v);
  return arr.map((s) => String(s).trim()).filter(Boolean);
};

const normalizeObjectId = (v) => {
  const id = toObjectId(v);
  return id || undefined;
};

// ---------- TOPIC NORMALIZER ----------
const normTopic = (t = {}) => {
  const o = {};
  if (t.title !== undefined) o.title = normalizeString(t.title);

  // learning content
  if (t.explanation !== undefined)
    o.explanation = normalizeString(t.explanation);
  if (t.code !== undefined) o.code = String(t.code);
  if (t.codeExplanation !== undefined)
    o.codeExplanation = normalizeString(t.codeExplanation);
  if (t.codeLanguage !== undefined)
    o.codeLanguage = normalizeString(t.codeLanguage);

  // media/metadata
  if (t.videoUrl !== undefined) o.videoUrl = normalizeString(t.videoUrl);
  if (t.pdfUrl !== undefined) o.pdfUrl = normalizeString(t.pdfUrl);
  if (t.duration !== undefined) {
    const n = toNumber(t.duration);
    if (n !== undefined) o.duration = n;
  }
  if (t.isFreePreview !== undefined)
    o.isFreePreview = boolFrom(t.isFreePreview);

  return o;
};

const normalizeModules = (input) => {
  let mods = input;
  if (typeof input === "string") {
    const parsed = parseJSON(input);
    if (Array.isArray(parsed)) mods = parsed;
  }
  if (!Array.isArray(mods)) return undefined;

  return mods.map((m) => {
    const out = {};
    if (m.title !== undefined) out.title = normalizeString(m.title);
    if (m.description !== undefined)
      out.description = normalizeString(m.description);

    let topics = m.topics;
    if (typeof topics === "string") {
      const parsed = parseJSON(topics);
      if (Array.isArray(parsed)) topics = parsed;
    }
    if (Array.isArray(topics)) {
      out.topics = topics.map(normTopic);
    }
    return out;
  });
};

const normalizeLearningResources = (v) => {
  if (v === undefined) return undefined;

  let obj = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (parsed && typeof parsed === "object") obj = parsed;
  }
  if (!obj || typeof obj !== "object") return undefined;

  const out = {};
  if (obj.videos !== undefined) out.videos = normalizeStringArray(obj.videos);
  if (obj.pdfs !== undefined) out.pdfs = normalizeStringArray(obj.pdfs);
  if (obj.assignments !== undefined)
    out.assignments = normalizeStringArray(obj.assignments);
  if (obj.externalLinks !== undefined)
    out.externalLinks = normalizeStringArray(obj.externalLinks);
  return out;
};

const normalizeEnrolledStudents = (v) => {
  if (v === undefined) return undefined;

  let arr = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (Array.isArray(parsed)) arr = parsed;
  }
  if (!Array.isArray(arr)) return undefined;

  return arr.map((s) => {
    const out = {};
    if (s.studentId !== undefined)
      out.studentId = normalizeObjectId(s.studentId);
    if (s.enrolledAt !== undefined) {
      const d = toDate(s.enrolledAt);
      if (d !== undefined) out.enrolledAt = d;
    }
    if (s.completed !== undefined) out.completed = boolFrom(s.completed);
    if (s.progress !== undefined) {
      const n = toNumber(s.progress);
      if (n !== undefined) out.progress = n;
    }
    if (s.completedTopics !== undefined)
      out.completedTopics = normalizeStringArray(s.completedTopics);
    if (s.certificateIssued !== undefined)
      out.certificateIssued = boolFrom(s.certificateIssued);
    return out;
  });
};

const normalizeRatings = (v) => {
  if (v === undefined) return undefined;

  let arr = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (Array.isArray(parsed)) arr = parsed;
  }
  if (!Array.isArray(arr)) return undefined;

  return arr.map((r) => {
    const out = {};
    if (r.studentId !== undefined)
      out.studentId = normalizeObjectId(r.studentId);
    if (r.rating !== undefined) {
      const n = toNumber(r.rating);
      if (n !== undefined) out.rating = n;
    }
    if (r.review !== undefined) out.review = normalizeString(r.review);
    if (r.createdAt !== undefined) {
      const d = toDate(r.createdAt);
      if (d !== undefined) out.createdAt = d;
    }
    return out;
  });
};

const normalizeThreads = (v) => {
  if (v === undefined) return undefined;

  let arr = v;
  if (typeof v === "string") {
    const parsed = parseJSON(v);
    if (Array.isArray(parsed)) arr = parsed;
  }
  if (!Array.isArray(arr)) return undefined;

  return arr.map((th) => {
    const out = {};
    if (th.userId !== undefined) out.userId = normalizeObjectId(th.userId);
    if (th.message !== undefined) out.message = normalizeString(th.message);
    if (th.createdAt !== undefined) {
      const d = toDate(th.createdAt);
      if (d !== undefined) out.createdAt = d;
    }
    if (th.replies !== undefined) {
      let reps = th.replies;
      if (typeof reps === "string") {
        const parsed = parseJSON(reps);
        if (Array.isArray(parsed)) reps = parsed;
      }
      if (Array.isArray(reps)) {
        out.replies = reps.map((rp) => {
          const r = {};
          if (rp.userId !== undefined) r.userId = normalizeObjectId(rp.userId);
          if (rp.message !== undefined) r.message = normalizeString(rp.message);
          if (rp.createdAt !== undefined) {
            const d = toDate(rp.createdAt);
            if (d !== undefined) r.createdAt = d;
          }
          return r;
        });
      }
    }
    return out;
  });
};

const normalizeCourseInput = (payload = {}) => {
  const out = {};

  // Basic info
  if (payload.title !== undefined) out.title = normalizeString(payload.title);
  if (payload.slug !== undefined)
    out.slug = normalizeString(payload.slug)?.toLowerCase();
  if (payload.description !== undefined)
    out.description = normalizeString(payload.description);
  if (payload.language !== undefined)
    out.language = normalizeString(payload.language);
  if (payload.level !== undefined) out.level = normalizeString(payload.level);
  if (payload.thumbnail !== undefined)
    out.thumbnail = normalizeString(payload.thumbnail);
  if (payload.promoVideoUrl !== undefined)
    out.promoVideoUrl = normalizeString(payload.promoVideoUrl);

  if (payload.durationInHours !== undefined) {
    const n = toNumber(payload.durationInHours);
    if (n !== undefined) out.durationInHours = n;
  }

  if (payload.price !== undefined) {
    const n = toNumber(payload.price);
    if (n !== undefined) out.price = n;
  }

  // Categorization
  if (payload.category !== undefined)
    out.category = normalizeObjectId(payload.category);
  if (payload.subCategory !== undefined)
    out.subCategory = normalizeObjectId(payload.subCategory);

  // Marketing
  if (payload.requirements !== undefined)
    out.requirements = normalizeStringArray(payload.requirements);
  if (payload.learningOutcomes !== undefined)
    out.learningOutcomes = normalizeStringArray(payload.learningOutcomes);
  if (payload.tags !== undefined) out.tags = normalizeStringArray(payload.tags);
  if (payload.metaTitle !== undefined)
    out.metaTitle = normalizeString(payload.metaTitle);
  if (payload.metaDescription !== undefined)
    out.metaDescription = normalizeString(payload.metaDescription);
  if (payload.keywords !== undefined)
    out.keywords = normalizeStringArray(payload.keywords);

  // People
  if (payload.authors !== undefined) {
    out.authors = toArray(payload.authors)
      .map(normalizeObjectId)
      .filter(Boolean);
  }
  if (payload.instructor !== undefined)
    out.instructor = normalizeObjectId(payload.instructor);

  // Content
  if (payload.modules !== undefined)
    out.modules = normalizeModules(payload.modules);

  if (payload.totalModules !== undefined) {
    const n = toNumber(payload.totalModules);
    if (n !== undefined) out.totalModules = n;
  }
  if (payload.totalTopics !== undefined) {
    const n = toNumber(payload.totalTopics);
    if (n !== undefined) out.totalTopics = n;
  }

  // Learning resources
  if (payload.learningResources !== undefined)
    out.learningResources = normalizeLearningResources(
      payload.learningResources
    );

  // Access
  if (payload.accessType !== undefined)
    out.accessType = normalizeString(payload.accessType);
  if (payload.maxStudents !== undefined) {
    const n = toNumber(payload.maxStudents);
    if (n !== undefined) out.maxStudents = n;
  }
  if (payload.enrollmentDeadline !== undefined) {
    const d = toDate(payload.enrollmentDeadline);
    if (d !== undefined) out.enrollmentDeadline = d;
    else if (payload.enrollmentDeadline === null) out.enrollmentDeadline = null;
  }
  if (payload.completionCriteria !== undefined)
    out.completionCriteria = normalizeString(payload.completionCriteria);

  // Enrollment
  if (payload.enrolledStudents !== undefined)
    out.enrolledStudents = normalizeEnrolledStudents(payload.enrolledStudents);

  // Certificate
  if (payload.issueCertificate !== undefined)
    out.issueCertificate = boolFrom(payload.issueCertificate);
  if (payload.certificateTemplateUrl !== undefined)
    out.certificateTemplateUrl = normalizeString(
      payload.certificateTemplateUrl
    );

  // Ratings
  if (payload.ratings !== undefined)
    out.ratings = normalizeRatings(payload.ratings);
  if (payload.averageRating !== undefined) {
    const n = toNumber(payload.averageRating);
    if (n !== undefined) out.averageRating = n;
  }

  // Q&A
  if (payload.discussionThreads !== undefined)
    out.discussionThreads = normalizeThreads(payload.discussionThreads);

  // Flags
  if (payload.published !== undefined)
    out.published = boolFrom(payload.published);
  if (payload.isArchived !== undefined)
    out.isArchived = boolFrom(payload.isArchived);
  if (payload.isFeatured !== undefined)
    out.isFeatured = boolFrom(payload.isFeatured);
  if (payload.order !== undefined) {
    const n = toNumber(payload.order);
    if (n !== undefined) out.order = n;
  }

  // Version
  if (payload.version !== undefined)
    out.version = normalizeString(payload.version);

  return out;
};

const buildFilter = (q = {}) => {
  const {
    search,
    useText,
    language,
    level,
    accessType,
    category,
    subCategory,
    instructor,
    author,
    tag,
    keyword,
    published,
    isArchived,
    isFeatured,
    minPrice,
    maxPrice,
    minHours,
    maxHours,
    minRating,
    maxRating,
    hasCertificate,
    from,
    to,
  } = q;

  const filter = {};

  if (useText === "true" && search) {
    filter.$text = { $search: String(search) };
  } else if (search) {
    const needle = new RegExp(escapeRegExp(String(search).trim()), "i");
    filter.$or = [
      { title: needle },
      { description: needle },
      { tags: needle },
      { keywords: needle },
      { metaTitle: needle },
      { metaDescription: needle },
    ];
  }

  if (language) {
    const arr = toArray(language);
    if (arr.length) filter.language = { $in: arr };
  }

  if (level) {
    const arr = toArray(level);
    if (arr.length) filter.level = { $in: arr };
  }

  if (accessType) {
    const arr = toArray(accessType);
    if (arr.length) filter.accessType = { $in: arr };
  }

  if (category) {
    const ids = toArray(category).map(toObjectId).filter(Boolean);
    if (ids.length) filter.category = { $in: ids };
  }

  if (subCategory) {
    const ids = toArray(subCategory).map(toObjectId).filter(Boolean);
    if (ids.length) filter.subCategory = { $in: ids };
  }

  if (instructor) {
    const ids = toArray(instructor).map(toObjectId).filter(Boolean);
    if (ids.length) filter.instructor = { $in: ids };
  }

  if (author) {
    const ids = toArray(author).map(toObjectId).filter(Boolean);
    if (ids.length) filter.authors = { $in: ids };
  }

  if (tag) {
    const tags = normalizeStringArray(tag);
    if (tags.length) filter.tags = { $in: tags };
  }

  if (keyword) {
    const keys = normalizeStringArray(keyword);
    if (keys.length) filter.keywords = { $in: keys };
  }

  if (published !== undefined) filter.published = boolFrom(published);
  if (isArchived !== undefined) filter.isArchived = boolFrom(isArchived);
  if (isFeatured !== undefined) filter.isFeatured = boolFrom(isFeatured);

  const price = {};
  const pMin = toNumber(minPrice);
  const pMax = toNumber(maxPrice);
  if (pMin !== undefined) price.$gte = pMin;
  if (pMax !== undefined) price.$lte = pMax;
  if (Object.keys(price).length) filter.price = price;

  const hours = {};
  const hMin = toNumber(minHours);
  const hMax = toNumber(maxHours);
  if (hMin !== undefined) hours.$gte = hMin;
  if (hMax !== undefined) hours.$lte = hMax;
  if (Object.keys(hours).length) filter.durationInHours = hours;

  const rating = {};
  const rMin = toNumber(minRating);
  const rMax = toNumber(maxRating);
  if (rMin !== undefined) rating.$gte = rMin;
  if (rMax !== undefined) rating.$lte = rMax;
  if (Object.keys(rating).length) filter.averageRating = rating;

  if (hasCertificate !== undefined) {
    filter.issueCertificate = boolFrom(hasCertificate);
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
  title: { title: 1 },
  price: { price: 1 },
  durationInHours: { durationInHours: 1 },
  averageRating: { averageRating: -1 },
  order: { order: 1 },
  published: { published: -1 },
};

const applySort = (sortBy = "createdAt", dir = "desc") => {
  const base = sortMap[sortBy] || sortMap.createdAt;
  const mult = dir === "asc" ? 1 : -1;
  const result = {};
  for (const k of Object.keys(base)) result[k] = base[k] * mult;
  return result;
};

/* ----------------------------- CRUD ------------------------------ */

exports.createCourse = async (req, res) => {
  try {
    const data = normalizeCourseInput(req.body);

    const missing = [];
    if (!data.title) missing.push("title");
    if (!data.description) missing.push("description");
    if (data.durationInHours == null) missing.push("durationInHours");
    if (!data.category) missing.push("category");
    if (!data.subCategory) missing.push("subCategory");
    if (!data.instructor) missing.push("instructor");

    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    const doc = new Course(data);
    await doc.save(); // triggers hooks
    res.status(201).json(doc.toObject());
  } catch (err) {
    if (err?.code === 11000) {
      const fields = Object.keys(err.keyPattern || {});
      return res
        .status(409)
        .json({ message: `Duplicate value for: ${fields.join(", ")}` });
    }
    console.error("createCourse error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listCourses = async (req, res) => {
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

    const projection = {};
    if (filter.$text) {
      projection.score = { $meta: "textScore" };
    }

    const [rows, total] = await Promise.all([
      Course.find(filter, projection)
        .sort(filter.$text ? { score: { $meta: "textScore" } } : sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
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
    console.error("listCourses error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const doc = await Course.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Course not found" });
    res.json(doc);
  } catch (err) {
    console.error("getCourseById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCourseBySlug = async (req, res) => {
  try {
    const doc = await Course.findOne({ slug: req.params.slug }).lean();
    if (!doc) return res.status(404).json({ message: "Course not found" });
    res.json(doc);
  } catch (err) {
    console.error("getCourseBySlug error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Use save() so pre-save recomputes totals/average
exports.updateCourse = async (req, res) => {
  try {
    const data = normalizeCourseInput(req.body);

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined) return;
      doc.set(k, v);
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    if (err?.code === 11000) {
      const fields = Object.keys(err.keyPattern || {});
      return res
        .status(409)
        .json({ message: `Duplicate value for: ${fields.join(", ")}` });
    }
    console.error("updateCourse error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course deleted", id: deleted._id });
  } catch (err) {
    console.error("deleteCourse error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ---------------------- toggles & bulk visibility ---------------------- */

exports.togglePublished = async (req, res) => {
  try {
    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    if (req.body.published !== undefined) {
      doc.published = boolFrom(req.body.published);
    } else {
      doc.published = !doc.published;
    }
    await doc.save();
    res.json({ id: doc._id, published: doc.published });
  } catch (err) {
    console.error("togglePublished error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleArchived = async (req, res) => {
  try {
    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    if (req.body.isArchived !== undefined) {
      doc.isArchived = boolFrom(req.body.isArchived);
    } else {
      doc.isArchived = !doc.isArchived;
    }
    await doc.save();
    res.json({ id: doc._id, isArchived: doc.isArchived });
  } catch (err) {
    console.error("toggleArchived error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleFeatured = async (req, res) => {
  try {
    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    if (req.body.isFeatured !== undefined) {
      doc.isFeatured = boolFrom(req.body.isFeatured);
    } else {
      doc.isFeatured = !doc.isFeatured;
    }
    await doc.save();
    res.json({ id: doc._id, isFeatured: doc.isFeatured });
  } catch (err) {
    console.error("toggleFeatured error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST body: { ids:[], field: "published"|"isArchived"|"isFeatured", value: true|false }
exports.bulkSetVisibility = async (req, res) => {
  try {
    const ids = toArray(req.body.ids).map(toObjectId).filter(Boolean);
    const field = String(req.body.field || "");
    const allowed = new Set(["published", "isArchived", "isFeatured"]);
    if (!ids.length) return res.status(400).json({ message: "No valid ids" });
    if (!allowed.has(field))
      return res.status(400).json({ message: "Invalid field" });

    const value = boolFrom(req.body.value);
    const r = await Course.updateMany(
      { _id: { $in: ids } },
      { $set: { [field]: value } }
    );
    res.json({
      matched: r.matchedCount ?? r.n,
      modified: r.modifiedCount ?? r.nModified,
    });
  } catch (err) {
    console.error("bulkSetVisibility error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- counts / facets ----------------------------- */

exports.countsSummary = async (_req, res) => {
  try {
    const [total, published, archived, featured] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ published: true }),
      Course.countDocuments({ isArchived: true }),
      Course.countDocuments({ isFeatured: true }),
    ]);
    res.json({ total, published, archived, featured });
  } catch (err) {
    console.error("countsSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countsByCategory = async (_req, res) => {
  try {
    const rows = await Course.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countsByLevel = async (_req, res) => {
  try {
    const rows = await Course.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByLevel error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.countsByAccessType = async (_req, res) => {
  try {
    const rows = await Course.aggregate([
      { $group: { _id: "$accessType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("countsByAccessType error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.facets = async (_req, res) => {
  try {
    const [
      languages,
      levels,
      tags,
      keywords,
      categories,
      subCategories,
      instructors,
    ] = await Promise.all([
      Course.distinct("language"),
      Course.distinct("level"),
      Course.distinct("tags"),
      Course.distinct("keywords"),
      Course.distinct("category"),
      Course.distinct("subCategory"),
      Course.distinct("instructor"),
    ]);

    res.json({
      languages: languages.filter(Boolean).sort(),
      levels: levels.filter(Boolean).sort(),
      tags: tags.filter(Boolean).sort(),
      keywords: keywords.filter(Boolean).sort(),
      categories: categories.filter(Boolean),
      subCategories: subCategories.filter(Boolean),
      instructors: instructors.filter(Boolean),
      accessTypes: ["Free", "Paid", "Subscription", "Lifetime"],
      completionCriteria: ["All Topics", "Final Exam", "Manual Approval"],
    });
  } catch (err) {
    console.error("facets error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- modules & topics ----------------------------- */

exports.addModule = async (req, res) => {
  try {
    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = normalizeModules([req.body])[0] || {};
    if (!mod || !mod.title) {
      return res.status(400).json({ message: "Module title is required" });
    }

    doc.modules.push(mod);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addModule error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const mIndex = Number(req.params.mIndex);
    if (!Number.isInteger(mIndex) || mIndex < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });
    if (!doc.modules || !doc.modules[mIndex])
      return res.status(404).json({ message: "Module not found" });

    const patch = normalizeModules([req.body])[0] || {};
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== undefined) doc.modules[mIndex][k] = v;
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("updateModule error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const mIndex = Number(req.params.mIndex);
    if (!Number.isInteger(mIndex) || mIndex < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });
    if (!doc.modules || !doc.modules[mIndex])
      return res.status(404).json({ message: "Module not found" });

    doc.modules.splice(mIndex, 1);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("deleteModule error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addTopic = async (req, res) => {
  try {
    const mIndex = Number(req.params.mIndex);
    if (!Number.isInteger(mIndex) || mIndex < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });
    const mod = doc.modules?.[mIndex];
    if (!mod) return res.status(404).json({ message: "Module not found" });

    const t = normTopic(req.body);
    if (!t.title)
      return res.status(400).json({ message: "Topic title is required" });

    mod.topics = Array.isArray(mod.topics) ? mod.topics : [];
    mod.topics.push(t);

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addTopic error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const mIndex = Number(req.params.mIndex);
    const tIndex = Number(req.params.tIndex);
    if (!Number.isInteger(mIndex) || mIndex < 0)
      return res.status(400).json({ message: "Invalid module index" });
    if (!Number.isInteger(tIndex) || tIndex < 0)
      return res.status(400).json({ message: "Invalid topic index" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = doc.modules?.[mIndex];
    if (!mod) return res.status(404).json({ message: "Module not found" });
    if (!mod.topics || !mod.topics[tIndex])
      return res.status(404).json({ message: "Topic not found" });

    const patch = normTopic(req.body);
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== undefined) mod.topics[tIndex][k] = v;
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("updateTopic error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const mIndex = Number(req.params.mIndex);
    const tIndex = Number(req.params.tIndex);
    if (!Number.isInteger(mIndex) || mIndex < 0)
      return res.status(400).json({ message: "Invalid module index" });
    if (!Number.isInteger(tIndex) || tIndex < 0)
      return res.status(400).json({ message: "Invalid topic index" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = doc.modules?.[mIndex];
    if (!mod) return res.status(404).json({ message: "Module not found" });
    if (!mod.topics || !mod.topics[tIndex])
      return res.status(404).json({ message: "Topic not found" });

    mod.topics.splice(tIndex, 1);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("deleteTopic error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- reorder ----------------------------- */

exports.reorderModules = async (req, res) => {
  try {
    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const order = parseJSON(req.body.order) || req.body.order;
    if (!Array.isArray(order) || !Array.isArray(doc.modules)) {
      return res.status(400).json({ message: "Invalid reorder payload" });
    }

    let modules = [...doc.modules];

    if (order.length && typeof order[0] === "number") {
      if (order.length !== modules.length) {
        return res.status(400).json({ message: "Order length mismatch" });
      }
      modules = order.map((idx) => modules[idx]).filter(Boolean);
    } else if (order.length && typeof order[0] === "object") {
      for (const step of order) {
        const from = Number(step.from);
        const to = Number(step.to);
        if (
          Number.isInteger(from) &&
          Number.isInteger(to) &&
          from >= 0 &&
          to >= 0 &&
          from < modules.length &&
          to < modules.length
        ) {
          const [m] = modules.splice(from, 1);
          modules.splice(to, 0, m);
        }
      }
    } else {
      return res.status(400).json({ message: "Unsupported reorder format" });
    }

    doc.modules = modules;
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("reorderModules error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.reorderTopics = async (req, res) => {
  try {
    const mIndex = Number(req.params.mIndex);
    if (!Number.isInteger(mIndex) || mIndex < 0)
      return res.status(400).json({ message: "Invalid module index" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const mod = doc.modules?.[mIndex];
    if (!mod) return res.status(404).json({ message: "Module not found" });

    const order = parseJSON(req.body.order) || req.body.order;
    if (!Array.isArray(order) || !Array.isArray(mod.topics)) {
      return res.status(400).json({ message: "Invalid reorder payload" });
    }

    let topics = [...mod.topics];

    if (order.length && typeof order[0] === "number") {
      if (order.length !== topics.length) {
        return res.status(400).json({ message: "Order length mismatch" });
      }
      topics = order.map((idx) => topics[idx]).filter(Boolean);
    } else if (order.length && typeof order[0] === "object") {
      for (const step of order) {
        const from = Number(step.from);
        const to = Number(step.to);
        if (
          Number.isInteger(from) &&
          Number.isInteger(to) &&
          from >= 0 &&
          to >= 0 &&
          from < topics.length &&
          to < topics.length
        ) {
          const [t] = topics.splice(from, 1);
          topics.splice(to, 0, t);
        }
      }
    } else {
      return res.status(400).json({ message: "Unsupported reorder format" });
    }

    mod.topics = topics;
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("reorderTopics error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- enrollment ----------------------------- */

exports.enrollStudent = async (req, res) => {
  try {
    const studentId = normalizeObjectId(req.body.studentId);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    doc.enrolledStudents = Array.isArray(doc.enrolledStudents)
      ? doc.enrolledStudents
      : [];

    const already = doc.enrolledStudents.find(
      (s) => String(s.studentId) === String(studentId)
    );
    if (already) return res.status(409).json({ message: "Already enrolled" });

    doc.enrolledStudents.push({
      studentId,
      enrolledAt: new Date(),
      completed: false,
      progress: 0,
      completedTopics: [],
      certificateIssued: false,
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("enrollStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEnrollment = async (req, res) => {
  try {
    const studentId = normalizeObjectId(req.body.studentId);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const idx = (doc.enrolledStudents || []).findIndex(
      (s) => String(s.studentId) === String(studentId)
    );
    if (idx === -1)
      return res.status(404).json({ message: "Enrollment not found" });

    const patch = {};
    if (req.body.progress !== undefined) {
      const n = toNumber(req.body.progress);
      if (n !== undefined) patch.progress = Math.max(0, Math.min(100, n));
    }
    if (req.body.completed !== undefined)
      patch.completed = boolFrom(req.body.completed);
    if (req.body.certificateIssued !== undefined)
      patch.certificateIssued = boolFrom(req.body.certificateIssued);
    if (req.body.completedTopics !== undefined)
      patch.completedTopics = normalizeStringArray(req.body.completedTopics);

    Object.assign(doc.enrolledStudents[idx], patch);

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("updateEnrollment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unenrollStudent = async (req, res) => {
  try {
    const studentId = normalizeObjectId(req.params.studentId);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const before = doc.enrolledStudents?.length || 0;
    doc.enrolledStudents = (doc.enrolledStudents || []).filter(
      (s) => String(s.studentId) !== String(studentId)
    );

    if ((doc.enrolledStudents?.length || 0) === before) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("unenrollStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- ratings ----------------------------- */

exports.addOrUpdateRating = async (req, res) => {
  try {
    const studentId = normalizeObjectId(req.body.studentId);
    const rating = toNumber(req.body.rating);
    if (!studentId)
      return res.status(400).json({ message: "Invalid studentId" });
    if (rating === undefined || rating < 1 || rating > 5)
      return res.status(400).json({ message: "rating must be 1..5" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    doc.ratings = Array.isArray(doc.ratings) ? doc.ratings : [];
    const idx = doc.ratings.findIndex(
      (r) => String(r.studentId) === String(studentId)
    );

    if (idx >= 0) {
      doc.ratings[idx].rating = rating;
      if (req.body.review !== undefined)
        doc.ratings[idx].review = normalizeString(req.body.review);
      doc.ratings[idx].createdAt = new Date();
    } else {
      doc.ratings.push({
        studentId,
        rating,
        review: normalizeString(req.body.review),
        createdAt: new Date(),
      });
    }

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addOrUpdateRating error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------------------- threads (Q&A) ----------------------------- */

exports.addThread = async (req, res) => {
  try {
    const userId = normalizeObjectId(req.body.userId);
    const message = normalizeString(req.body.message);
    if (!userId || !message)
      return res
        .status(400)
        .json({ message: "userId and message are required" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    doc.discussionThreads = Array.isArray(doc.discussionThreads)
      ? doc.discussionThreads
      : [];
    doc.discussionThreads.push({
      userId,
      message,
      createdAt: new Date(),
      replies: [],
    });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addThread error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.addReply = async (req, res) => {
  try {
    const tIndex = Number(req.params.tIndex);
    if (!Number.isInteger(tIndex) || tIndex < 0)
      return res.status(400).json({ message: "Invalid thread index" });

    const userId = normalizeObjectId(req.body.userId);
    const message = normalizeString(req.body.message);
    if (!userId || !message)
      return res
        .status(400)
        .json({ message: "userId and message are required" });

    const doc = await Course.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Course not found" });

    const th = doc.discussionThreads?.[tIndex];
    if (!th) return res.status(404).json({ message: "Thread not found" });

    th.replies = Array.isArray(th.replies) ? th.replies : [];
    th.replies.push({ userId, message, createdAt: new Date() });

    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error("addReply error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
