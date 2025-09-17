// AttendanceModel.js
// Mongoose schemas for Attendance and AttendanceLink
// - Attendance: a student's mark for a given course & date
// - AttendanceLink: a short-lived link students can click to auto-mark
//
// ONE-TIME DB FIX (run in mongosh to clear old unique index that breaks on null):
// use ecoders_learning_platform
// try { db.attendancelinks.dropIndex("code_1"); } catch(e){ print(e.message); }
// db.attendancelinks.updateMany({ code: null }, { $unset: { code: "" } });
// db.attendancelinks.updateMany({ code: "" },    { $unset: { code: "" } });
// db.attendancelinks.createIndex(
//   { code: 1 },
//   { unique: true, partialFilterExpression: { code: { $type: "string" } } }
// );

const crypto = require("crypto");
const mongoose = require("mongoose");
const { Schema, Types, model } = mongoose;

/* ------------------------ helpers & enums ------------------------ */
const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED: "excused",
};

const ATTENDANCE_METHOD = {
  LINK: "link",
  MANUAL: "manual",
};

/**
 * Normalize any timestamp to a pure date (00:00:00 UTC) for uniqueness.
 */
function toDateOnlyUTC(d) {
  const dt = d instanceof Date ? d : new Date(d || Date.now());
  return new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
  );
}

/** Short, URL-safe random code for links (no ambiguous chars). */
function generateCandidate(len = 8) {
  // Base32-ish alphabet without 0/O/1/I for readability
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[crypto.randomBytes(1)[0] % alphabet.length];
  }
  return out;
}

async function generateUniqueLinkCode(LinkModel, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const code = generateCandidate(8);
    // eslint-disable-next-line no-await-in-loop
    const exists = await LinkModel.exists({ code });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique link code");
}

/* ------------------------ AttendanceLink ------------------------ */
const AttendanceLinkSchema = new Schema(
  {
    // IMPORTANT: do NOT put unique:true on the path; we add a partial unique index below
    code: { type: String, trim: true, index: true },
    title: { type: String },

    degree: { type: Types.ObjectId, ref: "Degree" },
    semester: { type: Types.ObjectId, ref: "Semester" },
    course: { type: Types.ObjectId, ref: "Course", required: true },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    isActive: { type: Boolean, default: true },

    maxUsesPerStudent: { type: Number, default: 1 },

    createdBy: { type: Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

// Ensure a non-empty, unique code is present
AttendanceLinkSchema.pre("validate", async function (next) {
  try {
    if (!this.code || typeof this.code !== "string" || !this.code.trim()) {
      this.code = await generateUniqueLinkCode(this.constructor);
    } else {
      this.code = this.code.trim();
    }
    next();
  } catch (e) {
    next(e);
  }
});

// Partial unique index: only enforce uniqueness when code is a string
AttendanceLinkSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
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
  // code is auto-generated in pre-validate
  return this.create({
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
const AttendanceSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "User", required: true, index: true },
    degree: {
      type: Types.ObjectId,
      ref: "Degree",
      required: true,
      index: true,
    },
    semester: {
      type: Types.ObjectId,
      ref: "Semester",
      required: true,
      index: true,
    },
    course: {
      type: Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    // date-only (UTC) of the class day
    date: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.PRESENT,
      index: true,
    },

    method: {
      type: String,
      enum: Object.values(ATTENDANCE_METHOD),
      required: true,
    },

    // when marked via link
    link: { type: Types.ObjectId, ref: "AttendanceLink" },
    linkCodeSnapshot: { type: String },

    // audit
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: Types.ObjectId, ref: "User" },
    ip: { type: String },
    userAgent: { type: String },
    notes: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// one row per student+course+date
AttendanceSchema.index(
  { student: 1, course: 1, date: 1 },
  { unique: true, name: "uniq_student_course_date" }
);

// normalize date to date-only UTC
AttendanceSchema.pre("validate", function (next) {
  if (this.date) this.date = toDateOnlyUTC(this.date);
  next();
});

/* ---------- statics ---------- */
AttendanceSchema.statics.markViaLink = async function ({
  linkDoc,
  studentId,
  degreeId,
  semesterId,
  ip,
  userAgent,
  status = ATTENDANCE_STATUS.PRESENT,
  at = new Date(),
}) {
  if (!linkDoc || !linkDoc.isCurrentlyValid(at)) {
    const err = new Error("This attendance link is not valid.");
    err.code = "LINK_INVALID";
    throw err;
  }

  const day = toDateOnlyUTC(at);

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
      method: ATTENDANCE_METHOD.LINK,
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

  // If you need an explicit "created" flag, compare createdAt vs updatedAt
  const created =
    doc.createdAt && doc.createdAt.getTime() === doc.updatedAt.getTime();
  return { doc, created };
};

AttendanceSchema.statics.markManual = async function ({
  studentId,
  degreeId,
  semesterId,
  courseId,
  date,
  status = ATTENDANCE_STATUS.PRESENT,
  markedBy,
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
      method: ATTENDANCE_METHOD.MANUAL,
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
  ATTENDANCE_STATUS,
  ATTENDANCE_METHOD,
  toDateOnlyUTC,
};
