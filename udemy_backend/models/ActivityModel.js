
// udemy_backend/models/ActivityModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ---------------- Attachments (reused) ---------------- */
const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String },
    type: { type: String },
    size: { type: Number },
    path: { type: String }, // relative path for cleanup
  },
  { _id: false }
);

/* ---------------- Enums ---------------- */
const AudienceTypeEnum = ["all", "roles", "users", "contextual"];
const ActivityStatusEnum = ["draft", "published", "archived"];
const AssignmentStatusEnum = ["new", "inprogress", "completed"];
const SubmissionStatusEnum = ["pending", "under_review", "graded"];

/* ---------------- Activity ---------------- */
const ActivitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },

    audienceType: { type: String, enum: AudienceTypeEnum, default: "all" },
    roles: { type: [String], default: [] }, // when audienceType = "roles"
    users: [{ type: Schema.Types.ObjectId, ref: "User" }], // when audienceType = "users"

    // Context targeting (IDs only)
    context: {
      degrees: [{ type: Schema.Types.ObjectId, ref: "Degree" }],
      semesters: [{ type: Schema.Types.ObjectId, ref: "Semester" }],
      courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
      section: { type: String, trim: true },
      batchYear: { type: String, trim: true },
    },

    startAt: { type: Date },
    endAt: { type: Date },
    allowLate: { type: Boolean, default: false },

    maxMarks: { type: Number, default: 100, min: 0 },

    status: { type: String, enum: ActivityStatusEnum, default: "draft" },

    slug: { type: String, index: true }, // optional, used by your routes/FE

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/* ---------------- Indexes (no tags anywhere) ---------------- */
// Text search only on string fields
ActivitySchema.index({ title: "text", instructions: "text" });
// Context filters
ActivitySchema.index({ "context.degrees": 1 });
ActivitySchema.index({ "context.semesters": 1 });
ActivitySchema.index({ "context.courses": 1 });
// Common filters
ActivitySchema.index({ status: 1, audienceType: 1 });

const Activity = mongoose.model("Activity", ActivitySchema);

/* ---------------- ActivityAssignment ---------------- */
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

const ActivityAssignment = mongoose.model(
  "ActivityAssignment",
  ActivityAssignmentSchema
);

/* ---------------- ActivitySubmission ---------------- */
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

const ActivitySubmissionSchema = new Schema(
  {
    activity: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignment: { type: Schema.Types.ObjectId, ref: "ActivityAssignment" },

    files: { type: [AttachmentSchema], default: [] },

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

/**
 * Keep assignment in sync on submission save:
 * - ensures an assignment exists
 * - toggles status to inprogress/completed when appropriate
 */
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

const ActivitySubmission = mongoose.model(
  "ActivitySubmission",
  ActivitySubmissionSchema
);

module.exports = { Activity, ActivityAssignment, ActivitySubmission };
