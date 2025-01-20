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