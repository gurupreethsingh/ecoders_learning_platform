const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "info",
        "alert",
        "reminder",
        "assignment",
        "course_update",
        "system",
        "message",
        "announcement",
        "feedback_request",
        "event",
        "meeting",
      ],
      default: "info",
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Unified UserModel reference
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Unified UserModel reference
    },

    seen: {
      type: Boolean,
      default: false,
    },

    seenAt: {
      type: Date,
    },

    replied: {
      type: Boolean,
      default: false,
    },

    replyMessage: {
      type: String,
      default: "",
    },

    repliedAt: {
      type: Date,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    isActionRequired: {
      type: Boolean,
      default: false,
    },

    actionLink: {
      type: String, // e.g., /course/123/assignment/456
    },

    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },

    relatedAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
    },

    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    tags: {
      type: [String], // e.g., ["deadline", "LMS", "urgent"]
      default: [],
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    expiresAt: {
      type: Date, // For temporary notifications
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
