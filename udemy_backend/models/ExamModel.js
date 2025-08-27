// // models/ExamModel.js
// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const ExamSchema = new Schema(
//   {
//     // Relations
//     degree: {
//       type: Schema.Types.ObjectId,
//       ref: "Degree",
//       required: true,
//     },
//     semester: {
//       type: Schema.Types.ObjectId,
//       ref: "Semester",
//       required: true,
//     },
//     course: { type: Schema.Types.ObjectId, ref: "Course", required: true },

//     // Core exam attributes
//     examName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     examCode: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },
//     examDurationMinutes: {
//       type: Number,
//       required: true,
//       min: 10, // at least 10 minutes
//     },
//     examType: {
//       type: String,
//       enum: [
//         "weekly",
//         "monthly",
//         "half_yearly",
//         "mid_term",
//         "preparatory",
//         "final",
//       ],
//       required: true,
//     },
//     passPercentage: {
//       type: Number,
//       required: true,
//       min: 0,
//       max: 100,
//     },
//     isPaid: {
//       type: Boolean,
//       default: false,
//     },
//     numberOfAttemptsAllowed: {
//       type: Number,
//       default: 1,
//     },
//     attemptCount: {
//       type: Number,
//       default: 0, // how many times attempted so far
//     },

//     // Publishing & authorship
//     isPublished: {
//       type: Boolean,
//       default: false,
//     },
//     createdBy: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     // Extra useful fields for a language learning / school platform
//     subject: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     totalMarks: {
//       type: Number,
//       default: 100,
//     },
//     instructions: {
//       type: String,
//       default: "Read all questions carefully before answering.",
//     },
//     syllabusOutline: {
//       type: String,
//       default: "",
//     },
//     allowedLanguages: [
//       {
//         type: String,
//         trim: true,
//       },
//     ], // e.g. ["English", "Spanish", "French"]

//     tags: [
//       {
//         type: String,
//         trim: true,
//       },
//     ],

//     // Optional advanced fields
//     examDate: {
//       type: Date,
//     },
//     startTime: {
//       type: Date,
//     },
//     endTime: {
//       type: Date,
//     },
//     negativeMarking: {
//       type: Boolean,
//       default: false,
//     },
//     negativeMarkPerQuestion: {
//       type: Number,
//       default: 0,
//     },
//     maxStudents: {
//       type: Number,
//       default: 0, // 0 = unlimited
//     },
//     difficultyLevel: {
//       type: String,
//       enum: ["easy", "medium", "hard"],
//       default: "medium",
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Exam", ExamSchema);

//

const mongoose = require("mongoose");
const { Schema } = mongoose;

const ExamSchema = new Schema(
  {
    degree: { type: Schema.Types.ObjectId, ref: "Degree", required: true },

    // ⬇️ IMPORTANT: match your model name "Semister"
    semester: { type: Schema.Types.ObjectId, ref: "Semister", required: true },

    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },

    examName: { type: String, required: true, trim: true },
    examCode: { type: String, required: true, unique: true, trim: true },
    examDurationMinutes: { type: Number, required: true, min: 10 },
    examType: {
      type: String,
      enum: [
        "weekly",
        "monthly",
        "half_yearly",
        "mid_term",
        "preparatory",
        "final",
      ],
      required: true,
    },
    passPercentage: { type: Number, required: true, min: 0, max: 100 },
    isPaid: { type: Boolean, default: false },
    numberOfAttemptsAllowed: { type: Number, default: 1 },
    attemptCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    subject: { type: String, required: true, trim: true },
    totalMarks: { type: Number, default: 100 },
    instructions: {
      type: String,
      default: "Read all questions carefully before answering.",
    },
    syllabusOutline: { type: String, default: "" },
    allowedLanguages: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],

    examDate: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkPerQuestion: { type: Number, default: 0 },
    maxStudents: { type: Number, default: 0 },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", ExamSchema);
