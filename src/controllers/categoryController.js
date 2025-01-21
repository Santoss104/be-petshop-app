const categoryModel = require("../models/categoryModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const { redis } = require("../utils/redis");

const createCategory = CatchAsyncError(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    return next(new ErrorHandler("Please enter category name", 400));
  }

  const isCategoryExist = await categoryModel.findOne({
    name: { $regex: name, $options: "i" },
  });
  if (isCategoryExist) {
    return next(new ErrorHandler("Category already exists", 400));
  }

  const category = await categoryModel.create({ name });
  await redis.set(category._id, JSON.stringify(category));

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    category,
  });
});

const getAllCategories = CatchAsyncError(async (req, res, next) => {
  const categories = await categoryModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    categories,
  });
});

const getCategory = CatchAsyncError(async (req, res, next) => {
  const category = await categoryModel.findById(req.params.id);

  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  res.status(200).json({
    success: true,
    category,
  });
});

const updateCategory = CatchAsyncError(async (req, res, next) => {
  const { name } = req.body;
  const categoryId = req.params.id;

  const category = await categoryModel.findById(categoryId);
  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  if (name) {
    const isCategoryExist = await categoryModel.findOne({
      _id: { $ne: categoryId },
      name: { $regex: name, $options: "i" },
    });

    if (isCategoryExist) {
      return next(new ErrorHandler("Category name already exists", 400));
    }

    category.name = name;
    await category.save();
  }

  await redis.set(category._id, JSON.stringify(category));

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    category,
  });
});

const deleteCategory = CatchAsyncError(async (req, res, next) => {
  const category = await categoryModel.findById(req.params.id);
  if (!category) {
    return next(new ErrorHandler("Category not found", 404));
  }

  await category.deleteOne();
  await redis.del(category._id);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

module.exports = {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};