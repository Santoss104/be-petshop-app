const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter category name"],
      unique: true,
    },
  },
  { timestamps: true }
);

const categoryModel = mongoose.model("Category", categorySchema);

module.exports = categoryModel;