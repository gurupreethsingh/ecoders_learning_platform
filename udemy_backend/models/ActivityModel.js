// udemy_backend/models/ActivityModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/** Attachments shared schema */
const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String },
    type: { type: String },
    size: { type: Number },
    path: { type: String },
  },
  { _id: false }
);

const AudienceTypeEnum = ["all", "roles", "users", "contextual"];
const ActivityStatusEnum = ["draft", "published", "archived"];

const ActivitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    attachments: [AttachmentSchema],
    tags: [{ type: String, trim: true }],

    audienceType: { type: String, enum: AudienceTypeEnum, default: "all" },
    roles: [{ type: String, trim: true }],
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],

    context: {
      degrees: [{ type: Schema.Types.ObjectId, ref: "Degree" }],
      semesters: [{ type: Schema.Types.ObjectId, ref: "Semister" }],
      courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
      section: { type: String, trim: true },
      batchYear: { type: String, trim: true },
    },

    startAt: { type: Date },
    endAt: { type: Date },
    allowLate: { type: Boolean, default: false },

    maxMarks: { type: Number, default: 100, min: 0 },

    status: { type: String, enum: ActivityStatusEnum, default: "draft" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ---------------- Indexes ---------------- */

// single text index (do NOT include array fields like tags)
ActivitySchema.index({ title: "text", instructions: "text" });

// normal index for tags array
ActivitySchema.index({ tags: 1 });

// ❗ split the context array indexes so we don't index parallel arrays
ActivitySchema.index({ "context.degrees": 1 });
ActivitySchema.index({ "context.semesters": 1 });
ActivitySchema.index({ "context.courses": 1 });

// optional: also keep status/audienceType
ActivitySchema.index({ status: 1, audienceType: 1 });

/* -------------- Assignment & Submission schemas (unchanged) -------------- */
const AssignmentStatusEnum = ["new", "inprogress", "completed"];
const ActivityAssignmentSchema = new Schema(
  {
    activity: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: AssignmentStatusEnum, default: "new" },
    lastStatusAt: { type: Date, default: Date.now },
    submission: { type: Schema.Types.ObjectId, ref: "ActivitySubmission" },
  },
  { timestamps: true }
);
ActivityAssignmentSchema.index({ activity: 1, user: 1 }, { unique: true });
ActivityAssignmentSchema.index({ status: 1 });

const ReviewSchema = new Schema(
  {
    notes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { _id: false }
);
const GradeSchema = new Schema(
  {
    marks: { type: Number, min: 0 },
    maxMarks: { type: Number, min: 0 },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    gradedAt: Date,
  },
  { _id: false }
);
const SubmissionStatusEnum = ["pending", "under_review", "graded"];
const ActivitySubmissionSchema = new Schema(
  {
    activity: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignment: { type: Schema.Types.ObjectId, ref: "ActivityAssignment" },
    files: [AttachmentSchema],
    submittedAt: { type: Date, default: Date.now },
    review: ReviewSchema,
    grade: GradeSchema,
    status: { type: String, enum: SubmissionStatusEnum, default: "pending" },
    isFinal: { type: Boolean, default: true },
    attemptNo: { type: Number, default: 1 },
  },
  { timestamps: true }
);
ActivitySubmissionSchema.index({ activity: 1, user: 1, createdAt: -1 });
ActivitySubmissionSchema.index({ status: 1 });

ActivitySubmissionSchema.post("save", async function (doc, next) {
  try {
    const Assignment = mongoose.model("ActivityAssignment");
    const hasFiles = Array.isArray(doc.files) && doc.files.length > 0;
    const isGraded = doc.grade && typeof doc.grade.marks === "number";

    const assignment = await Assignment.findOneAndUpdate(
      { activity: doc.activity, user: doc.user },
      {
        $setOnInsert: { activity: doc.activity, user: doc.user, status: "new" },
        $set: { submission: doc._id, lastStatusAt: new Date() },
      },
      { new: true, upsert: true }
    );

    if (isGraded && assignment.status !== "completed") {
      assignment.status = "completed";
      assignment.lastStatusAt = new Date();
      await assignment.save();
    } else if (hasFiles && assignment.status === "new") {
      assignment.status = "inprogress";
      assignment.lastStatusAt = new Date();
      await assignment.save();
    }
    next();
  } catch (err) {
    next(err);
  }
});

const Activity = mongoose.model("Activity", ActivitySchema);
const ActivityAssignment = mongoose.model(
  "ActivityAssignment",
  ActivityAssignmentSchema
);
const ActivitySubmission = mongoose.model(
  "ActivitySubmission",
  ActivitySubmissionSchema
);

module.exports = { Activity, ActivityAssignment, ActivitySubmission };
