// models/InstructorModel.js
const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const AddressSchema = new Schema(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const InstructorSchema = new Schema(
  {
    // ---- Identity / Profile ----
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      // keep this non-unique if your User model owns uniqueness
      // unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email."],
    },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    bio: { type: String, trim: true },
    gender: {
      type: String,
      trim: true,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    dateOfBirth: { type: Date },
    address: AddressSchema,

    // ---- Teaching profile ----
    languages: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    areasOfExpertise: [{ type: String, trim: true }],

    // Complex arrays (replace Mixed with dedicated sub-schemas when ready)
    education: [Schema.Types.Mixed], // e.g., { degree, institute, from, to }
    certifications: [Schema.Types.Mixed], // e.g., { title, org, year, url }
    availability: [Schema.Types.Mixed], // e.g., { day, start, end, timezone }

    // ---- Billing ----
    hourlyRate: { type: Number, min: 0 },

    // ---- Documents ----
    resumeUrl: { type: String, trim: true },
    idProofUrl: { type: String, trim: true },

    // ---- Social / Portfolio ----
    website: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    youtube: { type: String, trim: true },
    twitter: { type: String, trim: true },

    // ---- Payouts (optional) ----
    upiId: { type: String, trim: true },
    payoutPreference: {
      type: String,
      enum: ["UPI", "BankTransfer", "PayPal", "Other"],
      default: "UPI",
    },

    // ---- Verification / Status ----
    isEmailVerified: { type: Boolean, default: false },
    isKycVerified: { type: Boolean, default: false },
    applicationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "deleted"],
      default: "pending",
    },
    rejectionReason: { type: String, trim: true },
    isActive: { type: Boolean, default: true },

    // ---- LMS Relations ----
    degrees: [{ type: Types.ObjectId, ref: "Degree" }],
    // Your app uses the model name "Semester" — keep this ref consistent
    semesters: [{ type: Types.ObjectId, ref: "Semester" }],
    courses: [{ type: Types.ObjectId, ref: "Course" }],

    // Optional link to user account if you have one
    user: { type: Types.ObjectId, ref: "User" },

    // ---- Analytics ----
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    studentsTaught: { type: Number, min: 0, default: 0 },

    // ---- Audit / Soft delete ----
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    reviewedBy: { type: Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Virtual full name (handy for UI)
InstructorSchema.virtual("fullName").get(function () {
  const f = this.firstName || "";
  const l = this.lastName || "";
  return `${f} ${l}`.trim();
});

module.exports = mongoose.model("Instructor", InstructorSchema);
