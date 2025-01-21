const { redis } = require("../utils/redis");
const categoryModel = require("../models/categoryModel");

exports.getCategoryById = async (id, res) => {
  const categoryJson = await redis.get(id);

  if (categoryJson) {
    const category = JSON.parse(categoryJson);
    res.status(201).json({
      success: true,
      category,
    });
  }
};

exports.getAllCategoriesService = async (res) => {
  const categories = await categoryModel
    .find({ isActive: true })
    .sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    categories,
  });
};