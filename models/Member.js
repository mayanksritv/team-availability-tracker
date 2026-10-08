const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: ["Available", "Busy", "Away"],
      index: true
    },
    timezone: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Member", memberSchema);
