// models/SemesterModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const semesterSchema = new Schema(
  {
    degree: {
      type: Schema.Types.ObjectId,
      ref: "Degree",
      required: true, // ✅ required: a semester must belong to a degree
      index: true,
    },

    // Ordinal position within a degree (1..N)
    semNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "semNumber must be an integer",
      },
    },

    // Human-friendly title, e.g., "Semester 1" or "Fall 2025"
    semester_name: { type: String, trim: true },

    // Optional short code; not globally unique
    semester_code: { type: String, trim: true },

    // URL-safe id; unique per degree (compound index)
    slug: { type: String, lowercase: true, trim: true },

    description: { type: String, trim: true },

    // Optional planning fields
    academicYear: { type: String, trim: true }, // e.g., "2025-2026"
    startDate: { type: Date },
    endDate: { type: Date },

    totalCredits: { type: Number, min: 0 },
    totalCoursesPlanned: { type: Number, min: 0 },

    // Status toggle
    isActive: { type: Boolean, default: true },

    // Free-form extras
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// ----- Validators -----
semesterSchema.path("endDate").validate(function (v) {
  if (!v || !this.startDate) return true;
  return v >= this.startDate;
}, "endDate must be greater than or equal to startDate");

// ----- Auto defaults / slug -----
semesterSchema.pre("validate", function (next) {
  // Default name if missing
  if (!this.semester_name && Number.isInteger(this.semNumber)) {
    this.semester_name = `Semester ${this.semNumber}`;
  }

  // Build a slug if missing (from semester_name)
  if (!this.slug) {
    const base =
      (this.semester_name || `semester-${this.semNumber || ""}`)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-") || "semester";
    this.slug = base;
  }

  next();
});

// ----- Indexes -----
// Ensure (degree, semNumber) is unique
semesterSchema.index({ degree: 1, semNumber: 1 }, { unique: true });

// Make slug unique per degree (not globally)
semesterSchema.index({ degree: 1, slug: 1 }, { unique: true, sparse: true });

// Helpful filters
semesterSchema.index({ degree: 1, isActive: 1 });

// Index on code within a degree (optional)
semesterSchema.index({ degree: 1, semester_code: 1 }, { sparse: true });

// Case-insensitive searches on semester_name within a degree (non-unique)
semesterSchema.index(
  { degree: 1, semester_name: 1 },
  { collation: { locale: "en", strength: 2 } }
);

// ----- Virtuals -----
// Course docs should have: semester: { type: ObjectId, ref: 'semester' }
semesterSchema.virtual("courses", {
  ref: "Course",
  localField: "_id",
  foreignField: "semester",
  justOne: false,
});

module.exports = mongoose.model("Semester", semesterSchema);
