// models/QuestionModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

// -------------------------
// Enums / constants
// -------------------------
const QUESTION_TYPES = ["mcq", "theory", "programming", "true_false", "direct"]; // + direct
const ANSWER_STATUS = ["correct", "incorrect", "unanswered"];
const DIFFICULTY = ["easy", "medium", "hard"];

// -------------------------
// Subschemas
// -------------------------
const OptionSchema = new Schema(
  {
    // For MCQs. You can store A/B/C/D in "key" if you want to render labels
    key: { type: String, trim: true }, // e.g., "A", "B", "C", "D"
    text: { type: String, trim: true, required: true },
    // Optional media per option (e.g., image-based MCQs)
    media: [
      {
        type: {
          type: String,
          enum: ["image", "audio", "video", "file"],
          default: "image",
        },
        url: { type: String, trim: true },
        caption: { type: String, trim: true },
      },
    ],
  },
  { _id: false }
);

const AttachmentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["image", "audio", "video", "file"],
      default: "image",
    },
    url: { type: String, trim: true, required: true },
    caption: { type: String, trim: true },
  },
  { _id: false }
);

// -------------------------
// Main Question schema
// -------------------------
const QuestionSchema = new Schema(
  {
    // ---------- Core ----------
    question_text: {
      type: String,
      required: true,
      trim: true,
    },

    question_type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
      lowercase: true,
    },

    // MCQ-only fields
    options: {
      type: [OptionSchema],
      default: undefined, // only present for MCQ
    },
    correctOptionIndex: {
      type: Number, // 0..3 (exactly four options)
      min: 0,
      max: 3,
    },
    randomizeOptions: {
      type: Boolean,
      default: true,
    },

    // True/False-only field
    correctBoolean: {
      type: Boolean,
      default: undefined,
    },

    // Theory (essay)-only fields
    theory_answer: {
      type: String, // model answer / guidelines
      trim: true,
    },
    rubric: {
      type: String, // teacher rubric for manual grading
      trim: true,
    },
    maxWords: {
      type: Number, // optional limit
      default: 0,
    },

    // Programming (coding)-only fields
    programming_language: {
      type: String, // e.g., "python", "javascript", "java"
      trim: true,
    },
    starterCode: {
      type: String, // boilerplate code shown to students
      trim: true,
    },
    // Hidden testcases for auto-grading
    testcases: [
      {
        input: { type: String, trim: true },
        expectedOutput: { type: String, trim: true },
        weight: { type: Number, default: 1 },
      },
    ],

    // Direct Q&A-only field
    direct_answer: {
      type: String,
      trim: true,
    },

    // ---------- Scoring / evaluation ----------
    marks_alloted: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    negativeMarkPerQuestion: {
      type: Number,
      default: 0, // optional negative marking at question-level
      min: 0,
    },
    timeLimitSeconds: {
      type: Number,
      default: 0, // 0 = no per-question limit
      min: 0,
    },

    // NOTE: Typically attempt-level, but you had them here; keeping optional:
    marks_scored: {
      type: Number,
      min: 0,
      default: 0,
    },
    answer_status: {
      type: String,
      enum: ANSWER_STATUS,
      default: "unanswered",
    },

    // ---------- Relations ----------
    degree: {
      type: Schema.Types.ObjectId,
      ref: "Degree",
      required: false,
      index: true,
    },
    // Your backend uses "semisters" in routes; we’ll stick to "Semester" model name to match that.
    semester: {
      type: Schema.Types.ObjectId,
      ref: "Semester",
      required: false,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: false,
      index: true,
    },

    // Make both Exam & Quiz OPTIONAL (can live in the bank unattached)
    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: false,
      index: true,
    },
    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: false,
      index: true,
    },

    // ---------- Classification / metadata ----------
    topic: { type: String, trim: true }, // e.g., "Trees", "DB Indexing"
    subtopic: { type: String, trim: true },
    chapter: { type: String, trim: true },
    learningOutcomes: [{ type: String, trim: true }],

    difficultyLevel: {
      type: String,
      enum: DIFFICULTY,
      default: "medium",
    },
    language: { type: String, trim: true, default: "English" },
    tags: [{ type: String, trim: true }],

    explanation: {
      type: String, // post-answer explanation shown to learners
      trim: true,
    },

    attachments: [AttachmentSchema], // images, audio, videos, files

    // ---------- Lifecycle / control ----------
    order: {
      type: Number,
      default: 0, // placement within an exam/quiz/section
      index: true,
    },
    section: {
      type: String, // "Section 1 - One Mark", etc.
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },

    // ---------- Audit ----------
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        return ret;
      },
    },
  }
);

