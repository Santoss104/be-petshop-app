const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");

const cartRouter = express.Router();

cartRouter.post("/add", isAutheticated, addToCart);
cartRouter.get("/", isAutheticated, getCart);
cartRouter.put("/update", isAutheticated, updateCartItem);
cartRouter.delete("/remove/:productId", isAutheticated, removeCartItem);
cartRouter.delete("/clear", isAutheticated, clearCart);

module.exports = cartRouter;