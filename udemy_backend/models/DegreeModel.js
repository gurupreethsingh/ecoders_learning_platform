// models/DegreeModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Degree
 * - Semesters will reference this model via degree: ObjectId('Degree')
 * - Keep "code" unique for stable program identifiers
 * - "slug" gives you SEO/URL safety for frontends
 */
const degreeSchema = new Schema(
  {
    // Human-readable program name
    name: { type: String, required: true, trim: true },

    // Institution-wide unique short code (e.g., "BSC-CS", "MBA-FT")
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },

    // URL-safe identifier derived from name (unique for easy routing)
    slug: { type: String, required: true, lowercase: true, unique: true, index: true },

    // Optional details
    description: { type: String, trim: true },

    // Academic level for filtering/reporting
    level: {
      type: String,
      enum: ["certificate", "diploma", "undergraduate", "postgraduate", "doctorate"],
      default: "undergraduate",
    },

    // Planning helpers
    durationYears: { type: Number, min: 0.5 },
    totalSemesters: {
      type: Number,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "totalSemesters must be an integer",
      },
    },

    // Organizational metadata
    department: { type: String, trim: true },     // e.g., "Computer Science"
    awardingBody: { type: String, trim: true },   // e.g., "University of X"
    accreditation: [{ type: String, trim: true }],

    // Status toggle (soft enable/disable)
    isActive: { type: Boolean, default: true },

    // People responsible for the program (dean/principal/teacher ids)
    coordinators: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Optional assets / links
    assets: {
      logoUrl: { type: String, trim: true },
      brochureUrl: { type: String, trim: true },
    },

    // Free-form extras (to avoid future schema churn)
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Auto-generate a slug from the name if not provided
degreeSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }
  next();
});

// Case-insensitive index for name (NOT unique; same name allowed across departments)
// If you want to enforce unique names, flip unique: true
degreeSchema.index({ name: 1 }, { collation: { locale: "en", strength: 2 } });

// Helpful compound index for common queries (e.g., filtering by level + active)
degreeSchema.index({ level: 1, isActive: 1 });

module.exports = mongoose.model("Degree", degreeSchema);
