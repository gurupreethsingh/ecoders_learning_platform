const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

/* Reuse minimal address/doc schemas from Student for consistency */
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

const DocumentSchema = new Schema(
  {
    type: {
      type: String,
      trim: true,
      enum: [
        "photo",
        "signature",
        "id_proof",
        "address_proof",
        "birth_certificate",
        "category_certificate",
        "transfer_certificate",
        "marksheet",
        "other",
      ],
    },
    label: { type: String, trim: true },
    url: { type: String, trim: true },
    verified: { type: Boolean, default: false },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const IntendedEnrollmentSchema = new Schema(
  {
    academicYear: { type: String, trim: true }, // e.g., "2025-26"
    degree: { type: Types.ObjectId, ref: "Degree" },
    semester: { type: Types.ObjectId, ref: "semester" },
    course: { type: Types.ObjectId, ref: "Course" },
    preferredBatch: { type: String, trim: true },
  },
  { _id: false }
);

const StudentAdmissionSchema = new Schema(
  {
    /* If applicant already has a login, link it.
       Otherwise this can be null until you create a User on approval. */
    user: { type: Types.ObjectId, ref: "User", index: true },

    // ---- Applicant identity ----
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email."],
    },
    phone: { type: String, trim: true },
    gender: {
      type: String,
      trim: true,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    dateOfBirth: { type: Date },
    nationality: { type: String, trim: true },
    category: { type: String, trim: true },

    address: AddressSchema,
    permanentAddress: AddressSchema,

    // ---- Academic intent ----
    intendedEnrollment: IntendedEnrollmentSchema,

    // ---- Academics (prior) ----
    priorEducation: [
      {
        level: { type: String, trim: true },
        institute: { type: String, trim: true },
        boardOrUniversity: { type: String, trim: true },
        yearOfPassing: { type: Number },
        percentageOrCGPA: { type: String, trim: true },
        majorOrStream: { type: String, trim: true },
        documentUrl: { type: String, trim: true },
      },
    ],

    // ---- Documents & declarations ----
    documents: [DocumentSchema],
    termsAccepted: { type: Boolean, default: false },

    // ---- Application flow ----
    applicationStatus: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "withdrawn",
      ],
      default: "draft",
      index: true,
    },
    rejectionReason: { type: String, trim: true },

    // When approved, link the created Student record for traceability
    student: { type: Types.ObjectId, ref: "Student" },

    // ---- Audit ----
    submittedAt: { type: Date },
    reviewedBy: { type: Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

/* Convenience helpers */
StudentAdmissionSchema.methods.submit = function () {
  this.applicationStatus = "submitted";
  this.submittedAt = new Date();
  return this;
};

StudentAdmissionSchema.methods.markUnderReview = function (reviewerId) {
  this.applicationStatus = "under_review";
  this.reviewedBy = reviewerId || this.reviewedBy;
  this.reviewedAt = new Date();
  return this;
};

StudentAdmissionSchema.methods.approve = function () {
  this.applicationStatus = "approved";
  this.reviewedAt = new Date();
  return this;
};

StudentAdmissionSchema.methods.reject = function (reason = "") {
  this.applicationStatus = "rejected";
  this.rejectionReason = reason;
  this.reviewedAt = new Date();
  return this;
};

StudentAdmissionSchema.index({ email: 1, applicationStatus: 1 });
StudentAdmissionSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("StudentAdmission", StudentAdmissionSchema);
