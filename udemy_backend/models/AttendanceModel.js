// AttendanceModel.js
// Mongoose schemas for Attendance and AttendanceLink
// - Attendance: a student's mark for a given course & date
// - AttendanceLink: a short-lived link students can click to auto-mark

const crypto = require("crypto");
const mongoose = require("mongoose");
const { Schema, Types, model } = mongoose;

/* ------------------------ small helpers ------------------------ */
const PRESENT = "present";
const ABSENT = "absent";
const LATE = "late";
const EXCUSED = "excused";

const METHOD_LINK = "link";
const METHOD_MANUAL = "manual";

/**
 * Normalize any timestamp to a pure date (00:00:00 UTC) for uniqueness.
 * If you prefer local-time days, swap to toLocaleDateString logic.
 */
function toDateOnlyUTC(d) {
  const dt = d instanceof Date ? d : new Date(d || Date.now());
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

/** Short, URL-safe code for links (no extra deps). */
function generateCode(len = 10) {
  // Node 16+: 'base64url' keeps it URL-safe without replacements
  return crypto.randomBytes(Math.ceil((len * 3) / 4)).toString("base64url").slice(0, len);
}

/* ------------------------ AttendanceLink ------------------------ */
/**
 * One attendance link usually maps to a specific course (and optional degree/semester),
 * and is valid for a time window. Students click it to mark themselves present.
 */
const AttendanceLinkSchema = new Schema(
  {
    code: { type: String, unique: true, index: true }, // short id in URL
    title: { type: String }, // e.g. "CS101 — Lecture 5"
    degree: { type: Types.ObjectId, ref: "Degree" },
    semester: { type: Types.ObjectId, ref: "Semester" },
    course: { type: Types.ObjectId, ref: "Course", required: true },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    // Optional constraints
    maxUsesPerStudent: { type: Number, default: 1 }, // usually 1

    // Audit
    createdBy: { type: Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  { versionKey: false }
);

AttendanceLinkSchema.methods.isCurrentlyValid = function (at = new Date()) {
  return !!(
    this.isActive &&
    this.validFrom &&
    this.validTo &&
    at >= this.validFrom &&
    at <= this.validTo
  );
};

AttendanceLinkSchema.statics.createForCourse = async function ({
  course,
  degree,
  semester,
  title,
  validFrom,
  validTo,
  maxUsesPerStudent = 1,
  createdBy,
}) {
  const code = generateCode(10);
  return this.create({
    code,
    course,
    degree,
    semester,
    title,
    validFrom,
    validTo,
    maxUsesPerStudent,
    createdBy,
    isActive: true,
  });
};

/* ------------------------ Attendance ------------------------ */
/**
 * One document per student per course per date.
 * Status defaults to "present" when marked via link, but you can set any.
 */
const AttendanceSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "User", required: true, index: true },
    degree: { type: Types.ObjectId, ref: "Degree", required: true, index: true },
    semester: { type: Types.ObjectId, ref: "Semester", required: true, index: true },
    course: { type: Types.ObjectId, ref: "Course", required: true, index: true },

    // The "day" of attendance (normalized to date-only UTC for uniqueness)
    date: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: [PRESENT, ABSENT, LATE, EXCUSED],
      default: PRESENT,
      index: true,
    },

    // How it was marked
    method: { type: String, enum: [METHOD_LINK, METHOD_MANUAL], required: true },

    // When using a link
    link: { type: Types.ObjectId, ref: "AttendanceLink" },
    linkCodeSnapshot: { type: String }, // store code as plain text for audit

    // Audit / extra
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: Types.ObjectId, ref: "User" }, // who performed the action (student or staff)
    ip: { type: String },
    userAgent: { type: String },
    notes: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Ensure only 1 record per student+course+date
AttendanceSchema.index(
  { student: 1, course: 1, date: 1 },
  { unique: true, name: "uniq_student_course_date" }
);

// Always normalize "date" to date-only UTC before validate
AttendanceSchema.pre("validate", function (next) {
  if (this.date) this.date = toDateOnlyUTC(this.date);
  next();
});

/* ---------- handy statics for your controllers/services ---------- */

/**
 * Mark via link click. Validates the link window and enforces 1 entry per student/course/day.
 * - If a record exists for the same day, it will NOT create duplicates (returns the existing doc).
 * - Returns { doc, created: boolean } to tell you if it was new or already present.
 */
AttendanceSchema.statics.markViaLink = async function ({
  linkDoc, // AttendanceLink document (already found by code)
  studentId,
  degreeId,
  semesterId,
  ip,
  userAgent,
  status = PRESENT,
  at = new Date(),
}) {
  if (!linkDoc || !linkDoc.isCurrentlyValid(at)) {
    const err = new Error("This attendance link is not valid.");
    err.code = "LINK_INVALID";
    throw err;
  }

  const day = toDateOnlyUTC(at);

  // Enforce per-student-per-day uniqueness for this course
  const filter = {
    student: studentId,
    course: linkDoc.course,
    date: day,
  };

  const update = {
    $setOnInsert: {
      student: studentId,
      degree: degreeId,
      semester: semesterId,
      course: linkDoc.course,
      date: day,
      method: METHOD_LINK,
      status,
      link: linkDoc._id,
      linkCodeSnapshot: linkDoc.code,
      ip,
      userAgent,
      markedBy: studentId,
      markedAt: at,
    },
  };

  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  const doc = await this.findOneAndUpdate(filter, update, opts).lean(false);

  // Was it newly created?
  const created = doc.createdAt && doc.createdAt.getTime() === doc.updatedAt.getTime();
  return { doc, created };
};

/**
 * Manual mark (from the "Mark Attendance" page/tab).
 * - Also enforces 1 entry per student/course/date.
 * - You can set status as needed (present/absent/late/excused)
 */
AttendanceSchema.statics.markManual = async function ({
  studentId,
  degreeId,
  semesterId,
  courseId,
  date, // the class day the user selects
  status = PRESENT,
  markedBy, // likely same as studentId, or a staff user
  ip,
  userAgent,
  notes,
}) {
  const day = toDateOnlyUTC(date);

  const filter = { student: studentId, course: courseId, date: day };
  const update = {
    $set: {
      student: studentId,
      degree: degreeId,
      semester: semesterId,
      course: courseId,
      date: day,
      status,
      method: METHOD_MANUAL,
      markedBy: markedBy || studentId,
      ip,
      userAgent,
      notes,
    },
    $setOnInsert: { markedAt: new Date() },
  };

  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  const doc = await this.findOneAndUpdate(filter, update, opts).lean(false);
  return doc;
};

/* ------------------------ exports ------------------------ */
const Attendance = model("Attendance", AttendanceSchema);
const AttendanceLink = model("AttendanceLink", AttendanceLinkSchema);

module.exports = {
  Attendance,
  AttendanceLink,

  // export enums so controllers stay in sync
  ATTENDANCE_STATUS: { PRESENT, ABSENT, LATE, EXCUSED },
  ATTENDANCE_METHOD: { METHOD_LINK, METHOD_MANUAL },

  // helper in case you need it elsewhere
  toDateOnlyUTC,
};
