const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    // The course this exam belongs to
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Title of the exam
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Short description
    description: {
      type: String,
      trim: true,
    },

    // Type of exam — MCQ, coding, mixed, etc.
    examType: {
      type: String,
      enum: ["MCQ", "Coding", "Mixed"],
      default: "MCQ",
    },

    // Duration in minutes
    duration: {
      type: Number,
      required: true,
      min: 1,
    },

    // Passing percentage (e.g., 60%)
    passingPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Maximum marks for the exam
    totalMarks: {
      type: Number,
      required: true,
    },

    // Whether the exam is free or part of a paid course
    isPaid: {
      type: Boolean,
      default: false,
    },

    // List of questions for the exam
    questions: [
      {
        questionText: { type: String, required: true },
        questionType: {
          type: String,
          enum: ["MCQ", "TrueFalse", "ShortAnswer", "Coding"],
          default: "MCQ",
        },
        options: [
          {
            optionText: String,
            isCorrect: { type: Boolean, default: false },
          },
        ],
        marks: { type: Number, required: true },
        explanation: String,
      },
    ],

    // Number of attempts allowed
    attemptsAllowed: {
      type: Number,
      default: 1,
    },

    // Whether the exam is published/visible to students
    isPublished: {
      type: Boolean,
      default: false,
    },

    // Which instructor created this exam
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Analytics: how many students attempted
    attemptsCount: {
      type: Number,
      default: 0,
    },

    // Tags for search optimization
    tags: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
