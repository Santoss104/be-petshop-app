const express = require("express");
const {
  isAutheticated,
} = require("../middlewares/authMiddleware");
const {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const categoryRouter = express.Router();

categoryRouter.get("/", getAllCategories);
categoryRouter.get("/:id", getCategory);
categoryRouter.post(
  "/create",
  isAutheticated,
  createCategory
);
categoryRouter
  .route("/:id")
  .put(isAutheticated, updateCategory)
  .delete(isAutheticated, deleteCategory);

module.exports = categoryRouter;