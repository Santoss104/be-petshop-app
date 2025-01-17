const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  processPayment,
  getUserPayments,
  getPayment,
  cancelPayment,
} = require("../controllers/paymentController");

const paymentRouter = express.Router();

paymentRouter.post("/process", isAutheticated, processPayment);
paymentRouter.get("/user", isAutheticated, getUserPayments);
paymentRouter.get("/:id", isAutheticated, getPayment);
paymentRouter.put("/:id/cancel", isAutheticated, cancelPayment);

module.exports = paymentRouter;