// -------------------------
// Validation / Guards
// -------------------------
QuestionSchema.pre("validate", function (next) {
  const q = this;

  // MCQ: exactly 4 options + valid correctOptionIndex
  if (q.question_type === "mcq") {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return next(
        new Error("MCQ questions must have exactly 4 options (A, B, C, D).")
      );
    }
    if (
      typeof q.correctOptionIndex !== "number" ||
      q.correctOptionIndex < 0 ||
      q.correctOptionIndex > 3
    ) {
      return next(
        new Error(
          "MCQ questions must define a valid correctOptionIndex (0..3)."
        )
      );
    }
    // Clean unrelated fields
    q.correctBoolean = undefined;
    q.theory_answer = undefined;
    q.rubric = undefined;
    q.maxWords = q.maxWords || 0;
    q.programming_language = undefined;
    q.starterCode = undefined;
    q.testcases = undefined;
    q.direct_answer = undefined;
  }

  // True/False
  if (q.question_type === "true_false") {
    if (typeof q.correctBoolean !== "boolean") {
      return next(new Error("True/False questions require a correctBoolean."));
    }
    // Clean unrelated
    q.options = undefined;
    q.correctOptionIndex = undefined;
    q.theory_answer = undefined;
    q.rubric = undefined;
    q.maxWords = q.maxWords || 0;
    q.programming_language = undefined;
    q.starterCode = undefined;
    q.testcases = undefined;
    q.direct_answer = undefined;
  }

  // Theory (essay)
  if (q.question_type === "theory") {
    // Optional enforcement:
    // if (!q.theory_answer || !q.theory_answer.trim()) {
    //   return next(new Error("Theory questions should include a model answer."));
    // }
    q.options = undefined;
    q.correctOptionIndex = undefined;
    q.correctBoolean = undefined;
    q.programming_language = undefined;
    q.starterCode = undefined;
    q.testcases = undefined;
    q.direct_answer = undefined;
  }

  // Programming (coding)
  if (q.question_type === "programming") {
    // Optional enforcement:
    // if (!Array.isArray(q.testcases) || q.testcases.length === 0) {
    //   return next(new Error("Programming question requires at least one testcase."));
    // }
    q.options = undefined;
    q.correctOptionIndex = undefined;
    q.correctBoolean = undefined;
    q.theory_answer = undefined;
    q.rubric = undefined;
    q.maxWords = q.maxWords || 0;
    q.direct_answer = undefined;
  }

  // Direct Q&A
  if (q.question_type === "direct") {
    // Optional enforcement:
    // if (!q.direct_answer || !q.direct_answer.trim()) {
    //   return next(new Error("Direct questions should include a direct_answer."));
    // }
    q.options = undefined;
    q.correctOptionIndex = undefined;
    q.correctBoolean = undefined;
    q.theory_answer = undefined;
    q.rubric = undefined;
    q.maxWords = q.maxWords || 0;
    q.programming_language = undefined;
    q.starterCode = undefined;
    q.testcases = undefined;
  }

  // Sanity: marks
  if (typeof q.marks_alloted !== "number" || q.marks_alloted < 0) {
    return next(new Error("marks_alloted must be a non-negative number."));
  }
  if (q.negativeMarkPerQuestion < 0) {
    return next(
      new Error("negativeMarkPerQuestion must be a non-negative number.")
    );
  }

  next();
});

// Helpful text index for searching
QuestionSchema.index({
  question_text: "text",
  tags: "text",
  topic: "text",
  subtopic: "text",
  chapter: "text",
});

// Fast lookup within an exam/quiz slice
QuestionSchema.index(
  { exam: 1, quiz: 1, section: 1, order: 1, difficultyLevel: 1 },
  { name: "exam_quiz_section_order_diff_idx" }
);

// For building banks by curriculum path
QuestionSchema.index(
  { degree: 1, semester: 1, course: 1, difficultyLevel: 1 },
  { name: "program_lookup_idx" }
);

module.exports = mongoose.model("Question", QuestionSchema, "questions");
