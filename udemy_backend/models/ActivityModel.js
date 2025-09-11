// udemy_backend/models/ActivityModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/** -------------------------------------------
 * Reusable attachment schema (for activity docs & submissions)
 * ------------------------------------------*/
const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true }, // where the file is stored (S3, local, etc.)
    name: { type: String }, // display name
    type: { type: String }, // mime type (e.g. application/pdf)
    size: { type: Number }, // bytes
  },
  { _id: false }
);

/** -------------------------------------------
 * Activity (the assignment/task itself)
 * - Can target all users, specific roles, or specific users
 * - Can optionally link to many degrees/semesters/courses
 * - Has start/end dates and grading settings
 * ------------------------------------------*/
const AudienceTypeEnum = ["all", "roles", "users", "contextual"];
const ActivityStatusEnum = ["draft", "published", "archived"];

const ActivitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" }, // rich text / markdown allowed
    attachments: [AttachmentSchema], // reference files for the activity (briefs/templates/etc.)
    tags: [{ type: String, trim: true }],

    // Targeting
    audienceType: { type: String, enum: AudienceTypeEnum, default: "all" },
    roles: [{ type: String, trim: true }], // used if audienceType=roles
    users: [{ type: Schema.Types.ObjectId, ref: "User" }], // used if audienceType=users

    // Contextual links (OPTIONAL, any/all can be empty)
    context: {
      degrees: [{ type: Schema.Types.ObjectId, ref: "Degree" }],
      semesters: [{ type: Schema.Types.ObjectId, ref: "Semister" }],
      courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
      section: { type: String, trim: true },
      batchYear: { type: String, trim: true },
    },

    // Timing
    startAt: { type: Date }, // optional start
    endAt: { type: Date }, // due date / deadline (can be updated)
    allowLate: { type: Boolean, default: false },

    // Grading
    maxMarks: { type: Number, default: 100, min: 0 },

    // Lifecycle
    status: { type: String, enum: ActivityStatusEnum, default: "draft" },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ActivitySchema.index({ title: "text", instructions: "text", tags: 1 });
ActivitySchema.index({ status: 1, audienceType: 1 });
ActivitySchema.index({
  "context.degrees": 1,
  "context.semesters": 1,
  "context.courses": 1,
});

/** -------------------------------------------
 * ActivityAssignment (per-user progress tracker)
 * - Exactly one doc per (activity, user)
 * - Holds lightweight status: new/inprogress/completed
 * - Links to latest submission (if any)
 * ------------------------------------------*/
const AssignmentStatusEnum = ["new", "inprogress", "completed"];

const ActivityAssignmentSchema = new Schema(
  {
    activity: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    status: { type: String, enum: AssignmentStatusEnum, default: "new" },
    lastStatusAt: { type: Date, default: Date.now },

    submission: { type: Schema.Types.ObjectId, ref: "ActivitySubmission" }, // most recent / final
  },
  { timestamps: true }
);

ActivityAssignmentSchema.index({ activity: 1, user: 1 }, { unique: true });
ActivityAssignmentSchema.index({ status: 1 });

ActivityAssignmentSchema.methods.markInProgress = async function () {
  if (this.status !== "inprogress") {
    this.status = "inprogress";
    this.lastStatusAt = new Date();
    await this.save();
  }
};

ActivityAssignmentSchema.methods.markCompleted = async function () {
  if (this.status !== "completed") {
    this.status = "completed";
    this.lastStatusAt = new Date();
    await this.save();
  }
};

/** -------------------------------------------
 * ActivitySubmission (what a user uploads)
 * - Files uploaded by the student/teacher/etc.
 * - Review (notes + reviewer + timestamp)
 * - Grade (marks + grader + timestamp)
 * - On save: auto-updates/creates the related ActivityAssignment
 * ------------------------------------------*/
const ReviewSchema = new Schema(
  {
    notes: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: false }
);

const GradeSchema = new Schema(
  {
    marks: { type: Number, min: 0 }, // <= activity.maxMarks (validated in controller/service)
    maxMarks: { type: Number, min: 0 }, // snapshot at grading time (defaults to activity.maxMarks)
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    gradedAt: { type: Date },
  },
  { _id: false }
);

const SubmissionStatusEnum = ["pending", "under_review", "graded"];

const ActivitySubmissionSchema = new Schema(
  {
    activity: { type: Schema.Types.ObjectId, ref: "Activity", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Optionally link the assignment doc; we also upsert if missing
    assignment: { type: Schema.Types.ObjectId, ref: "ActivityAssignment" },

    files: [AttachmentSchema], // uploaded files (doc/docx/xls/xlsx/pdf/etc.)
    submittedAt: { type: Date, default: Date.now },

    review: ReviewSchema, // reviewer notes/metadata
    grade: GradeSchema, // grading metadata
    status: { type: String, enum: SubmissionStatusEnum, default: "pending" },

    isFinal: { type: Boolean, default: true }, // support multiple attempts if needed
    attemptNo: { type: Number, default: 1 }, // attempt counter (for future use)
  },
  { timestamps: true }
);

ActivitySubmissionSchema.index({ activity: 1, user: 1, createdAt: -1 });
ActivitySubmissionSchema.index({ status: 1 });

/**
 * After saving a submission:
 * - Ensure there is an ActivityAssignment(activity,user)
 * - Link assignment.submission -> this submission
 * - Drive assignment.status:
 *     files uploaded -> at least 'inprogress'
 *     graded (marks present) -> 'completed'
 */
ActivitySubmissionSchema.post(
  "save",
  async function submissionPostSave(doc, next) {
    try {
      const Assignment = mongoose.model("ActivityAssignment");

      const hasFiles = Array.isArray(doc.files) && doc.files.length > 0;
      const isGraded = doc.grade && typeof doc.grade.marks === "number";

      // Upsert assignment
      const assignment = await Assignment.findOneAndUpdate(
        { activity: doc.activity, user: doc.user },
        {
          $setOnInsert: {
            activity: doc.activity,
            user: doc.user,
            status: "new",
          },
          $set: { submission: doc._id, lastStatusAt: new Date() },
        },
        { new: true, upsert: true }
      );

      // Drive status
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
  }
);

/** -------------------------------------------
 * Model exports
 * ------------------------------------------*/
const Activity = mongoose.model("Activity", ActivitySchema);
const ActivityAssignment = mongoose.model(
  "ActivityAssignment",
  ActivityAssignmentSchema
);
const ActivitySubmission = mongoose.model(
  "ActivitySubmission",
  ActivitySubmissionSchema
);

module.exports = {
  Activity,
  ActivityAssignment,
  ActivitySubmission,
};
