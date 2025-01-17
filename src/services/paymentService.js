const { redis } = require("../utils/redis");
const paymentModel = require("../models/paymentModel");
const orderModel = require("../models/orderModel");
const bookingModel = require("../models/bookingModel");
const ErrorHandler = require("../utils/errorHandler");

// Get payment by id
exports.getPaymentById = async (id, user, res) => {
  try {
    const cachedPayment = await redis.get(`payment:${id}`);
    if (cachedPayment) {
      const payment = JSON.parse(cachedPayment);
      if (payment.user.toString() !== user._id.toString()) {
        throw new ErrorHandler("Not authorized", 403);
      }
      return res.status(200).json({
        success: true,
        payment,
      });
    }

    const payment = await paymentModel
      .findById(id)
      .populate("user", "name email")
      .populate({
        path: "referenceId",
        select:
          referenceType === "order"
            ? "items total status"
            : "appointmentDate appointmentTime status",
      });

    if (!payment) {
      throw new ErrorHandler("Payment not found", 404);
    }

    if (payment.user.toString() !== user._id.toString()) {
      throw new ErrorHandler("Not authorized", 403);
    }

    await redis.set(`payment:${id}`, JSON.stringify(payment));

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};

// Create payment for order or booking
exports.createPaymentService = async (data, user) => {
  try {
    const { referenceType, referenceId, paymentMethod } = data;

    let reference;
    if (referenceType === "order") {
      reference = await orderModel.findById(referenceId);
      if (!reference) throw new ErrorHandler("Order not found", 404);
      if (reference.user.toString() !== user._id.toString()) {
        throw new ErrorHandler("Not authorized", 403);
      }
      if (reference.payment) {
        throw new ErrorHandler("Payment already exists for this order", 400);
      }
    } else {
      reference = await bookingModel.findById(referenceId);
      if (!reference) throw new ErrorHandler("Booking not found", 404);
      if (reference.user.toString() !== user._id.toString()) {
        throw new ErrorHandler("Not authorized", 403);
      }
      if (reference.payment) {
        throw new ErrorHandler("Payment already exists for this booking", 400);
      }
    }

    let amount, applicationFee;
    if (referenceType === "order") {
      amount = reference.total;
      applicationFee = reference.adminFee;
    } else {
      amount = reference.consultationFee;
      applicationFee = reference.bookingFee;
    }

    const totalAmount = amount + applicationFee;

    const transactionId =
      "TRX" + Date.now() + Math.random().toString(36).substring(7);

    const payment = await paymentModel.create({
      user: user._id,
      referenceType,
      referenceId,
      amount,
      applicationFee,
      totalAmount,
      paymentMethod,
      transactionId,
      paymentDetails: {
        virtualAccount: "88810" + Math.random().toString().slice(2, 8),
        expiredTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam
      },
    });

    reference.payment = payment._id;
    await reference.save();

    await redis.set(`payment:${payment._id}`, JSON.stringify(payment));

    return payment;
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};

// Update payment cache
exports.updatePaymentCache = async (payment) => {
  try {
    await redis.set(`payment:${payment._id}`, JSON.stringify(payment));
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};

// Get user payments
exports.getUserPaymentsService = async (
  userId,
  queryObject = {},
  sort = "-createdAt",
  page = 1,
  limit = 10
) => {
  try {
    const skip = (page - 1) * limit;

    const payments = await paymentModel
      .find({ user: userId, ...queryObject })
      .populate({
        path: "referenceId",
        select: "status total items appointmentDate appointmentTime",
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await paymentModel.countDocuments({
      user: userId,
      ...queryObject,
    });

    return {
      payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};