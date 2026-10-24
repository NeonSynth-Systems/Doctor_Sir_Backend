const mongoose = require("mongoose");

const lessonAccessSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

lessonAccessSchema.index(
  { student: 1, lesson: 1 },
  { unique: true }
);

module.exports = mongoose.model("LessonAccess", lessonAccessSchema);