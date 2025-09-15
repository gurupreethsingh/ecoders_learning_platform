// models/QuizModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const QuizSchema = new Schema(
  {
    // Link ONLY to Course (no Degree/Semester here)
    course: { type: Schema.Types.ObjectId, ref: "Course", required: false },

    // Identity
    quizName: { type: String, required: true, trim: true },
    quizCode: { type: String, required: true, unique: true, trim: true },

    // Timing / rules
    quizDurationMinutes: { type: Number, required: true, min: 5 },
    quizType: {
      type: String,
      enum: ["practice", "chapter_end", "module_end", "final"],
      required: true,
    },
    passPercentage: { type: Number, required: true, min: 0, max: 100 },
    isPaid: { type: Boolean, default: false },
    numberOfAttemptsAllowed: { type: Number, default: 1 },
    attemptCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Content / meta
    subject: { type: String, trim: true }, // optional label similar to Exam.subject
    totalMarks: { type: Number, default: 100 },
    instructions: {
      type: String,
      default: "Read all questions carefully before answering.",
    },
    syllabusOutline: { type: String, default: "" },
    allowedLanguages: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],

    // Availability window (optional)
    quizDate: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },

    // Scoring options
    negativeMarking: { type: Boolean, default: false },
    negativeMarkPerQuestion: { type: Number, default: 0 },

    // Capacity (optional)
    maxStudents: { type: Number, default: 0 },

    // Difficulty for UI grouping (matches your frontend buckets)
    difficulty: {
      type: String,
      enum: ["basic", "intermediate", "advanced"],
      default: "basic",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", QuizSchema);
