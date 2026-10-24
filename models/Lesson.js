const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    accessType: {
      type: String,
      enum: ["free", "premium"],
      required: true,
      default: "free",
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    pdfs: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        url: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],

    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Lesson", lessonSchema);
