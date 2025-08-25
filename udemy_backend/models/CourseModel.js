// models/CourseModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Helper to generate a slug from title when missing
const slugify = (str = "") =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

// ---------- Subdocuments ----------
const topicSchema = new Schema(
  {
    // SubTopic basics
    title: { type: String, trim: true },

    // 👇 NEW: learning content for each sub-topic
    explanation: { type: String, default: "" },       // theory/explanation text
    code: { type: String, default: "" },              // code snippet
    codeExplanation: { type: String, default: "" },   // explanation about the code
    codeLanguage: { type: String, default: "plaintext", trim: true }, // e.g., "javascript", "python"

    // Existing media/metadata
    videoUrl: { type: String, trim: true },
    pdfUrl: { type: String, trim: true },
    duration: { type: Number, min: 0 }, // minutes
    isFreePreview: { type: Boolean, default: false },
  },
  { _id: false }
);

const moduleSchema = new Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    topics: { type: [topicSchema], default: [] },
  },
  { _id: false }
);

// ---------- Main schema ----------
const courseSchema = new Schema(
  {
    // Basic Info
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true, // single unique definition (no separate index() call)
      lowercase: true,
      trim: true,
    },
    description: { type: String, required: true },
    language: { type: String, default: "English" },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    thumbnail: { type: String, trim: true },
    promoVideoUrl: { type: String, trim: true }, // Trailer video
    durationInHours: { type: Number, required: true, min: 0 },
    price: { type: Number, default: 0, min: 0 },

    // Categorization (MANDATORY)
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true, // <- keep as-is per your current model; make false if you decide to make it optional
    },

    // Audience & Marketing
    requirements: { type: [String], default: [] },
    learningOutcomes: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    keywords: { type: [String], default: [] },

    // Authors & Instructor
    authors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // no field-level index here (we add a schema-level one below)
    },

    // Course Content (main & sub-topics are optional at creation time)
    modules: { type: [moduleSchema], default: [] },
    totalModules: { type: Number, default: 0, min: 0 },
    totalTopics: { type: Number, default: 0, min: 0 },

    // Learning Materials
    learningResources: {
      videos: { type: [String], default: [] },
      pdfs: { type: [String], default: [] },
      assignments: { type: [String], default: [] },
      externalLinks: { type: [String], default: [] },
    },

    // Course Access
    accessType: {
      type: String,
      enum: ["Free", "Paid", "Subscription", "Lifetime"],
      default: "Paid",
    },
    maxStudents: { type: Number, min: 0 },
    enrollmentDeadline: Date,
    completionCriteria: {
      type: String,
      enum: ["All Topics", "Final Exam", "Manual Approval"],
      default: "All Topics",
    },

    // Enrollment Info (NOT required at creation time)
    enrolledStudents: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "User" },
        enrolledAt: { type: Date, default: Date.now },
        completed: { type: Boolean, default: false },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        completedTopics: { type: [String], default: [] },
        // no examsTaken here (decoupled from Exam model)
        certificateIssued: { type: Boolean, default: false },
      },
    ],

    // Certificate
    issueCertificate: { type: Boolean, default: true },
    certificateTemplateUrl: { type: String, trim: true },

    // Ratings & Reviews
    ratings: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        review: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },

    // Community Q&A
    discussionThreads: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        message: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
        replies: [
          {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            message: { type: String, trim: true },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    // Flags & Sorting
    published: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    // Versioning
    version: { type: String, default: "1.0" },
  },
  { timestamps: true }
);

// ---------- Hooks ----------

// Auto-generate slug from title if not provided
courseSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }
  next();
});

// Maintain totals & average rating
courseSchema.pre("save", function (next) {
  if (Array.isArray(this.modules)) {
    this.totalModules = this.modules.length;
    this.totalTopics = this.modules.reduce(
      (sum, m) => sum + (Array.isArray(m.topics) ? m.topics.length : 0),
      0
    );
  } else {
    this.totalModules = 0;
    this.totalTopics = 0;
  }

  if (Array.isArray(this.ratings) && this.ratings.length > 0) {
    const avg =
      this.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
      this.ratings.length;
    this.averageRating = Math.max(0, Math.min(5, Number(avg.toFixed(2))));
  } else {
    this.averageRating = 0;
  }

  next();
});

// ---------- Indexes (schema-level; avoid duplicates) ----------

// Text search
courseSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  keywords: "text",
});

// Common filters
courseSchema.index({ category: 1, subCategory: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ published: 1, isArchived: 1, isFeatured: 1 });
courseSchema.index({ createdAt: -1 });

// Export with hot-reload guard
module.exports =
  mongoose.models.Course || mongoose.model("Course", courseSchema);
