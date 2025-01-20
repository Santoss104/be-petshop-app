const express = require("express");
const {
  isAutheticated,
} = require("../middlewares/authMiddleware");
const {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
} = require("../controllers/productController");

const productRouter = express.Router();

productRouter.get("/products/search", searchProducts);
productRouter.get("/", getAllProducts);
productRouter.get("/:id", getProduct);
productRouter.post(
  "/create",
  isAutheticated,
  createProduct
);
productRouter
  .route("/:id")
  .put(isAutheticated, updateProduct)
  .delete(isAutheticated, deleteProduct);

module.exports = productRouter;