const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  createOrder,
  confirmOrderReceived,
  getUserOrders,
  getOrder,
  cancelOrder,
} = require("../controllers/orderController");

const orderRouter = express.Router();

orderRouter.post("/create", isAutheticated, createOrder);
orderRouter.put("/confirm-received/:id", isAutheticated, confirmOrderReceived);
orderRouter.get("/user", isAutheticated, getUserOrders);
orderRouter.get("/:id", isAutheticated, getOrder);
orderRouter.put("/cancel/:id", isAutheticated, cancelOrder);

module.exports = orderRouter;