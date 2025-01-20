const paymentModel = require("../models/paymentModel");
const orderModel = require("../models/orderModel");
const bookingModel = require("../models/bookingModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const {
  getPaymentById,
  getUserPaymentsService,
  updatePaymentCache,
} = require("../services/paymentService");

// Process Payment
const processPayment = CatchAsyncError(async (req, res, next) => {
  try {
    const { orderId, bookingId, cardNumber, cardName, expireDate, cvv } =
      req.body;

    // Tentukan ID dan tipe reference berdasarkan input
    const referenceId = orderId || bookingId;
    let reference;
    let referenceType;

    if (bookingId) {
      // Cek booking
      reference = await bookingModel.findOne({
        _id: bookingId,
        user: req.user._id,
      });
      referenceType = "booking";
    } else {
      // Cek order
      reference = await orderModel.findOne({
        _id: orderId,
        user: req.user._id,
      });
      referenceType = "order";
    }

    if (!reference) {
      return next(new ErrorHandler("Order/Booking not found", 404));
    }

    if (reference.payment) {
      return next(new ErrorHandler("Payment already exists", 400));
    }

    if (reference.status !== "pending") {
      return next(new ErrorHandler("Cannot be paid at this time", 400));
    }

    const payment = await paymentModel.create({
      user: req.user._id,
      referenceType,
      referenceId: reference._id,
      amount: reference.subtotal,
      applicationFee: reference.adminFee,
      totalAmount: reference.total,
      paymentMethod: "credit_card",
      cardDetails: {
        cardNumber,
        cardName,
        expireDate,
        cvv,
      },
      status: "success",
    });

    reference.status = "processing";
    reference.payment = payment._id;
    await reference.save();

    await updatePaymentCache(payment);

    res.status(200).json({
      success: true,
      message: "Payment successful",
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        amount: payment.totalAmount,
        status: payment.status,
      },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get User's Payments
const getUserPayments = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      referenceType,
      sort = "-createdAt",
    } = req.query;

    const queryObject = {};
    if (status) queryObject.status = status;
    if (referenceType) queryObject.referenceType = referenceType;

    const result = await getUserPaymentsService(
      req.user._id,
      queryObject,
      sort,
      page,
      limit
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get Single Payment
const getPayment = CatchAsyncError(async (req, res, next) => {
  try {
    await getPaymentById(req.params.id, req.user, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Cancel Payment
const cancelPayment = CatchAsyncError(async (req, res, next) => {
  try {
    const payment = await paymentModel.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: "pending",
    });

    if (!payment) {
      return next(
        new ErrorHandler("Payment not found or cannot be cancelled", 404)
      );
    }

    payment.status = "cancelled";
    await payment.save();
    await updatePaymentCache(payment);

    if (payment.referenceType === "order") {
      const order = await orderModel.findById(payment.referenceId);
      if (order && order.status === "pending") {
        order.status = "cancelled";
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  processPayment,
  getUserPayments,
  getPayment,
  cancelPayment,
};