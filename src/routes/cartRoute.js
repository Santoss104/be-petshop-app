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

cartRouter.post("/add", addToCart);
cartRouter.get("/", getCart);
cartRouter.put("/update", updateCartItem);
cartRouter.delete("/remove/:productId", removeCartItem);
cartRouter.delete("/clear", clearCart);

module.exports = cartRouter;